import { useEffect, useMemo, useState } from 'react';
import { CalendarDays, Loader2 } from 'lucide-react';
import { apiClient } from '../api/client';
import { SessionCard } from '../components/cards/SessionCard';
import { Navbar } from '../components/layout/Navbar';
import { Sidebar } from '../components/layout/Sidebar';
import { useHuaweiAuth } from '../hooks/useHuaweiAuth';
import type { ActivitySession } from '../types/health';

export function RideHistory() {
  const { logout } = useHuaweiAuth();
  const [rides, setRides] = useState<ActivitySession[]>([]);
  const [page, setPage] = useState(1);
  const [month, setMonth] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const range = useMemo(() => monthToRange(month), [month]);

  useEffect(() => {
    let ignore = false;
    async function load() {
      setIsLoading(true);
      setError(null);
      try {
        const response = await apiClient.rides.list({ page, limit: 20, sport_type: 'cycling', ...range });
        if (!ignore) {
          setRides((current) => (page === 1 ? response : [...current, ...response]));
        }
      } catch (err) {
        if (!ignore) setError(err instanceof Error ? err.message : 'Failed to load rides');
      } finally {
        if (!ignore) setIsLoading(false);
      }
    }
    load();
    return () => {
      ignore = true;
    };
  }, [page, range]);

  function handleMonthChange(value: string) {
    setMonth(value);
    setPage(1);
  }

  return (
    <main className="flex min-h-screen bg-slate-950 text-white">
      <Sidebar onLogout={logout} />
      <section className="min-w-0 flex-1">
        <Navbar title="Ride History" />
        <div className="space-y-6 p-6 pb-28 lg:pb-6">
          <div className="flex flex-col gap-4 rounded-3xl border border-white/10 bg-white/5 p-5 md:flex-row md:items-center md:justify-between">
            <div>
              <h2 className="text-2xl font-black">Cycling Sessions</h2>
              <p className="mt-1 text-sm text-slate-400">Filter by month and paginate through synced Huawei activity records.</p>
            </div>
            <label className="flex items-center gap-3 rounded-2xl border border-white/10 bg-slate-950 px-4 py-3 text-slate-300">
              <CalendarDays size={18} />
              <input className="bg-transparent outline-none" type="month" value={month} onChange={(event) => handleMonthChange(event.target.value)} />
            </label>
          </div>

          {error ? <State text={error} tone="error" /> : null}
          <div className="grid gap-4 xl:grid-cols-2">
            {rides.map((ride) => (
              <SessionCard key={ride.id} session={ride} />
            ))}
          </div>
          {!rides.length && !isLoading ? <State text="No cycling sessions found for this filter." /> : null}

          <div className="flex justify-center">
            <button disabled={isLoading} onClick={() => setPage((current) => current + 1)} className="rounded-2xl bg-emerald-400 px-6 py-3 font-black text-slate-950 disabled:opacity-60" type="button">
              {isLoading ? <span className="inline-flex items-center gap-2"><Loader2 className="animate-spin" size={18} /> Loading</span> : 'Load more'}
            </button>
          </div>
        </div>
      </section>
    </main>
  );
}

function monthToRange(month: string) {
  if (!month) return {};
  const [year, monthIndex] = month.split('-').map(Number);
  const start = new Date(Date.UTC(year, monthIndex - 1, 1));
  const end = new Date(Date.UTC(year, monthIndex, 0, 23, 59, 59));
  return { start_date: start.toISOString(), end_date: end.toISOString() };
}

function State({ text, tone = 'default' }: { text: string; tone?: 'default' | 'error' }) {
  return <div className={`rounded-3xl border p-6 ${tone === 'error' ? 'border-red-400/30 bg-red-500/10 text-red-200' : 'border-white/10 bg-white/5 text-slate-300'}`}>{text}</div>;
}
