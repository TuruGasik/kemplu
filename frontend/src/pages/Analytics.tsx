import { useEffect, useMemo, useState } from 'react';
import { CloudRain, Flame, Loader2, Mountain, Target } from 'lucide-react';
import { apiClient } from '../api/client';
import { IntensityBarChart } from '../components/charts/IntensityBarChart';
import { TrendLineChart } from '../components/charts/TrendLineChart';
import { Navbar } from '../components/layout/Navbar';
import { Sidebar } from '../components/layout/Sidebar';
import { useHuaweiAuth } from '../hooks/useHuaweiAuth';
import type { GoalAttainmentPoint, IntensityZones, SeasonalAnalytics, WeeklyLoadAnalyticsPoint } from '../types/health';

export function Analytics() {
  const { logout } = useHuaweiAuth();
  const [weeklyLoad, setWeeklyLoad] = useState<WeeklyLoadAnalyticsPoint[]>([]);
  const [seasonal, setSeasonal] = useState<SeasonalAnalytics | null>(null);
  const [intensity, setIntensity] = useState<IntensityZones>({});
  const [goalAttainment, setGoalAttainment] = useState<GoalAttainmentPoint[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let ignore = false;
    async function load() {
      setIsLoading(true);
      setError(null);
      try {
        const [weeklyResponse, seasonalResponse, intensityResponse, goalResponse] = await Promise.all([
          apiClient.analytics.weeklyLoad(12),
          apiClient.analytics.seasonal(new Date().getFullYear()),
          apiClient.analytics.intensityDistribution(12),
          apiClient.analytics.goalAttainment(6),
        ]);
        if (!ignore) {
          setWeeklyLoad(weeklyResponse);
          setSeasonal(seasonalResponse);
          setIntensity(intensityResponse);
          setGoalAttainment(goalResponse);
        }
      } catch (err) {
        if (!ignore) setError(err instanceof Error ? err.message : 'Failed to load analytics');
      } finally {
        if (!ignore) setIsLoading(false);
      }
    }
    load();
    return () => {
      ignore = true;
    };
  }, []);

  const monthlyTrend = useMemo(() => buildMonthlyTrend(weeklyLoad, goalAttainment), [weeklyLoad, goalAttainment]);
  const sportAbilityTrend = useMemo(() => buildSportAbilityTrend(goalAttainment), [goalAttainment]);

  return (
    <main className="flex min-h-screen bg-slate-950 text-white">
      <Sidebar onLogout={logout} />
      <section className="min-w-0 flex-1">
        <Navbar title="Analytics" />
        <div className="space-y-6 p-6 pb-28 lg:pb-6">
          {isLoading ? <State text="Loading analytics..." icon={<Loader2 className="animate-spin" />} /> : null}
          {error ? <State text={error} tone="error" /> : null}

          <section className="grid gap-4 lg:grid-cols-3">
            <HeroMetric icon={<Flame />} label="12-week TSS" value={sum(weeklyLoad, (item) => item.tss).toFixed(0)} />
            <HeroMetric icon={<Target />} label="Goal attainment" value={`${Math.round(avg(goalAttainment.map((item) => item.goal_attainment_rate)) * 100)}%`} />
            <HeroMetric icon={<Mountain />} label="Distance" value={`${sum(weeklyLoad, (item) => item.distance_km).toFixed(0)} km`} />
          </section>

          <section>
            <div className="mb-4">
              <h2 className="text-2xl font-black">Monthly distance, goal, and TSS trend</h2>
              <p className="text-sm text-slate-400">Derived from weekly load and goal attainment windows.</p>
            </div>
            <TrendLineChart
              data={monthlyTrend}
              xKey="month"
              lines={[
                { key: 'distance_km', color: '#34d399', name: 'Distance km' },
                { key: 'tss', color: '#22d3ee', name: 'TSS' },
                { key: 'goal_score', color: '#fbbf24', name: 'Goal score' },
              ]}
            />
          </section>

          <section className="grid gap-6 xl:grid-cols-2">
            <SeasonalComparison seasonal={seasonal} />
            <IntensityBarChart zones={intensity} title="Weekly Z3-Z5 Volume" />
          </section>

          <section className="grid gap-6 xl:grid-cols-2">
            <div>
              <div className="mb-4">
                <h2 className="text-2xl font-black">Sport Ability Trend</h2>
                <p className="text-sm text-slate-400">Index proxy based on monthly goal score.</p>
              </div>
              <TrendLineChart data={sportAbilityTrend} xKey="month" lines={[{ key: 'ability_index', color: '#a78bfa', name: 'Ability index' }]} />
            </div>
            <div>
              <div className="mb-4">
                <h2 className="text-2xl font-black">Goal Attainment Rate</h2>
                <p className="text-sm text-slate-400">Monthly average goal completion.</p>
              </div>
              <TrendLineChart data={goalAttainment.map((item) => ({ ...item }))} xKey="month" lines={[{ key: 'goal_attainment_rate', color: '#34d399', name: 'Goal attainment' }]} />
            </div>
          </section>
        </div>
      </section>
    </main>
  );
}

function SeasonalComparison({ seasonal }: { seasonal: SeasonalAnalytics | null }) {
  const dry = seasonal?.DRY_SEASON ?? { sessions: 0, avg_distance_km: 0, avg_tss: 0, avg_calories: 0 };
  const rainy = seasonal?.RAINY_SEASON ?? { sessions: 0, avg_distance_km: 0, avg_tss: 0, avg_calories: 0 };

  return (
    <div className="rounded-3xl border border-white/10 bg-white/5 p-6">
      <h3 className="text-lg font-black">Seasonal Comparison</h3>
      <p className="text-sm text-slate-400">Dry vs rainy season averages</p>
      <div className="mt-6 grid gap-4 sm:grid-cols-2">
        <SeasonCard icon={<Mountain />} title="Dry Season" data={dry} color="emerald" />
        <SeasonCard icon={<CloudRain />} title="Rainy Season" data={rainy} color="cyan" />
      </div>
    </div>
  );
}

function SeasonCard({ icon, title, data, color }: { icon: React.ReactNode; title: string; data: { sessions: number; avg_distance_km: number; avg_tss: number; avg_calories: number }; color: 'emerald' | 'cyan' }) {
  const colorClass = color === 'emerald' ? 'text-emerald-300 bg-emerald-400/10' : 'text-cyan-300 bg-cyan-400/10';
  return (
    <div className="rounded-3xl border border-white/10 bg-slate-950/60 p-5">
      <div className={`inline-flex rounded-2xl p-3 ${colorClass}`}>{icon}</div>
      <h4 className="mt-4 text-xl font-black">{title}</h4>
      <div className="mt-4 space-y-2 text-sm text-slate-300">
        <Row label="Sessions" value={data.sessions.toFixed(0)} />
        <Row label="Avg distance" value={`${data.avg_distance_km.toFixed(1)} km`} />
        <Row label="Avg TSS" value={data.avg_tss.toFixed(0)} />
        <Row label="Avg calories" value={`${data.avg_calories.toFixed(0)} kcal`} />
      </div>
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between gap-4">
      <span className="text-slate-500">{label}</span>
      <span className="font-bold text-slate-100">{value}</span>
    </div>
  );
}

function HeroMetric({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return (
    <div className="rounded-3xl border border-white/10 bg-white/5 p-6">
      <div className="text-emerald-300">{icon}</div>
      <p className="mt-5 text-sm font-bold uppercase tracking-widest text-slate-400">{label}</p>
      <p className="mt-2 text-4xl font-black">{value}</p>
    </div>
  );
}

function State({ text, icon, tone = 'default' }: { text: string; icon?: React.ReactNode; tone?: 'default' | 'error' }) {
  return (
    <div className={`flex items-center gap-3 rounded-3xl border p-6 ${tone === 'error' ? 'border-red-400/30 bg-red-500/10 text-red-200' : 'border-white/10 bg-white/5 text-slate-300'}`}>
      {icon} {text}
    </div>
  );
}

function buildMonthlyTrend(weeklyLoad: WeeklyLoadAnalyticsPoint[], goals: GoalAttainmentPoint[]) {
  const byMonth = new Map<string, { month: string; distance_km: number; tss: number; goal_score: number }>();
  weeklyLoad.forEach((item) => {
    const month = item.week.slice(0, 7);
    const current = byMonth.get(month) ?? { month, distance_km: 0, tss: 0, goal_score: 0 };
    current.distance_km += item.distance_km;
    current.tss += item.tss;
    byMonth.set(month, current);
  });
  goals.forEach((item) => {
    const month = item.month.slice(0, 7);
    const current = byMonth.get(month) ?? { month, distance_km: 0, tss: 0, goal_score: 0 };
    current.goal_score = item.daily_score;
    byMonth.set(month, current);
  });
  return [...byMonth.values()].sort((a, b) => a.month.localeCompare(b.month));
}

function buildSportAbilityTrend(goals: GoalAttainmentPoint[]) {
  return goals.map((item, index) => ({ month: item.month.slice(0, 7), ability_index: Math.round(60 + item.goal_attainment_rate * 30 + index) }));
}

function sum<T>(rows: T[], selector: (row: T) => number) {
  return rows.reduce((total, row) => total + selector(row), 0);
}

function avg(values: number[]) {
  if (!values.length) return 0;
  return values.reduce((total, value) => total + value, 0) / values.length;
}
