import { Link } from 'react-router-dom';
import type { ActivitySession } from '../../types/health';

export function SessionCard({ session }: { session: ActivitySession }) {
  return (
    <Link to={`/rides/${session.activity_id}`} className="block rounded-3xl border border-white/10 bg-white/5 p-5 transition hover:border-emerald-300/50 hover:bg-white/10">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-sm text-slate-400">{new Date(session.start_time).toLocaleDateString()}</p>
          <h3 className="mt-1 text-lg font-black text-white">{session.activity_label ?? 'Cycling Session'}</h3>
          <p className="mt-1 text-xs font-bold uppercase tracking-widest text-slate-500">{session.activity_group ?? 'cycling'}</p>
        </div>
        <span className="rounded-full bg-emerald-400/10 px-3 py-1 text-xs font-black text-emerald-300">
          {session.performance_delta === null ? 'Baseline' : `${session.performance_delta > 0 ? '+' : ''}${session.performance_delta}%`}
        </span>
      </div>
      <div className="mt-5 grid grid-cols-3 gap-3 text-sm">
        <Metric label="Distance" value={`${(session.distance_m / 1000).toFixed(1)} km`} />
        <Metric label="Duration" value={`${Math.round(session.duration_sec / 60)} min`} />
        <Metric label="Ascent" value={`${Math.round(session.ascent_m)} m`} />
      </div>
    </Link>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-slate-500">{label}</p>
      <p className="font-black text-slate-100">{value}</p>
    </div>
  );
}
