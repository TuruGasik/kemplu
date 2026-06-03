from datetime import UTC, datetime, timedelta
from typing import Any

from fastapi import APIRouter, Depends, Query
from sqlalchemy import extract, func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.dependencies import get_current_user
from app.models.activity import ActivitySession, DailySummary
from app.models.user import User
from app.schemas.readiness import ReadinessSummary
from app.services.data_processor import DRY_SEASON, RAINY_SEASON
from app.services.readiness import calculate_readiness

router = APIRouter(prefix="/api/analytics", tags=["analytics"])


@router.get("/readiness", response_model=ReadinessSummary)
async def readiness(
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> ReadinessSummary:
    return await calculate_readiness(db, user.id)


@router.get("/weekly-load")
async def weekly_load(
    weeks: int = Query(default=12, ge=1, le=52),
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> list[dict[str, Any]]:
    start = datetime.now(UTC) - timedelta(weeks=weeks)
    rows = await db.execute(
        select(
            func.date_trunc("week", ActivitySession.start_time).label("week"),
            func.coalesce(func.sum(ActivitySession.tss_score), 0).label("tss"),
            func.coalesce(func.sum(ActivitySession.distance_m), 0).label("distance_m"),
        )
        .where(ActivitySession.user_id == user.id, ActivitySession.start_time >= start)
        .group_by("week")
        .order_by("week")
    )
    return [
        {"week": row.week.date().isoformat(), "tss": round(float(row.tss), 2), "distance_km": round(float(row.distance_m) / 1000, 2)}
        for row in rows
    ]


@router.get("/seasonal")
async def seasonal(
    year: int = Query(default_factory=lambda: datetime.now(UTC).year),
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> dict[str, dict[str, float]]:
    rows = await db.execute(
        select(
            ActivitySession.season_tag,
            func.count(ActivitySession.id).label("sessions"),
            func.coalesce(func.avg(ActivitySession.distance_m), 0).label("avg_distance_m"),
            func.coalesce(func.avg(ActivitySession.tss_score), 0).label("avg_tss"),
            func.coalesce(func.avg(ActivitySession.calories), 0).label("avg_calories"),
        )
        .where(ActivitySession.user_id == user.id, extract("year", ActivitySession.start_time) == year)
        .group_by(ActivitySession.season_tag)
    )
    output = {DRY_SEASON: _empty_season(), RAINY_SEASON: _empty_season()}
    for row in rows:
        key = row.season_tag or RAINY_SEASON
        output[key] = {
            "sessions": float(row.sessions),
            "avg_distance_km": round(float(row.avg_distance_m) / 1000, 2),
            "avg_tss": round(float(row.avg_tss), 2),
            "avg_calories": round(float(row.avg_calories), 2),
        }
    return output


@router.get("/intensity-distribution")
async def intensity_distribution(
    weeks: int = Query(default=4, ge=1, le=52),
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> dict[str, float]:
    start_date = datetime.now(UTC).date() - timedelta(weeks=weeks)
    row = await db.execute(
        select(
            func.coalesce(func.sum(DailySummary.medium_intensity_min), 0).label("medium"),
            func.coalesce(func.sum(DailySummary.high_intensity_min), 0).label("high"),
        ).where(DailySummary.user_id == user.id, DailySummary.date >= start_date)
    )
    result = row.one()
    medium = float(result.medium)
    high = float(result.high)
    return {"Z1": 0, "Z2": 0, "Z3": round(medium * 0.6, 2), "Z4": round(medium * 0.4, 2), "Z5": round(high, 2)}


@router.get("/goal-attainment")
async def goal_attainment(
    months: int = Query(default=6, ge=1, le=24),
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> list[dict[str, Any]]:
    start_date = datetime.now(UTC).date() - timedelta(days=months * 31)
    rows = await db.execute(
        select(
            func.date_trunc("month", DailySummary.date).label("month"),
            func.coalesce(func.avg(DailySummary.goal_completion_rate), 0).label("rate"),
            func.coalesce(func.avg(DailySummary.daily_score), 0).label("score"),
        )
        .where(DailySummary.user_id == user.id, DailySummary.date >= start_date)
        .group_by("month")
        .order_by("month")
    )
    return [{"month": row.month.date().isoformat(), "goal_attainment_rate": round(float(row.rate), 4), "daily_score": round(float(row.score), 2)} for row in rows]


def _empty_season() -> dict[str, float]:
    return {"sessions": 0, "avg_distance_km": 0, "avg_tss": 0, "avg_calories": 0}
