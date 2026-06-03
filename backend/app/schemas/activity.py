from datetime import date, datetime
from typing import Any
from uuid import UUID

from pydantic import BaseModel, ConfigDict


class ActivitySessionRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: UUID
    activity_id: str
    sport_type: int
    activity_type: str | None = None
    activity_group: str | None = None
    activity_label: str | None = None
    start_time: datetime
    end_time: datetime
    duration_sec: int
    distance_m: float
    ascent_m: float
    calories: float
    avg_speed_kmh: float
    tss_score: float
    performance_delta: float | None
    season_tag: str | None
    synced_at: datetime


class ActivityDetail(ActivitySessionRead):
    raw_json: dict[str, Any] | None = None
    elevation: list[dict[str, Any]] = []
    intensity_zones: dict[str, float] = {}


class DailySummaryRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    date: date
    steps: int
    active_hours: float
    calories: float
    goal_completion_rate: float
    daily_score: float
    medium_intensity_min: int
    high_intensity_min: int
