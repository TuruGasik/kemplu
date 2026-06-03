from __future__ import annotations

from datetime import UTC, date, datetime, timedelta
from typing import Any
from uuid import UUID

from apscheduler.schedulers.asyncio import AsyncIOScheduler
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import AsyncSessionLocal, redis_client
from app.models.activity import ActivitySession, DailySummary
from app.models.sync_log import SyncLog
from app.models.user import User
from app.services.data_processor import DataProcessor
from app.services.huawei_health import CYCLING_SPORT_TYPE, HuaweiHealthService

scheduler = AsyncIOScheduler(timezone="UTC")


async def sync_user_data(user_id: UUID | str, days: int = 7, sync_type: str = "scheduled") -> int:
    user_uuid = UUID(str(user_id))
    async with AsyncSessionLocal() as db:
        user = await db.get(User, user_uuid)
        if user is None:
            return 0

        sync_log = SyncLog(
            user_id=user.id,
            sync_type=sync_type,
            status="running",
            records_fetched=0,
            created_at=datetime.now(UTC),
        )
        db.add(sync_log)
        await db.commit()
        await db.refresh(sync_log)

        try:
            end_date = datetime.now(UTC).date()
            start_date = end_date - timedelta(days=days - 1)
            health = HuaweiHealthService(redis_client)

            daily_payload = await health.get_daily_summary(str(user.id), start_date, end_date)
            activity_records = await health.get_activity_records(str(user.id), start_date, end_date, CYCLING_SPORT_TYPE)

            daily_count = await _upsert_daily_summaries(db, user.id, daily_payload)
            activity_count = await _upsert_activity_sessions(db, user.id, activity_records)

            user.last_sync_at = datetime.now(UTC)
            sync_log.status = "success"
            sync_log.records_fetched = daily_count + activity_count
            await db.commit()
            return sync_log.records_fetched
        except Exception as exc:
            sync_log.status = "failed"
            sync_log.error_msg = str(exc)
            await db.commit()
            raise


async def sync_all_users(days: int = 7) -> None:
    async with AsyncSessionLocal() as db:
        users = (await db.execute(select(User.id))).scalars().all()
    for user_id in users:
        await sync_user_data(user_id, days=days, sync_type="scheduled")


async def trigger_first_login_sync(user_id: UUID | str) -> None:
    await sync_user_data(user_id, days=365, sync_type="initial_full")


def start_scheduler() -> None:
    if scheduler.running:
        return
    scheduler.add_job(
        sync_all_users,
        "interval",
        hours=6,
        id="sync_all_users_every_6_hours",
        replace_existing=True,
        kwargs={"days": 7},
        max_instances=1,
        coalesce=True,
    )
    scheduler.start()


def stop_scheduler() -> None:
    if scheduler.running:
        scheduler.shutdown(wait=False)


async def _upsert_daily_summaries(db: AsyncSession, user_id: UUID, payload: dict[str, Any]) -> int:
    summaries = _normalize_daily_payload(payload)
    count = 0
    for item in summaries:
        summary_date = date.fromisoformat(item["date"])
        result = await db.execute(select(DailySummary).where(DailySummary.user_id == user_id, DailySummary.date == summary_date))
        summary = result.scalar_one_or_none()
        if summary is None:
            summary = DailySummary(user_id=user_id, date=summary_date)
            db.add(summary)

        steps = int(item.get("steps", 0))
        active_hours = float(item.get("active_hours", 0))
        calories = float(item.get("calories", 0))
        goal_rate = float(item.get("goal_completion_rate") or DataProcessor.compute_goal_completion_rate(steps, calories, active_hours))
        summary.steps = steps
        summary.active_hours = active_hours
        summary.calories = calories
        summary.goal_completion_rate = goal_rate
        summary.daily_score = DataProcessor.compute_daily_score(steps, active_hours, calories, goal_rate)
        summary.medium_intensity_min = int(item.get("medium_intensity_min", 0))
        summary.high_intensity_min = int(item.get("high_intensity_min", 0))
        count += 1
    return count


async def _upsert_activity_sessions(db: AsyncSession, user_id: UUID, records: list[dict[str, Any]]) -> int:
    count = 0
    for record in records:
        activity_id = str(record.get("activityId") or record.get("activity_id") or record.get("id"))
        if not activity_id or activity_id == "None":
            continue

        result = await db.execute(select(ActivitySession).where(ActivitySession.user_id == user_id, ActivitySession.activity_id == activity_id))
        session = result.scalar_one_or_none()
        if session is None:
            session = ActivitySession(user_id=user_id, activity_id=activity_id, sport_type=0)
            db.add(session)

        start_time = _coerce_datetime(record.get("startTime") or record.get("start_time"))
        end_time = _coerce_datetime(record.get("endTime") or record.get("end_time"))
        duration_sec = int(record.get("durationSec") or record.get("duration_sec") or max((end_time - start_time).total_seconds(), 0))
        distance_m = float(record.get("distance") or record.get("distance_m") or record.get("distanceMeters") or 0)
        ascent_m = float(record.get("ascent") or record.get("ascent_m") or record.get("totalAscent") or 0)
        calories = float(record.get("calories") or record.get("calorie") or 0)
        avg_speed_kmh = float(record.get("avgSpeedKmh") or record.get("avg_speed_kmh") or ((distance_m / 1000) / (duration_sec / 3600) if duration_sec else 0))
        intensity = float(record.get("intensity") or record.get("intensity_factor") or 1)

        session.sport_type = _coerce_sport_type(record.get("sportType") or record.get("sport_type") or record.get("activityType") or CYCLING_SPORT_TYPE)
        session.activity_type = str(record.get("activityType") or record.get("activity_type") or CYCLING_SPORT_TYPE).lower()
        session.activity_group = str(record.get("activityGroup") or record.get("activity_group") or "cycling").lower()
        session.activity_label = str(record.get("activityLabel") or record.get("activity_label") or _activity_label(session.activity_type))
        session.start_time = start_time
        session.end_time = end_time
        session.duration_sec = duration_sec
        session.distance_m = distance_m
        session.ascent_m = ascent_m
        session.calories = calories
        session.avg_speed_kmh = round(avg_speed_kmh, 2)
        session.tss_score = DataProcessor.compute_training_stress_score(distance_m / 1000, ascent_m, duration_sec / 60, intensity)
        session.season_tag = DataProcessor.season_tag_for_month(start_time.month)
        session.raw_json = record
        session.synced_at = datetime.now(UTC)
        count += 1

    await db.flush()
    await _update_performance_deltas(db, user_id)
    return count


async def _update_performance_deltas(db: AsyncSession, user_id: UUID) -> None:
    sessions = (
        await db.execute(
            select(ActivitySession).where(ActivitySession.user_id == user_id).order_by(ActivitySession.start_time.desc()).limit(60)
        )
    ).scalars().all()
    for index, session in enumerate(sessions):
        baseline = sessions[index + 1 : index + 31]
        session.performance_delta = DataProcessor.compute_performance_vs_baseline(_session_mapping(session), [_session_mapping(item) for item in baseline])


def _normalize_daily_payload(payload: dict[str, Any]) -> list[dict[str, Any]]:
    if "daily_summaries" in payload:
        return list(payload["daily_summaries"])
    if "summaries" in payload:
        return list(payload["summaries"])

    start = date.fromisoformat(str(payload.get("start_date")))
    end = date.fromisoformat(str(payload.get("end_date")))
    days = (end - start).days + 1
    total_steps = _extract_total(payload.get("steps"))
    total_calories = _extract_total(payload.get("calories"))
    total_intensity = _extract_total(payload.get("intensity"))
    return [
        {
            "date": (start + timedelta(days=offset)).isoformat(),
            "steps": int(total_steps / days) if days else 0,
            "active_hours": 0,
            "calories": round(total_calories / days, 2) if days else 0,
            "medium_intensity_min": int(total_intensity / days) if days else 0,
            "high_intensity_min": 0,
        }
        for offset in range(days)
    ]


def _extract_total(value: Any) -> float:
    if isinstance(value, dict):
        for key in ("total", "value", "sum"):
            if key in value:
                return float(value[key] or 0)
        if "group" in value:
            return sum(_extract_total(group) for group in value["group"])
        if "sampleSet" in value:
            return sum(_extract_total(sample_set) for sample_set in value["sampleSet"])
        if "samplePoints" in value:
            return sum(_extract_total(point) for point in value["samplePoints"])
        if isinstance(value.get("value"), list):
            return sum(_extract_total(item) for item in value["value"])
        for key in ("intVal", "integerValue", "fpVal", "floatValue", "longVal", "longValue"):
            if key in value:
                return float(value[key] or 0)
    if isinstance(value, list):
        return sum(_extract_total(item) for item in value)
    try:
        return float(value or 0)
    except (TypeError, ValueError):
        return 0.0


def _coerce_datetime(value: Any) -> datetime:
    if isinstance(value, datetime):
        return value if value.tzinfo else value.replace(tzinfo=UTC)
    if isinstance(value, (int, float)):
        timestamp = float(value)
        if timestamp > 10_000_000_000:
            timestamp = timestamp / 1000
        return datetime.fromtimestamp(timestamp, UTC)
    if isinstance(value, str):
        return datetime.fromisoformat(value.replace("Z", "+00:00"))
    return datetime.now(UTC)


def _coerce_sport_type(value: Any) -> int:
    cycling_types = {
        "cycling": 1,
        "cycling_indoor": 2,
        "spinning": 3,
        "bmx": 4,
    }
    if isinstance(value, str):
        normalized = value.lower()
        if normalized in cycling_types:
            return cycling_types[normalized]
    try:
        return int(value or 0)
    except (TypeError, ValueError):
        return cycling_types["cycling"]


def _activity_label(activity_type: str | None) -> str:
    labels = {
        "cycling": "Outdoor Cycling",
        "cycling_indoor": "Indoor Cycling",
        "spinning": "Spinning",
        "bmx": "BMX",
    }
    normalized = (activity_type or "cycling").lower()
    return labels.get(normalized, normalized.replace("_", " ").title())


def _session_mapping(session: ActivitySession) -> dict[str, Any]:
    return {
        "distance_m": session.distance_m,
        "ascent_m": session.ascent_m,
        "duration_sec": session.duration_sec,
        "calories": session.calories,
        "avg_speed_kmh": session.avg_speed_kmh,
        "tss_score": session.tss_score,
    }
