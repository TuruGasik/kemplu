export type SeasonTag = 'DRY_SEASON' | 'RAINY_SEASON';

export type SportType = 'cycling' | 'all';

export interface ActivitySession {
  id: string;
  activity_id: string;
  sport_type: number;
  activity_type?: string | null;
  activity_group?: string | null;
  activity_label?: string | null;
  start_time: string;
  end_time: string;
  duration_sec: number;
  distance_m: number;
  ascent_m: number;
  calories: number;
  avg_speed_kmh: number;
  tss_score: number;
  performance_delta: number | null;
  season_tag: SeasonTag | null;
  synced_at: string;
}

export interface ActivityDetail extends ActivitySession {
  raw_json?: Record<string, unknown> | null;
  elevation: ElevationPoint[];
  intensity_zones: IntensityZones;
}

export interface DailySummary {
  date: string;
  steps: number;
  active_hours: number;
  calories: number;
  goal_completion_rate: number;
  daily_score: number;
  medium_intensity_min: number;
  high_intensity_min: number;
}

export interface DashboardSummary {
  days: number;
  daily_score: number;
  today_distance_km: number;
  calories: number;
  active_hours: number;
  weekly_load: WeeklyLoadPoint[];
  heatmap: HeatmapPoint[];
  goals: GoalProgress;
  last_rides: ActivitySession[];
  daily_summaries: DailySummary[];
}

export interface WeeklyLoadPoint {
  day: string;
  date: string;
  tss: number;
}

export interface HeatmapPoint {
  date: string;
  value: number;
}

export interface GoalProgress {
  steps: number;
  calories: number;
  active_hours: number;
}

export interface ElevationPoint {
  distance_km?: number;
  distance?: number;
  altitude?: number;
  elevation?: number;
  value?: number;
}

export interface IntensityZones {
  Z1?: number;
  Z2?: number;
  Z3?: number;
  Z4?: number;
  Z5?: number;
  [zone: string]: number | undefined;
}

export interface WeeklyLoadAnalyticsPoint {
  week: string;
  tss: number;
  distance_km: number;
}

export interface SeasonalMetric {
  sessions: number;
  avg_distance_km: number;
  avg_tss: number;
  avg_calories: number;
}

export interface SeasonalAnalytics {
  DRY_SEASON: SeasonalMetric;
  RAINY_SEASON: SeasonalMetric;
}

export interface GoalAttainmentPoint {
  month: string;
  goal_attainment_rate: number;
  daily_score: number;
}

export interface ReadinessComponents {
  load_balance: number;
  recovery: number;
  freshness: number;
  consistency: number;
  daily_activity: number;
}

export interface ReadinessMetrics {
  acwr: number | null;
  tss_3d: number;
  tss_7d: number;
  tss_14d: number;
  tss_28d: number;
  rides_14d: number;
  days_since_last_ride: number | null;
  last_hard_ride_days_ago: number | null;
  load_status: string;
}

export interface ReadinessSummary {
  score: number;
  label: 'Peak' | 'Ready' | 'Maintain' | 'Recover' | 'Rest' | string;
  recommendation: string;
  components: ReadinessComponents;
  metrics: ReadinessMetrics;
  signals: string[];
}

export interface HuaweiLoginResponse {
  auth_url: string;
  state: string;
}

export interface SyncTriggerResponse {
  status: string;
  sync_log_id: string;
}
