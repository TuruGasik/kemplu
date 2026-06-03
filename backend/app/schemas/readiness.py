from pydantic import BaseModel, Field


class ReadinessComponents(BaseModel):
    load_balance: float = Field(ge=0, le=100)
    recovery: float = Field(ge=0, le=100)
    freshness: float = Field(ge=0, le=100)
    consistency: float = Field(ge=0, le=100)
    daily_activity: float = Field(ge=0, le=100)


class ReadinessMetrics(BaseModel):
    acwr: float | None = None
    tss_3d: float
    tss_7d: float
    tss_14d: float
    tss_28d: float
    rides_14d: int
    days_since_last_ride: int | None = None
    last_hard_ride_days_ago: int | None = None
    load_status: str


class ReadinessSummary(BaseModel):
    score: int
    label: str
    recommendation: str
    components: ReadinessComponents
    metrics: ReadinessMetrics
    signals: list[str]
