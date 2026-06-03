import { useEffect, useState } from 'react';
import { apiClient } from '../api/client';
import type { DashboardSummary, ReadinessSummary } from '../types/health';

interface DashboardDataState {
  summary: DashboardSummary;
  readiness: ReadinessSummary;
}

// Use 7 for a short weekly view or 365 for long-range history.
export function useDashboardData(days: 7 | 30 | 365 = 30) {
  const [data, setData] = useState<DashboardDataState | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let ignore = false;

    async function load() {
      setIsLoading(true);
      setError(null);
      try {
        const [summary, readiness] = await Promise.all([
          apiClient.dashboard.summary(days),
          apiClient.analytics.readiness(),
        ]);
        if (!ignore) {
          setData({ summary, readiness });
        }
      } catch (err) {
        if (!ignore) {
          setError(err instanceof Error ? err.message : 'Failed to load dashboard data');
        }
      } finally {
        if (!ignore) {
          setIsLoading(false);
        }
      }
    }

    load();
    return () => {
      ignore = true;
    };
  }, [days]);

  return { data, isLoading, error };
}
