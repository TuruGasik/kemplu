from datetime import date, datetime, time, timedelta
from typing import Any
from uuid import uuid4
from zoneinfo import ZoneInfo

import httpx
from redis.asyncio import Redis

from app.config import Settings, get_settings
from app.services.huawei_auth import HuaweiAuthService

CYCLING_ACTIVITY_TYPES = {"cycling", "cycling_indoor", "spinning", "bmx"}
CYCLING_SPORT_TYPE = "cycling"
CYCLING_ACTIVITY_LABELS = {
    "cycling": "Outdoor Cycling",
    "cycling_indoor": "Indoor Cycling",
    "spinning": "Spinning",
    "bmx": "BMX",
}

CYCLING_SUMMARY_DATA_TYPES = {
    "distance": "com.huawei.continuous.distance.total",
    "speed": "com.huawei.continuous.speed.statistics",
    "calories": "com.huawei.continuous.calories.burnt.total",
    "heart_rate": "com.huawei.continuous.exercise_heart_rate.statistics",
    "cadence": "com.huawei.continuous.pedaling_rate.statistics",
    "power": "com.huawei.continuous.power.statistics",
}

CYCLING_DETAIL_DATA_TYPES = {
    "speed": "com.huawei.instantaneous.speed",
    "heart_rate": "com.huawei.instantaneous.exercise_heart_rate",
    "altitude": "com.huawei.instantaneous.altitude",
    "cadence": "com.huawei.instantaneous.pedaling_rate",
    "power": "com.huawei.instantaneous.power.sample",
}


class HuaweiHealthService:
    def __init__(self, redis: Redis, settings: Settings | None = None) -> None:
        self.redis = redis
        self.settings = settings or get_settings()
        self.auth = HuaweiAuthService(redis, self.settings)
        self.timezone = ZoneInfo(self.settings.timezone)

    async def get_daily_summary(self, user_id: str, start_date: date, end_date: date) -> dict[str, Any]:
        start_ms, end_ms = self._date_range_to_ms(start_date, end_date)
        steps, calories, distance, intensity = await self._batch_data_queries(
            user_id,
            [
                "com.huawei.continuous.steps.delta",
                "com.huawei.continuous.calories.burnt",
                "com.huawei.continuous.distance.delta",
                "com.huawei.continuous.activity.fragment",
            ],
            start_ms,
            end_ms,
        )
        return {
            "start_date": start_date.isoformat(),
            "end_date": end_date.isoformat(),
            "steps": steps,
            "calories": calories,
            "distance": distance,
            "intensity": intensity,
        }

    async def get_activity_records(
        self,
        user_id: str,
        start_date: date,
        end_date: date,
        sport_type: str = CYCLING_SPORT_TYPE,
    ) -> list[dict[str, Any]]:
        start_ms, end_ms = self._date_range_to_ms(start_date, end_date)
        params = {"startTime": str(start_ms), "endTime": str(end_ms), "activityType": sport_type}
        response = await self._request(user_id, "GET", "/activityRecords", params=params)
        records = response.get("activityRecord") or response.get("activityRecords") or response.get("records") or response.get("data") or []
        normalized = [self._normalize_activity_record(record) for record in records]
        return [record for record in normalized if self._is_cycling_activity(record, sport_type)]

    async def get_activity_detail(self, user_id: str, activity_id: str) -> dict[str, Any]:
        return {"id": activity_id}

    async def get_elevation_series(self, user_id: str, activity_id: str) -> dict[str, Any]:
        detail = await self.get_activity_detail(user_id, activity_id)
        start_ms, end_ms = self._activity_time_window(detail)
        altitude = await self._query_data_type(user_id, CYCLING_DETAIL_DATA_TYPES["altitude"], start_ms, end_ms)
        distance = await self._query_data_type(user_id, CYCLING_SUMMARY_DATA_TYPES["distance"], start_ms, end_ms)
        return {"activity_id": activity_id, "altitude": altitude, "distance": distance}

    async def get_weekly_intensity(self, user_id: str, week_start: date) -> dict[str, Any]:
        start_ms, end_ms = self._date_range_to_ms(week_start, week_start + timedelta(days=6))
        intensity = await self._query_data_type(user_id, "com.huawei.continuous.activity.fragment", start_ms, end_ms)
        return {"week_start": week_start.isoformat(), "intensity": intensity}

    async def get_historical_data(self, user_id: str, months: int = 12) -> dict[str, Any]:
        end_date = datetime.now(self.timezone).date()
        start_date = end_date - timedelta(days=months * 31)
        daily_summary = await self.get_daily_summary(user_id, start_date, end_date)
        activity_records = await self.get_activity_records(user_id, start_date, end_date)
        return {"months": months, "daily_summary": daily_summary, "activity_records": activity_records}

    async def get_sport_ability(self, user_id: str) -> dict[str, Any]:
        return await self._request(
            user_id,
            "GET",
            "/athleticPerformance/latest",
            params={"timeZone": self._timezone_offset()},
        )

    async def get_steps(self, user_id: str, start_time_ms: int, end_time_ms: int) -> dict[str, Any]:
        return await self._query_data_type(user_id, "com.huawei.continuous.steps.delta", start_time_ms, end_time_ms)

    async def get_calories(self, user_id: str, start_time_ms: int, end_time_ms: int) -> dict[str, Any]:
        return await self._query_data_type(user_id, "com.huawei.continuous.calories.burnt", start_time_ms, end_time_ms)

    async def get_intensity(self, user_id: str, start_time_ms: int, end_time_ms: int) -> dict[str, Any]:
        return await self._query_data_type(user_id, "com.huawei.continuous.activity.fragment", start_time_ms, end_time_ms)

    async def get_distance(self, user_id: str, start_time_ms: int, end_time_ms: int) -> dict[str, Any]:
        return await self._query_data_type(user_id, "com.huawei.continuous.distance.delta", start_time_ms, end_time_ms)

    async def _batch_data_queries(
        self,
        user_id: str,
        data_types: list[str],
        start_time_ms: int,
        end_time_ms: int,
    ) -> list[dict[str, Any]]:
        results = []
        for data_type in data_types:
            results.append(await self._query_data_type(user_id, data_type, start_time_ms, end_time_ms))
        return results

    async def _query_data_type(
        self,
        user_id: str,
        data_type: str,
        start_time_ms: int,
        end_time_ms: int,
    ) -> dict[str, Any]:
        response = await self._request(
            user_id,
            "POST",
            "/sampleSet:polymerize",
            json_body={
                "polymerizeWith": [{"dataTypeName": data_type}],
                "startTime": start_time_ms,
                "endTime": end_time_ms,
            },
        )
        return self._normalize_polymerize_response(response, data_type)

    async def _request(
        self,
        user_id: str,
        method: str,
        path: str,
        params: dict[str, Any] | None = None,
        json_body: dict[str, Any] | None = None,
    ) -> dict[str, Any]:
        token = await self.auth.get_access_token(user_id)
        url = f"{str(self.settings.huawei_health_base_url).rstrip('/')}/{path.lstrip('/')}"
        headers = {
            "Authorization": f"Bearer {token}",
            "Content-Type": "application/json; charset=UTF-8",
            "x-client-id": self.settings.huawei_client_id,
            "x-version": self.settings.app_version,
            "x-caller-trace-id": str(uuid4()),
        }

        async with httpx.AsyncClient(timeout=45) as client:
            response = await client.request(method, url, headers=headers, params=params, json=json_body)
            if response.status_code == 401:
                token = await self.auth.refresh_token(user_id)
                headers["Authorization"] = f"Bearer {token}"
                response = await client.request(method, url, headers=headers, params=params, json=json_body)
            response.raise_for_status()
            if not response.content:
                return {}
            return response.json()

    def _time_payload(self, start_time_ms: int, end_time_ms: int) -> dict[str, Any]:
        return {
            "startTime": str(start_time_ms),
            "endTime": str(end_time_ms),
            "timeZone": self.settings.timezone,
        }

    def _timezone_offset(self) -> str:
        now = datetime.now(self.timezone)
        offset = now.utcoffset() or timedelta(0)
        total_minutes = int(offset.total_seconds() // 60)
        sign = "+" if total_minutes >= 0 else "-"
        total_minutes = abs(total_minutes)
        hours, minutes = divmod(total_minutes, 60)
        return f"{sign}{hours:02d}{minutes:02d}"

    def _date_range_to_ms(self, start_date: date, end_date: date) -> tuple[int, int]:
        start_dt = datetime.combine(start_date, time.min, tzinfo=self.timezone)
        end_dt = datetime.combine(end_date, time.max, tzinfo=self.timezone)
        return int(start_dt.timestamp() * 1000), int(end_dt.timestamp() * 1000)

    def _activity_time_window(self, activity_detail: dict[str, Any]) -> tuple[int, int]:
        start = activity_detail.get("startTime") or activity_detail.get("start_time")
        end = activity_detail.get("endTime") or activity_detail.get("end_time")
        if start is None or end is None:
            now = datetime.now(self.timezone)
            return int((now - timedelta(hours=6)).timestamp() * 1000), int(now.timestamp() * 1000)
        return int(start), int(end)

    def _normalize_polymerize_response(self, response: dict[str, Any], data_type: str) -> dict[str, Any]:
        sample_points: list[dict[str, Any]] = []
        for group in response.get("group", []):
            for sample_set in group.get("sampleSet", []):
                if sample_set.get("dataTypeName") and sample_set.get("dataTypeName") != data_type:
                    continue
                for point in sample_set.get("samplePoints", []):
                    sample_points.append(point)

        if not sample_points and "samplePoints" in response:
            sample_points = list(response.get("samplePoints", []))

        if not sample_points and "polymerizeData" in response:
            sample_points = list(response.get("polymerizeData", []))

        total = sum(self._point_total(point) for point in sample_points)
        normalized = dict(response)
        normalized.update(
            {
                "dataTypeName": data_type,
                "samplePoints": sample_points,
                "total": total,
            }
        )
        return normalized

    def _normalize_activity_record(self, record: dict[str, Any]) -> dict[str, Any]:
        summary = record.get("activitySummary") or {}
        data_summary = summary.get("dataSummary") or {}
        activity_type = str(record.get("activityType") or record.get("sportType") or CYCLING_SPORT_TYPE).lower()
        normalized = dict(record)
        normalized.update(
            {
                "activityId": record.get("activityId") or record.get("activityRecordId") or record.get("id"),
                "activityType": activity_type,
                "activityGroup": "cycling" if activity_type in CYCLING_ACTIVITY_TYPES else activity_type,
                "activityLabel": CYCLING_ACTIVITY_LABELS.get(activity_type, activity_type.replace("_", " ").title()),
                "startTime": record.get("startTime") or summary.get("startTime"),
                "endTime": record.get("endTime") or summary.get("endTime"),
                "durationSec": self._first_number(record, summary, data_summary, keys=("durationSec", "duration", "durationTime")),
                "distance": self._first_number(record, summary, data_summary, keys=("distance", "distance_m", "distanceMeters")),
                "calories": self._first_number(record, summary, data_summary, keys=("calories", "calorie", "calorieBurnt", "caloriesBurnt")),
                "ascent": self._first_number(record, summary, data_summary, keys=("ascent", "ascent_m", "totalAscent", "climb")),
                "avgSpeedKmh": self._first_number(record, summary, data_summary, keys=("avgSpeedKmh", "avg_speed_kmh", "averageSpeed")),
            }
        )
        return normalized

    def _is_cycling_activity(self, record: dict[str, Any], fallback_type: str) -> bool:
        activity_type = str(record.get("activityType") or record.get("sportType") or fallback_type).lower()
        return activity_type in CYCLING_ACTIVITY_TYPES

    def _first_number(self, *sources: dict[str, Any], keys: tuple[str, ...]) -> float:
        for source in sources:
            for key in keys:
                if key in source and source[key] is not None:
                    try:
                        return float(source[key])
                    except (TypeError, ValueError):
                        continue
        return 0.0

    def _point_total(self, point: dict[str, Any]) -> float:
        value = point.get("value")
        if isinstance(value, list):
            return sum(self._point_total(item) for item in value if isinstance(item, dict))
        if isinstance(value, dict):
            for key in ("intVal", "integerValue", "fpVal", "floatValue", "longVal", "longValue", "value"):
                if key in value:
                    try:
                        return float(value[key] or 0)
                    except (TypeError, ValueError):
                        return 0.0
        for key in ("intVal", "integerValue", "fpVal", "floatValue", "longVal", "longValue", "value"):
            if key in point:
                try:
                    return float(point[key] or 0)
                except (TypeError, ValueError):
                    return 0.0
        return 0.0
