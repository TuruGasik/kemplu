import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { ArrowLeft, Bike, Flame, Gauge, Mountain, Timer } from 'lucide-react';
import { apiClient } from '../api/client';
import { ElevationChart } from '../components/charts/ElevationChart';
import { IntensityBarChart } from '../components/charts/IntensityBarChart';
import { Navbar } from '../components/layout/Navbar';
import { Sidebar } from '../components/layout/Sidebar';
import { useHuaweiAuth } from '../hooks/useHuaweiAuth';
import type { ActivityDetail } from '../types/health';

export function RideDetail() {
  const { activityId } = useParams();
  const { logout } = useHuaweiAuth();
  const [ride, setRide] = useState<ActivityDetail | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!activityId) return;
    let ignore = false;
    apiClient.rides.detail(activityId)
      .then((response) => {
        if (!ignore) setRide(response);
      })
      .catch((err) => {
        if (!ignore) setError(err instanceof Error ? err.message : 'Failed to load ride detail');
      });
    return () => {
      ignore = true;
    };
  }, [activityId]);

  return (
    <main className="flex min-h-screen bg-slate-950 text-white">
      <Sidebar onLogout={logout} />
      <section className="min-w-0 flex-1">
        <Navbar title="Ride Detail" />
        <div className="space-y-6 p-6 pb-28 lg:pb-6">
          <Link to="/rides" className="inline-flex items-center gap-2 rounded-2xl border border-white/10 px-4 py-3 font-bold text-slate-300 hover:bg-white/10">
            <ArrowLeft size={18} /> Back to rides
          </Link>

          {error ? <State text={error} tone="error" /> : null}
          {!ride && !error ? <State text="Loading ride detail..." /> : null}

          {ride ? (
            <>
              <section className="rounded-[2rem] border border-white/10 bg-white/5 p-6">
                <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
                  <div>
                    <p className="text-sm font-bold uppercase tracking-[0.35em] text-emerald-300">{ride.activity_group ?? 'Cycling'} Session</p>
                    <h2 className="mt-3 text-4xl font-black">{new Date(ride.start_time).toLocaleString()}</h2>
                    <div className="mt-4 flex flex-wrap gap-3">
                      <Badge>{ride.activity_label ?? 'Cycling Session'}</Badge>
                      <Badge>{ride.season_tag ?? 'UNCLASSIFIED'}</Badge>
                      <Badge>{ride.performance_delta === null ? 'Baseline pending' : `${ride.performance_delta > 0 ? '+' : ''}${ride.performance_delta}% vs baseline`}</Badge>
                    </div>
                  </div>
                </div>
              </section>

              <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-6">
                <Metric icon={<Bike />} label="Distance" value={(ride.distance_m / 1000).toFixed(1)} unit="km" />
                <Metric icon={<Timer />} label="Duration" value={Math.round(ride.duration_sec / 60).toString()} unit="min" />
                <Metric icon={<Gauge />} label="Avg Speed" value={ride.avg_speed_kmh.toFixed(1)} unit="km/h" />
                <Metric icon={<Mountain />} label="Ascent" value={Math.round(ride.ascent_m).toString()} unit="m" />
                <Metric icon={<Flame />} label="Calories" value={Math.round(ride.calories).toString()} unit="kcal" />
                <Metric icon={<Gauge />} label="TSS" value={ride.tss_score.toFixed(0)} unit="pts" />
              </div>

              <div className="grid gap-6 xl:grid-cols-[1.3fr_0.7fr]">
                <ElevationChart data={ride.elevation} />
                <IntensityBarChart zones={ride.intensity_zones} title="Session Intensity" />
              </div>
            </>
          ) : null}
        </div>
      </section>
    </main>
  );
}

function Metric({ icon, label, value, unit }: { icon: React.ReactNode; label: string; value: string; unit: string }) {
  return (
    <div className="rounded-3xl border border-white/10 bg-white/5 p-5">
      <div className="text-emerald-300">{icon}</div>
      <p className="mt-4 text-xs font-bold uppercase tracking-widest text-slate-500">{label}</p>
      <p className="mt-2 text-3xl font-black">{value}<span className="ml-1 text-base text-slate-400">{unit}</span></p>
    </div>
  );
}

function Badge({ children }: { children: React.ReactNode }) {
  return <span className="rounded-full bg-emerald-400/10 px-4 py-2 text-sm font-black text-emerald-300">{children}</span>;
}

function State({ text, tone = 'default' }: { text: string; tone?: 'default' | 'error' }) {
  return <div className={`rounded-3xl border p-6 ${tone === 'error' ? 'border-red-400/30 bg-red-500/10 text-red-200' : 'border-white/10 bg-white/5 text-slate-300'}`}>{text}</div>;
}
