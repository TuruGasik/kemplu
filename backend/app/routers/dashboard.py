from datetime import UTC, date, datetime, timedelta
from typing import Any

from fastapi import APIRouter, Depends, Query
from sqlalchemy import Select, func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.dependencies import get_current_user
from app.models.activity import ActivitySession, DailySummary
from app.models.user import User
from app.schemas.activity import ActivitySessionRead, DailySummaryRead
from app.schemas.dashboard import DashboardSummary

router = APIRouter(prefix="/api/dashboard", tags=["dashboard"])


@router.get("/summary", response_model=DashboardSummary)
async def dashboard_summary(
    days: int = Query(default=7, pattern="^(7|30|365)$"),
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> DashboardSummary:
    today = datetime.now(UTC).date()
    start_date = today - timedelta(days=days - 1)

    summaries = (await db.execute(_summary_query(user.id, start_date))).scalars().all()
    rides = (
        await db.execute(
            select(ActivitySession)
            .where(ActivitySession.user_id == user.id, ActivitySession.start_time >= datetime.combine(start_date, datetime.min.time(), UTC))
            .order_by(ActivitySession.start_time.desc())
            .limit(3)
        )
    ).scalars().all()

    today_summary = next((item for item in summaries if item.date == today), None)
    today_distance = await db.scalar(
        select(func.coalesce(func.sum(ActivitySession.distance_m), 0)).where(
            ActivitySession.user_id == user.id,
            func.date(ActivitySession.start_time) == today,
        )
    )

    return DashboardSummary(
        days=days,
        daily_score=float(today_summary.daily_score if today_summary else 0),
        today_distance_km=round(float(today_distance or 0) / 1000, 2),
        calories=float(today_summary.calories if today_summary else 0),
        active_hours=float(today_summary.active_hours if today_summary else 0),
        weekly_load=_weekly_load(summaries),
        heatmap=_heatmap(summaries),
        goals=_goals(today_summary),
        last_rides=[ActivitySessionRead.model_validate(ride) for ride in rides],
        daily_summaries=[DailySummaryRead.model_validate(summary) for summary in summaries],
    )


def _summary_query(user_id: Any, start_date: date) -> Select[tuple[DailySummary]]:
    return select(DailySummary).where(DailySummary.user_id == user_id, DailySummary.date >= start_date).order_by(DailySummary.date)


def _weekly_load(summaries: list[DailySummary]) -> list[dict[str, Any]]:
    return [
        {
            "day": summary.date.strftime("%a"),
            "date": summary.date.isoformat(),
            "tss": round((summary.medium_intensity_min * 0.8) + (summary.high_intensity_min * 1.4), 2),
        }
        for summary in summaries[-7:]
    ]


def _heatmap(summaries: list[DailySummary]) -> list[dict[str, Any]]:
    return [{"date": summary.date.isoformat(), "value": summary.daily_score} for summary in summaries]


def _goals(summary: DailySummary | None) -> dict[str, float]:
    if summary is None:
        return {"steps": 0, "calories": 0, "active_hours": 0}
    return {
        "steps": round(min(summary.steps / 10_000, 1), 4),
        "calories": round(min(summary.calories / 500, 1), 4),
        "active_hours": round(min(summary.active_hours / 8, 1), 4),
    }
