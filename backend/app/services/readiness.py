from datetime import UTC, date, datetime, timedelta
from uuid import UUID

from sqlalchemy import or_, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.activity import ActivitySession, DailySummary
from app.schemas.readiness import ReadinessComponents, ReadinessMetrics, ReadinessSummary

LEGACY_CYCLING_SPORT_TYPES = [1, 2, 3, 4, 9]


async def calculate_readiness(db: AsyncSession, user_id: UUID) -> ReadinessSummary:
    now = datetime.now(UTC)
    today = now.date()
    start = now - timedelta(days=35)
    summary_start = today - timedelta(days=7)

    sessions = (
        await db.execute(
            select(ActivitySession)
            .where(
                ActivitySession.user_id == user_id,
                ActivitySession.start_time >= start,
                or_(ActivitySession.activity_group == "cycling", ActivitySession.sport_type.in_(LEGACY_CYCLING_SPORT_TYPES)),
            )
            .order_by(ActivitySession.start_time.desc())
        )
    ).scalars().all()

    summaries = (
        await db.execute(
            select(DailySummary)
            .where(DailySummary.user_id == user_id, DailySummary.date >= summary_start)
            .order_by(DailySummary.date.desc())
        )
    ).scalars().all()

    tss_3d = _sum_tss(sessions, now, 3)
    tss_7d = _sum_tss(sessions, now, 7)
    tss_14d = _sum_tss(sessions, now, 14)
    tss_28d = _sum_tss(sessions, now, 28)
    acwr = _calculate_acwr(tss_7d, tss_14d, tss_28d)
    load_status = _load_status(acwr)
    rides_14d = _count_rides(sessions, now, 14)
    days_since_last_ride = _days_since_last_ride(sessions, today)
    last_hard_ride_days_ago = _days_since_last_hard_ride(sessions, today)
    goal_completion_avg = _avg_goal_completion(summaries)

    components = ReadinessComponents(
        load_balance=_score_load_balance(acwr),
        recovery=_score_recovery(tss_3d, last_hard_ride_days_ago),
        freshness=_score_freshness(days_since_last_ride),
        consistency=_score_consistency(rides_14d, goal_completion_avg),
        daily_activity=_score_daily_activity(summaries[0] if summaries else None),
    )
    score = round(
        components.load_balance * 0.35
        + components.recovery * 0.25
        + components.freshness * 0.15
        + components.consistency * 0.15
        + components.daily_activity * 0.10
    )
    score = int(_clamp(score))
    label = _label_for_score(score)

    return ReadinessSummary(
        score=score,
        label=label,
        recommendation=_recommendation_for(label, load_status),
        components=components,
        metrics=ReadinessMetrics(
            acwr=round(acwr, 2) if acwr is not None else None,
            tss_3d=round(tss_3d, 2),
            tss_7d=round(tss_7d, 2),
            tss_14d=round(tss_14d, 2),
            tss_28d=round(tss_28d, 2),
            rides_14d=rides_14d,
            days_since_last_ride=days_since_last_ride,
            last_hard_ride_days_ago=last_hard_ride_days_ago,
            load_status=load_status,
        ),
        signals=_signals(acwr, load_status, tss_3d, rides_14d, days_since_last_ride, last_hard_ride_days_ago),
    )


def _sum_tss(sessions: list[ActivitySession], now: datetime, days: int) -> float:
    start = now - timedelta(days=days)
    return float(sum(session.tss_score or 0 for session in sessions if session.start_time >= start))


def _count_rides(sessions: list[ActivitySession], now: datetime, days: int) -> int:
    start = now - timedelta(days=days)
    return sum(1 for session in sessions if session.start_time >= start)


def _calculate_acwr(tss_7d: float, tss_14d: float, tss_28d: float) -> float | None:
    if tss_28d > 0:
        baseline = tss_28d / 4
    elif tss_14d > 0:
        baseline = tss_14d / 2
    else:
        return None
    if baseline <= 0:
        return None
    return tss_7d / baseline


def _load_status(acwr: float | None) -> str:
    if acwr is None:
        return "baseline_pending"
    if acwr < 0.60:
        return "detraining"
    if acwr < 0.80:
        return "undertraining"
    if acwr <= 1.30:
        return "optimal"
    if acwr <= 1.50:
        return "caution"
    return "overload"


def _days_since_last_ride(sessions: list[ActivitySession], today: date) -> int | None:
    if not sessions:
        return None
    return max((today - sessions[0].start_time.date()).days, 0)


def _days_since_last_hard_ride(sessions: list[ActivitySession], today: date) -> int | None:
    hard = next((session for session in sessions if _is_hard_ride(session)), None)
    if hard is None:
        return None
    return max((today - hard.start_time.date()).days, 0)


def _is_hard_ride(session: ActivitySession) -> bool:
    return bool((session.tss_score or 0) >= 90 or session.duration_sec >= 5400 or (session.ascent_m or 0) >= 800)


def _avg_goal_completion(summaries: list[DailySummary]) -> float | None:
    if not summaries:
        return None
    return float(sum(summary.goal_completion_rate for summary in summaries) / len(summaries))


def _score_load_balance(acwr: float | None) -> float:
    if acwr is None:
        return 70
    if acwr < 0.60:
        return 45
    if acwr < 0.80:
        return 65
    if acwr <= 1.30:
        return 90
    if acwr <= 1.50:
        return 65
    return 35


def _score_recovery(tss_3d: float, last_hard_days: int | None) -> float:
    if tss_3d <= 120:
        score = 88
    elif tss_3d <= 220:
        score = 72
    elif tss_3d <= 320:
        score = 55
    else:
        score = 38

    if last_hard_days == 0:
        score -= 25
    elif last_hard_days == 1:
        score -= 15
    elif last_hard_days is None or last_hard_days > 3:
        score += 5
    return _clamp(score)


def _score_freshness(days_since_last_ride: int | None) -> float:
    if days_since_last_ride is None:
        return 60
    if days_since_last_ride == 0:
        return 55
    if days_since_last_ride == 1:
        return 80
    if days_since_last_ride == 2:
        return 90
    if days_since_last_ride == 3:
        return 85
    if days_since_last_ride <= 6:
        return 70
    return 55


def _score_consistency(rides_14d: int, goal_completion_avg: float | None) -> float:
    if rides_14d == 0:
        score = 35
    elif rides_14d == 1:
        score = 55
    elif rides_14d == 2:
        score = 70
    elif rides_14d <= 6:
        score = 90
    elif rides_14d <= 9:
        score = 75
    else:
        score = 60

    if goal_completion_avg is not None:
        if goal_completion_avg >= 0.80:
            score += 5
        elif goal_completion_avg < 0.40:
            score -= 10
    return _clamp(score)


def _score_daily_activity(summary: DailySummary | None) -> float:
    if summary is None:
        return 70
    if summary.daily_score:
        return _clamp(summary.daily_score)
    score = 50 + (summary.goal_completion_rate * 35) + min(summary.active_hours, 8) * 2
    if summary.high_intensity_min > 60:
        score -= 10
    return _clamp(score)


def _label_for_score(score: int) -> str:
    if score >= 85:
        return "Peak"
    if score >= 70:
        return "Ready"
    if score >= 55:
        return "Maintain"
    if score >= 35:
        return "Recover"
    return "Rest"


def _recommendation_for(label: str, load_status: str) -> str:
    if load_status in {"caution", "overload"}:
        return "Training load is elevated. Prefer recovery or an easy Z2 ride today."
    return {
        "Peak": "Power intervals or a short high-intensity cycling session are suitable today.",
        "Ready": "Endurance Z2 or tempo ride is suitable today.",
        "Maintain": "Easy Z2 ride or cadence technique session is recommended.",
        "Recover": "Recovery ride, mobility, or a short easy spin is recommended.",
        "Rest": "Full rest recommended. Avoid adding training load today.",
    }[label]


def _signals(
    acwr: float | None,
    load_status: str,
    tss_3d: float,
    rides_14d: int,
    days_since_last_ride: int | None,
    last_hard_ride_days_ago: int | None,
) -> list[str]:
    output: list[str] = []
    if acwr is None:
        output.append("ACWR baseline is pending until more ride history is available")
    else:
        output.append(f"ACWR is {acwr:.2f}, currently {load_status.replace('_', ' ')}")

    if tss_3d <= 120:
        output.append("Recent 3-day training load is light")
    elif tss_3d <= 220:
        output.append("Recent 3-day training load is moderate")
    else:
        output.append("Recent 3-day training load is high")

    if rides_14d >= 3:
        output.append("Ride consistency is strong over the last 14 days")
    elif rides_14d == 0:
        output.append("No cycling sessions found in the last 14 days")
    else:
        output.append("Ride consistency is still building")

    if days_since_last_ride is None:
        output.append("Sync rides to personalize freshness")
    elif days_since_last_ride == 0:
        output.append("You already rode today")
    elif days_since_last_ride == 1:
        output.append("Last ride was yesterday")
    else:
        output.append(f"Last ride was {days_since_last_ride} days ago")

    if last_hard_ride_days_ago in {0, 1}:
        output.append("A hard ride was very recent, so intensity should be limited")
    return output[:5]


def _clamp(value: float, minimum: float = 0, maximum: float = 100) -> float:
    return max(minimum, min(maximum, value))
