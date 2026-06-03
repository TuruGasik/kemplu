from pydantic import BaseModel

from app.schemas.activity import ActivitySessionRead, DailySummaryRead


class DashboardMetric(BaseModel):
    label: str
    value: float
    unit: str | None = None
    delta: float | None = None


class DashboardSummary(BaseModel):
    days: int
    daily_score: float
    today_distance_km: float
    calories: float
    active_hours: float
    weekly_load: list[dict]
    heatmap: list[dict]
    goals: dict[str, float]
    last_rides: list[ActivitySessionRead]
    daily_summaries: list[DailySummaryRead]


class AnalyticsSeries(BaseModel):
    label: str
    data: list[dict]
