from datetime import UTC, datetime
from typing import Literal

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy import or_
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.dependencies import get_current_user
from app.models.activity import ActivitySession
from app.models.user import User
from app.schemas.activity import ActivityDetail, ActivitySessionRead

router = APIRouter(prefix="/api/rides", tags=["rides"])


@router.get("", response_model=list[ActivitySessionRead])
async def list_rides(
    page: int = Query(default=1, ge=1),
    limit: int = Query(default=20, ge=1, le=100),
    sport_type: Literal["cycling", "all"] = "cycling",
    start_date: datetime | None = None,
    end_date: datetime | None = None,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> list[ActivitySessionRead]:
    query = select(ActivitySession).where(ActivitySession.user_id == user.id)
    if sport_type == "cycling":
        query = query.where(or_(ActivitySession.activity_group == "cycling", ActivitySession.sport_type.in_([1, 2, 3, 4, 9])))
    if start_date:
        query = query.where(ActivitySession.start_time >= start_date)
    if end_date:
        query = query.where(ActivitySession.start_time <= end_date)
    query = query.order_by(ActivitySession.start_time.desc()).offset((page - 1) * limit).limit(limit)
    rides = (await db.execute(query)).scalars().all()
    return [ActivitySessionRead.model_validate(ride) for ride in rides]


@router.get("/{activity_id}", response_model=ActivityDetail)
async def ride_detail(
    activity_id: str,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> ActivityDetail:
    result = await db.execute(
        select(ActivitySession).where(ActivitySession.user_id == user.id, ActivitySession.activity_id == activity_id)
    )
    ride = result.scalar_one_or_none()
    if ride is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Ride not found")
    detail = ActivityDetail.model_validate(ride)
    detail.elevation = (ride.raw_json or {}).get("elevation", [])
    detail.intensity_zones = (ride.raw_json or {}).get("intensity_zones", {})
    return detail
