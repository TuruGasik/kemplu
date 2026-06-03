import type {
  ActivityDetail,
  ActivitySession,
  DashboardSummary,
  GoalAttainmentPoint,
  HuaweiLoginResponse,
  IntensityZones,
  ReadinessSummary,
  SeasonalAnalytics,
  SyncTriggerResponse,
  WeeklyLoadAnalyticsPoint,
} from '../types/health';

const now = new Date();
const dayMs = 24 * 60 * 60 * 1000;

function isoDate(daysAgo: number): string {
  return new Date(now.getTime() - daysAgo * dayMs).toISOString().slice(0, 10);
}

function isoDateTime(daysAgo: number, hour = 6): string {
  const date = new Date(now.getTime() - daysAgo * dayMs);
  date.setHours(hour, 15, 0, 0);
  return date.toISOString();
}

function makeRide(index: number): ActivitySession {
  const distanceKm = 24 + index * 4.8 + (index % 3) * 3;
  const durationSec = Math.round(distanceKm / (24 + (index % 4) * 1.7) * 3600);
  const tss = Math.round(distanceKm * 2.4 + (index % 5) * 8);
  const activityTypes = [
    { activity_type: 'cycling', activity_label: 'Outdoor Cycling' },
    { activity_type: 'cycling_indoor', activity_label: 'Indoor Cycling' },
    { activity_type: 'spinning', activity_label: 'Spinning' },
    { activity_type: 'bmx', activity_label: 'BMX' },
  ];
  const activity = activityTypes[index % activityTypes.length];
  return {
    id: `mock-${index + 1}`,
    activity_id: `mock-ride-${index + 1}`,
    sport_type: index % activityTypes.length + 1,
    activity_type: activity.activity_type,
    activity_group: 'cycling',
    activity_label: activity.activity_label,
    start_time: isoDateTime(index * 3, 5 + (index % 3)),
    end_time: new Date(new Date(isoDateTime(index * 3, 5 + (index % 3))).getTime() + durationSec * 1000).toISOString(),
    duration_sec: durationSec,
    distance_m: Math.round(distanceKm * 1000),
    ascent_m: Math.round(120 + index * 28 + (index % 4) * 45),
    calories: Math.round(distanceKm * 31 + (index % 4) * 80),
    avg_speed_kmh: Number((distanceKm / (durationSec / 3600)).toFixed(1)),
    tss_score: tss,
    performance_delta: index === 0 ? 8.2 : Number(((index % 7) * 2.1 - 5.4).toFixed(1)),
    season_tag: index % 2 === 0 ? 'DRY_SEASON' : 'RAINY_SEASON',
    synced_at: now.toISOString(),
  };
}

const rides = Array.from({ length: 18 }, (_, index) => makeRide(index));

const dailySummaries = Array.from({ length: 30 }, (_, index) => {
  const activeHours = Number((1.2 + (index % 6) * 0.35).toFixed(1));
  const goalCompletionRate = Math.min(1.15, 0.62 + (index % 8) * 0.055);
  return {
    date: isoDate(index),
    steps: 6200 + (index % 9) * 850,
    active_hours: activeHours,
    calories: 520 + (index % 7) * 92,
    goal_completion_rate: Number(goalCompletionRate.toFixed(2)),
    daily_score: Math.round(58 + goalCompletionRate * 32 + (index % 4) * 2),
    medium_intensity_min: 22 + (index % 6) * 8,
    high_intensity_min: 8 + (index % 5) * 6,
  };
});

const weeklyLoad: WeeklyLoadAnalyticsPoint[] = Array.from({ length: 12 }, (_, index) => {
  const weekStart = new Date(now.getTime() - (11 - index) * 7 * dayMs).toISOString().slice(0, 10);
  return {
    week: weekStart,
    tss: 155 + index * 18 + (index % 4) * 22,
    distance_km: Number((68 + index * 7.5 + (index % 3) * 14).toFixed(1)),
  };
});

const goalAttainment: GoalAttainmentPoint[] = Array.from({ length: 6 }, (_, index) => {
  const month = new Date(now.getFullYear(), now.getMonth() - (5 - index), 1).toISOString().slice(0, 10);
  const rate = 0.68 + index * 0.045 + (index % 2) * 0.04;
  return {
    month,
    goal_attainment_rate: Number(Math.min(rate, 0.96).toFixed(2)),
    daily_score: Math.round(72 + index * 3 + (index % 2) * 4),
  };
});

export const mockApi = {
  auth: {
    async login(): Promise<HuaweiLoginResponse> {
      return { auth_url: `${window.location.origin}/auth/callback?token=mock-session-token`, state: 'mock-state' };
    },
    async logout(): Promise<void> {
      return undefined;
    },
  },
  dashboard: {
    // Use 7 for a short weekly view or 365 for long-range history.
    async summary(days: 7 | 30 | 365 = 30): Promise<DashboardSummary> {
      const visibleSummaries = dailySummaries.slice(0, days === 365 ? 30 : days);
      return {
        days,
        daily_score: visibleSummaries[0]?.daily_score ?? 0,
        today_distance_km: Number((rides[0].distance_m / 1000).toFixed(1)),
        calories: visibleSummaries[0]?.calories ?? 0,
        active_hours: visibleSummaries[0]?.active_hours ?? 0,
        weekly_load: visibleSummaries.slice(0, 7).reverse().map((summary) => ({
          day: new Date(summary.date).toLocaleDateString(undefined, { weekday: 'short' }),
          date: summary.date,
          tss: rides.find((ride) => ride.start_time.startsWith(summary.date))?.tss_score ?? Math.round(summary.high_intensity_min * 2.4),
        })),
        heatmap: visibleSummaries.map((summary) => ({ date: summary.date, value: summary.daily_score })),
        goals: {
          steps: Math.min(1, (visibleSummaries[0]?.steps ?? 0) / 10000),
          calories: Math.min(1, (visibleSummaries[0]?.calories ?? 0) / 900),
          active_hours: Math.min(1, (visibleSummaries[0]?.active_hours ?? 0) / 3),
        },
        last_rides: rides.slice(0, 5),
        daily_summaries: visibleSummaries,
      };
    },
  },
  rides: {
    async list(params: { page?: number; limit?: number; sport_type?: string; start_date?: string; end_date?: string } = {}): Promise<ActivitySession[]> {
      const page = params.page ?? 1;
      const limit = params.limit ?? 10;
      return rides.slice((page - 1) * limit, page * limit);
    },
    async detail(activityId: string): Promise<ActivityDetail> {
      const ride = rides.find((item) => item.activity_id === activityId) ?? rides[0];
      return {
        ...ride,
        raw_json: { source: 'mock', device: 'Huawei Watch GT Demo', weather: 'Partly cloudy' },
        elevation: Array.from({ length: 48 }, (_, index) => ({
          distance_km: Number(((ride.distance_m / 1000 / 47) * index).toFixed(2)),
          altitude: Math.round(80 + Math.sin(index / 4) * 35 + index * 2.4 + (index % 9) * 4),
        })),
        intensity_zones: { Z1: 28, Z2: 42, Z3: 31, Z4: 16, Z5: 7 },
      };
    },
  },
  analytics: {
    async weeklyLoad(): Promise<WeeklyLoadAnalyticsPoint[]> {
      return weeklyLoad;
    },
    async seasonal(): Promise<SeasonalAnalytics> {
      return {
        DRY_SEASON: { sessions: 26, avg_distance_km: 46.8, avg_tss: 118, avg_calories: 1420 },
        RAINY_SEASON: { sessions: 18, avg_distance_km: 34.2, avg_tss: 91, avg_calories: 1015 },
      };
    },
    async intensityDistribution(): Promise<IntensityZones> {
      return { Z1: 165, Z2: 240, Z3: 138, Z4: 72, Z5: 31 };
    },
    async goalAttainment(): Promise<GoalAttainmentPoint[]> {
      return goalAttainment;
    },
    async readiness(): Promise<ReadinessSummary> {
      return {
        score: 72,
        label: 'Ready',
        recommendation: 'Endurance Z2 or tempo ride is suitable today.',
        components: {
          load_balance: 90,
          recovery: 68,
          freshness: 80,
          consistency: 92,
          daily_activity: 74,
        },
        metrics: {
          acwr: 1.12,
          tss_3d: 146,
          tss_7d: 318,
          tss_14d: 604,
          tss_28d: 1135,
          rides_14d: 6,
          days_since_last_ride: 1,
          last_hard_ride_days_ago: 3,
          load_status: 'optimal',
        },
        signals: [
          'ACWR is in the optimal range',
          'Recent 3-day training load is moderate',
          'Ride consistency is strong over the last 14 days',
          'Last ride was yesterday',
        ],
      };
    },
  },
  sync: {
    async trigger(): Promise<SyncTriggerResponse> {
      return { status: 'mock_sync_completed', sync_log_id: 'mock-sync-log' };
    },
  },
};
