from datetime import date, datetime
from typing import TYPE_CHECKING, Any
from uuid import UUID, uuid4

from sqlalchemy import Date, DateTime, Float, ForeignKey, Integer, String, UniqueConstraint, func
from sqlalchemy.dialects.postgresql import JSONB
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.database import DeclarativeBaseModel

if TYPE_CHECKING:
    from app.models.user import User


class ActivitySession(DeclarativeBaseModel):
    __tablename__ = "activity_sessions"
    __table_args__ = (UniqueConstraint("user_id", "activity_id", name="uq_activity_sessions_user_activity"),)

    id: Mapped[UUID] = mapped_column(primary_key=True, default=uuid4)
    user_id: Mapped[UUID] = mapped_column(ForeignKey("users.id", ondelete="CASCADE"), index=True)
    activity_id: Mapped[str] = mapped_column(String(255), index=True)
    sport_type: Mapped[int] = mapped_column(Integer, index=True)
    activity_type: Mapped[str | None] = mapped_column(String(64), nullable=True, index=True)
    activity_group: Mapped[str | None] = mapped_column(String(64), nullable=True, index=True)
    activity_label: Mapped[str | None] = mapped_column(String(128), nullable=True)
    start_time: Mapped[datetime] = mapped_column(DateTime(timezone=True), index=True)
    end_time: Mapped[datetime] = mapped_column(DateTime(timezone=True), index=True)
    duration_sec: Mapped[int] = mapped_column(Integer, default=0)
    distance_m: Mapped[float] = mapped_column(Float, default=0)
    ascent_m: Mapped[float] = mapped_column(Float, default=0)
    calories: Mapped[float] = mapped_column(Float, default=0)
    avg_speed_kmh: Mapped[float] = mapped_column(Float, default=0)
    tss_score: Mapped[float] = mapped_column(Float, default=0)
    performance_delta: Mapped[float | None] = mapped_column(Float, nullable=True)
    season_tag: Mapped[str | None] = mapped_column(String(32), nullable=True, index=True)
    raw_json: Mapped[dict[str, Any] | None] = mapped_column(JSONB, nullable=True)
    synced_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())

    user: Mapped["User"] = relationship(back_populates="activities")


class DailySummary(DeclarativeBaseModel):
    __tablename__ = "daily_summaries"
    __table_args__ = (UniqueConstraint("user_id", "date", name="uq_daily_summaries_user_date"),)

    id: Mapped[UUID] = mapped_column(primary_key=True, default=uuid4)
    user_id: Mapped[UUID] = mapped_column(ForeignKey("users.id", ondelete="CASCADE"), index=True)
    date: Mapped[date] = mapped_column(Date, index=True)
    steps: Mapped[int] = mapped_column(Integer, default=0)
    active_hours: Mapped[float] = mapped_column(Float, default=0)
    calories: Mapped[float] = mapped_column(Float, default=0)
    goal_completion_rate: Mapped[float] = mapped_column(Float, default=0)
    daily_score: Mapped[float] = mapped_column(Float, default=0)
    medium_intensity_min: Mapped[int] = mapped_column(Integer, default=0)
    high_intensity_min: Mapped[int] = mapped_column(Integer, default=0)

    user: Mapped["User"] = relationship(back_populates="daily_summaries")
