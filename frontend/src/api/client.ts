import type {
  ActivityDetail,
  ActivitySession,
  DashboardSummary,
  GoalAttainmentPoint,
  HuaweiLoginResponse,
  IntensityZones,
  ReadinessSummary,
  SeasonalAnalytics,
  SportType,
  SyncTriggerResponse,
  WeeklyLoadAnalyticsPoint,
} from '../types/health';
import { mockApi } from './mockData';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL ?? 'http://localhost:8000';
const USE_MOCKS = import.meta.env.VITE_USE_MOCKS === 'true';
const ENABLE_DEMO_MODE = import.meta.env.VITE_ENABLE_DEMO_MODE === 'true';
const SESSION_TOKEN_KEY = 'kemplu_session_token';
const DEMO_MODE_KEY = 'kemplu_demo_mode';

export const isMockMode = USE_MOCKS;
export const isDemoModeEnabled = ENABLE_DEMO_MODE || USE_MOCKS;
export const MOCK_SESSION_TOKEN = 'mock-session-token';

export class ApiError extends Error {
  constructor(
    message: string,
    public readonly status: number,
    public readonly payload?: unknown,
  ) {
    super(message);
  }
}

export const sessionStore = {
  getToken(): string | null {
    if (USE_MOCKS && !localStorage.getItem(SESSION_TOKEN_KEY)) {
      localStorage.setItem(SESSION_TOKEN_KEY, MOCK_SESSION_TOKEN);
    }
    return localStorage.getItem(SESSION_TOKEN_KEY);
  },
  setToken(token: string): void {
    localStorage.setItem(SESSION_TOKEN_KEY, token);
  },
  startDemoMode(): void {
    localStorage.setItem(SESSION_TOKEN_KEY, MOCK_SESSION_TOKEN);
    localStorage.setItem(DEMO_MODE_KEY, 'true');
  },
  stopDemoMode(): void {
    localStorage.removeItem(DEMO_MODE_KEY);
  },
  isDemoMode(): boolean {
    return localStorage.getItem(DEMO_MODE_KEY) === 'true';
  },
  clear(): void {
    localStorage.removeItem(SESSION_TOKEN_KEY);
    localStorage.removeItem(DEMO_MODE_KEY);
  },
};

function shouldUseMocks(): boolean {
  return USE_MOCKS || sessionStore.isDemoMode();
}

async function request<T>(path: string, options: RequestInit = {}): Promise<T> {
  const token = sessionStore.getToken();
  const headers = new Headers(options.headers);
  headers.set('Content-Type', 'application/json');
  if (token) {
    headers.set('Authorization', `Bearer ${token}`);
  }

  const response = await fetch(`${API_BASE_URL}${path}`, { ...options, headers, credentials: 'include' });
  if (!response.ok) {
    const payload = await safeJson(response);
    throw new ApiError(`Request failed with status ${response.status}`, response.status, payload);
  }
  if (response.status === 204) {
    return undefined as T;
  }
  return response.json() as Promise<T>;
}

async function safeJson(response: Response): Promise<unknown> {
  try {
    return await response.json();
  } catch {
    return null;
  }
}

function queryString(params: Record<string, string | number | undefined | null>): string {
  const search = new URLSearchParams();
  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== '') {
      search.set(key, String(value));
    }
  });
  const serialized = search.toString();
  return serialized ? `?${serialized}` : '';
}

export const apiClient = {
  auth: {
    login(): Promise<HuaweiLoginResponse> {
      sessionStore.stopDemoMode();
      if (shouldUseMocks()) return mockApi.auth.login();
      return request<HuaweiLoginResponse>('/api/auth/huawei/login');
    },
    async logout(): Promise<void> {
      if (shouldUseMocks()) {
        await mockApi.auth.logout();
        sessionStore.clear();
        return;
      }
      await request<void>('/api/auth/logout', { method: 'POST' });
      sessionStore.clear();
    },
  },
  dashboard: {
    // Use 7 for a short weekly view or 365 for long-range history.
    summary(days: 7 | 30 | 365 = 30): Promise<DashboardSummary> {
      if (shouldUseMocks()) return mockApi.dashboard.summary(days);
      return request<DashboardSummary>(`/api/dashboard/summary${queryString({ days })}`);
    },
  },
  rides: {
    list(params: { page?: number; limit?: number; sport_type?: SportType; start_date?: string; end_date?: string } = {}): Promise<ActivitySession[]> {
      if (shouldUseMocks()) return mockApi.rides.list(params);
      return request<ActivitySession[]>(`/api/rides${queryString(params)}`);
    },
    detail(activityId: string): Promise<ActivityDetail> {
      if (shouldUseMocks()) return mockApi.rides.detail(activityId);
      return request<ActivityDetail>(`/api/rides/${encodeURIComponent(activityId)}`);
    },
  },
  analytics: {
    weeklyLoad(weeks = 12): Promise<WeeklyLoadAnalyticsPoint[]> {
      if (shouldUseMocks()) return mockApi.analytics.weeklyLoad();
      return request<WeeklyLoadAnalyticsPoint[]>(`/api/analytics/weekly-load${queryString({ weeks })}`);
    },
    seasonal(year = new Date().getFullYear()): Promise<SeasonalAnalytics> {
      if (shouldUseMocks()) return mockApi.analytics.seasonal();
      return request<SeasonalAnalytics>(`/api/analytics/seasonal${queryString({ year })}`);
    },
    intensityDistribution(weeks = 4): Promise<IntensityZones> {
      if (shouldUseMocks()) return mockApi.analytics.intensityDistribution();
      return request<IntensityZones>(`/api/analytics/intensity-distribution${queryString({ weeks })}`);
    },
    goalAttainment(months = 6): Promise<GoalAttainmentPoint[]> {
      if (shouldUseMocks()) return mockApi.analytics.goalAttainment();
      return request<GoalAttainmentPoint[]>(`/api/analytics/goal-attainment${queryString({ months })}`);
    },
    readiness(): Promise<ReadinessSummary> {
      if (shouldUseMocks()) return mockApi.analytics.readiness();
      return request<ReadinessSummary>('/api/analytics/readiness');
    },
  },
  sync: {
    trigger(): Promise<SyncTriggerResponse> {
      if (shouldUseMocks()) return mockApi.sync.trigger();
      return request<SyncTriggerResponse>('/api/sync/trigger', { method: 'POST' });
    },
  },
};
