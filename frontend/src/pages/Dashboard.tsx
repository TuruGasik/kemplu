import { Activity, Bike, Flame, Timer } from 'lucide-react';
import { ActivityHeatmap } from '../components/charts/ActivityHeatmap';
import { WeeklyLoadChart } from '../components/charts/WeeklyLoadChart';
import { DailyScoreCard } from '../components/cards/DailyScoreCard';
import { GoalProgressCard } from '../components/cards/GoalProgressCard';
import { ReadinessCard } from '../components/cards/ReadinessCard';
import { SessionCard } from '../components/cards/SessionCard';
import { Navbar } from '../components/layout/Navbar';
import { Sidebar } from '../components/layout/Sidebar';
import { useDashboardData } from '../hooks/useDashboardData';
import { useHuaweiAuth } from '../hooks/useHuaweiAuth';

export function Dashboard() {
  const { logout } = useHuaweiAuth();
  const { data, error, isLoading } = useDashboardData(7);

  return (
    <main className="flex min-h-screen bg-slate-950 text-white">
      <Sidebar onLogout={logout} />
      <section className="min-w-0 flex-1">
        <Navbar title="Dashboard" />
        <div className="p-6 pb-28 lg:pb-6">
          {isLoading ? <StateCard text="Loading dashboard data..." /> : null}
          {error ? <StateCard text={error} tone="error" /> : null}
          {data ? (
            <div className="space-y-6">
              <ReadinessCard readiness={data.readiness} />

              <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
                <DailyScoreCard score={data.summary.daily_score} />
                <MetricCard icon={<Bike />} label="Today's Distance" value={data.summary.today_distance_km.toFixed(1)} unit="km" />
                <MetricCard icon={<Flame />} label="Calories" value={Math.round(data.summary.calories).toString()} unit="kcal" />
                <MetricCard icon={<Timer />} label="Active Hours" value={data.summary.active_hours.toFixed(1)} unit="hrs" />
              </div>

              <div className="grid gap-6 xl:grid-cols-[1.4fr_0.8fr]">
                <WeeklyLoadChart data={data.summary.weekly_load} />
                <GoalProgressCard goals={data.summary.goals} />
              </div>

              <ActivityHeatmap data={data.summary.heatmap} />

              <section>
                <div className="mb-4 flex items-center gap-2">
                  <Activity className="text-emerald-300" />
                  <h2 className="text-2xl font-black">Last 3 Rides</h2>
                </div>
                <div className="grid gap-4 lg:grid-cols-3">
                  {data.summary.last_rides.length ? data.summary.last_rides.map((ride) => <SessionCard key={ride.id} session={ride} />) : <StateCard text="No rides synced yet." />}
                </div>
              </section>
            </div>
          ) : null}
        </div>
      </section>
    </main>
  );
}

function MetricCard({ icon, label, value, unit }: { icon: React.ReactNode; label: string; value: string; unit: string }) {
  return (
    <div className="rounded-3xl border border-white/10 bg-white/5 p-6">
      <div className="text-emerald-300">{icon}</div>
      <p className="mt-5 text-sm font-bold uppercase tracking-widest text-slate-400">{label}</p>
      <div className="mt-2 flex items-end gap-2">
        <span className="text-4xl font-black">{value}</span>
        <span className="pb-1 text-slate-400">{unit}</span>
      </div>
    </div>
  );
}

function StateCard({ text, tone = 'default' }: { text: string; tone?: 'default' | 'error' }) {
  return <div className={`rounded-3xl border p-6 ${tone === 'error' ? 'border-red-400/30 bg-red-500/10 text-red-200' : 'border-white/10 bg-white/5 text-slate-300'}`}>{text}</div>;
}
