from __future__ import annotations

from collections import defaultdict
from dataclasses import dataclass
from datetime import date, datetime
from statistics import mean
from typing import Any, Iterable, Mapping

DRY_SEASON = "DRY_SEASON"
RAINY_SEASON = "RAINY_SEASON"


@dataclass(frozen=True)
class PerformanceBaseline:
    distance_km: float
    ascent_m: float
    duration_min: float
    calories: float
    tss_score: float


class DataProcessor:
    @staticmethod
    def compute_training_stress_score(
        distance_km: float,
        ascent_m: float,
        duration_min: float,
        intensity: float,
    ) -> float:
        intensity_factor = DataProcessor._normalize_intensity(intensity)
        score = (duration_min * ascent_m * 0.01) + (distance_km * intensity_factor)
        return round(max(score, 0), 2)

    @staticmethod
    def compute_daily_score(
        steps: int,
        active_hours: float,
        calories: float,
        goal_completion_rate: float,
    ) -> float:
        del calories
        score = (steps / 10_000 * 30) + (active_hours / 8 * 30) + (goal_completion_rate * 40)
        return round(min(100, max(score, 0)), 2)

    @staticmethod
    def compute_performance_vs_baseline(
        session: Mapping[str, Any],
        last_30_sessions: Iterable[Mapping[str, Any]],
    ) -> float:
        sessions = list(last_30_sessions)
        if not sessions:
            return 0.0

        session_score = DataProcessor._session_performance_index(session)
        baseline_score = mean(DataProcessor._session_performance_index(item) for item in sessions)
        if baseline_score <= 0:
            return 0.0
        return round(((session_score - baseline_score) / baseline_score) * 100, 2)

    @staticmethod
    def detect_seasonal_pattern(monthly_data: Iterable[Mapping[str, Any]]) -> list[dict[str, Any]]:
        tagged_months = []
        for item in monthly_data:
            month = DataProcessor._extract_month(item)
            tagged = dict(item)
            tagged["season_tag"] = DataProcessor.season_tag_for_month(month)
            tagged_months.append(tagged)
        return tagged_months

    @staticmethod
    def season_tag_for_month(month: int) -> str:
        return DRY_SEASON if 5 <= month <= 9 else RAINY_SEASON

    @staticmethod
    def aggregate_monthly_metrics(sessions: Iterable[Mapping[str, Any]]) -> list[dict[str, Any]]:
        buckets: dict[str, dict[str, Any]] = defaultdict(
            lambda: {
                "distance_km": 0.0,
                "calories": 0.0,
                "tss_score": 0.0,
                "ascent_m": 0.0,
                "duration_min": 0.0,
                "sessions": 0,
            }
        )
        for session in sessions:
            started_at = DataProcessor._coerce_datetime(session.get("start_time") or session.get("startTime"))
            bucket_key = started_at.strftime("%Y-%m")
            bucket = buckets[bucket_key]
            bucket["month"] = bucket_key
            bucket["season_tag"] = DataProcessor.season_tag_for_month(started_at.month)
            bucket["distance_km"] += DataProcessor._get_float(session, "distance_km", "distance_m")
            if "distance_m" in session and "distance_km" not in session:
                bucket["distance_km"] = bucket["distance_km"] / 1000
            bucket["calories"] += DataProcessor._get_float(session, "calories")
            bucket["tss_score"] += DataProcessor._get_float(session, "tss_score")
            bucket["ascent_m"] += DataProcessor._get_float(session, "ascent_m")
            bucket["duration_min"] += DataProcessor._duration_minutes(session)
            bucket["sessions"] += 1

        return [DataProcessor._round_metrics(value) for _, value in sorted(buckets.items())]

    @staticmethod
    def compute_goal_completion_rate(steps: int, calories: float, active_hours: float) -> float:
        step_rate = min(steps / 10_000, 1)
        calorie_rate = min(calories / 500, 1)
        active_hour_rate = min(active_hours / 8, 1)
        return round((step_rate + calorie_rate + active_hour_rate) / 3, 4)

    @staticmethod
    def summarize_intensity_zones(samples: Iterable[Mapping[str, Any]]) -> dict[str, float]:
        zones = {"Z1": 0.0, "Z2": 0.0, "Z3": 0.0, "Z4": 0.0, "Z5": 0.0}
        for sample in samples:
            zone = str(sample.get("zone") or sample.get("intensityZone") or "").upper()
            minutes = DataProcessor._get_float(sample, "minutes", "duration_min", "durationMin")
            if zone in zones:
                zones[zone] += minutes
        return {zone: round(minutes, 2) for zone, minutes in zones.items()}

    @staticmethod
    def _normalize_intensity(intensity: float) -> float:
        if intensity <= 0:
            return 1.0
        if intensity <= 1:
            return intensity
        if intensity <= 5:
            return intensity / 5
        if intensity <= 100:
            return intensity / 100
        return 1.0

    @staticmethod
    def _session_performance_index(session: Mapping[str, Any]) -> float:
        distance_km = DataProcessor._get_float(session, "distance_km", "distance_m")
        if "distance_m" in session and "distance_km" not in session:
            distance_km = distance_km / 1000
        ascent_m = DataProcessor._get_float(session, "ascent_m", "ascent")
        duration_min = DataProcessor._duration_minutes(session)
        tss_score = DataProcessor._get_float(session, "tss_score", "tss")
        avg_speed_kmh = DataProcessor._get_float(session, "avg_speed_kmh", "avgSpeedKmh")
        return (distance_km * 2.0) + (ascent_m * 0.05) + (duration_min * 0.2) + (avg_speed_kmh * 1.5) + tss_score

    @staticmethod
    def _duration_minutes(session: Mapping[str, Any]) -> float:
        duration_min = DataProcessor._get_float(session, "duration_min", "durationMin")
        if duration_min:
            return duration_min
        duration_sec = DataProcessor._get_float(session, "duration_sec", "durationSec", "duration")
        return duration_sec / 60

    @staticmethod
    def _get_float(mapping: Mapping[str, Any], *keys: str) -> float:
        for key in keys:
            value = mapping.get(key)
            if value is not None:
                try:
                    return float(value)
                except (TypeError, ValueError):
                    return 0.0
        return 0.0

    @staticmethod
    def _extract_month(item: Mapping[str, Any]) -> int:
        raw_month = item.get("month") or item.get("date") or item.get("start_time") or item.get("startTime")
        if isinstance(raw_month, int):
            return raw_month
        if isinstance(raw_month, date):
            return raw_month.month
        if isinstance(raw_month, str):
            return DataProcessor._coerce_datetime(raw_month).month
        return datetime.now().month

    @staticmethod
    def _coerce_datetime(value: Any) -> datetime:
        if isinstance(value, datetime):
            return value
        if isinstance(value, date):
            return datetime.combine(value, datetime.min.time())
        if isinstance(value, (int, float)):
            timestamp = float(value)
            if timestamp > 10_000_000_000:
                timestamp = timestamp / 1000
            return datetime.fromtimestamp(timestamp)
        if isinstance(value, str):
            return datetime.fromisoformat(value.replace("Z", "+00:00"))
        return datetime.now()

    @staticmethod
    def _round_metrics(metrics: dict[str, Any]) -> dict[str, Any]:
        rounded = dict(metrics)
        for key in ("distance_km", "calories", "tss_score", "ascent_m", "duration_min"):
            rounded[key] = round(float(rounded[key]), 2)
        return rounded
