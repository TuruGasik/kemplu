import { Activity, BarChart3, Bike, Gauge, HeartPulse, RefreshCcw } from 'lucide-react';
import type { ReadinessSummary } from '../../types/health';

const labelStyles: Record<string, string> = {
  Peak: 'border-lime-300/30 bg-lime-300/10 text-lime-200',
  Ready: 'border-emerald-300/30 bg-emerald-300/10 text-emerald-200',
  Maintain: 'border-cyan-300/30 bg-cyan-300/10 text-cyan-200',
  Recover: 'border-amber-300/30 bg-amber-300/10 text-amber-200',
  Rest: 'border-rose-300/30 bg-rose-300/10 text-rose-200',
};

export function ReadinessCard({ readiness }: { readiness: ReadinessSummary }) {
  const components = [
    { label: 'Load balance', value: readiness.components.load_balance, icon: <BarChart3 size={16} /> },
    { label: 'Recovery', value: readiness.components.recovery, icon: <HeartPulse size={16} /> },
    { label: 'Freshness', value: readiness.components.freshness, icon: <RefreshCcw size={16} /> },
    { label: 'Consistency', value: readiness.components.consistency, icon: <Bike size={16} /> },
    { label: 'Daily activity', value: readiness.components.daily_activity, icon: <Activity size={16} /> },
  ];

  return (
    <section className="rounded-[2rem] border border-white/10 bg-gradient-to-br from-emerald-400/10 via-white/5 to-cyan-400/10 p-6 shadow-2xl shadow-emerald-950/30">
      <div className="flex flex-col gap-6 xl:flex-row xl:items-start xl:justify-between">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-3">
            <p className="text-sm font-black uppercase tracking-[0.35em] text-emerald-300">Today's Cycling Readiness</p>
            <span className={`rounded-full border px-3 py-1 text-xs font-black ${labelStyles[readiness.label] ?? labelStyles.Maintain}`}>
              {readiness.label}
            </span>
          </div>
          <div className="mt-5 flex flex-wrap items-end gap-5">
            <div className="flex items-end gap-2">
              <span className="text-7xl font-black leading-none text-white">{readiness.score}</span>
              <span className="pb-2 text-xl font-bold text-slate-400">/100</span>
            </div>
            <div className="max-w-xl pb-2">
              <p className="text-lg font-bold text-white">{readiness.recommendation}</p>
              <p className="mt-2 text-sm text-slate-400">Based on existing Kemplu ride load, freshness, consistency, and daily activity data.</p>
            </div>
          </div>
        </div>

        <div className="grid min-w-fit grid-cols-2 gap-3 sm:grid-cols-4">
          <MiniMetric label="ACWR" value={readiness.metrics.acwr?.toFixed(2) ?? '—'} />
          <MiniMetric label="7D TSS" value={readiness.metrics.tss_7d.toFixed(0)} />
          <MiniMetric label="14D rides" value={String(readiness.metrics.rides_14d)} />
          <MiniMetric label="Load" value={formatStatus(readiness.metrics.load_status)} />
        </div>
      </div>

      <div className="mt-6 grid gap-4 lg:grid-cols-[1fr_0.9fr]">
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-5">
          {components.map((component) => (
            <ComponentBar key={component.label} {...component} />
          ))}
        </div>

        <div className="rounded-3xl border border-white/10 bg-slate-950/40 p-4">
          <div className="mb-3 flex items-center gap-2 text-sm font-black uppercase tracking-widest text-slate-400">
            <Gauge size={16} className="text-emerald-300" /> Why this score?
          </div>
          <ul className="space-y-2 text-sm text-slate-300">
            {readiness.signals.map((signal) => (
              <li key={signal} className="flex gap-2">
                <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-emerald-300" />
                <span>{signal}</span>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </section>
  );
}

function MiniMetric({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-white/10 bg-slate-950/50 p-4">
      <p className="text-[0.65rem] font-black uppercase tracking-widest text-slate-500">{label}</p>
      <p className="mt-2 text-xl font-black text-white">{value}</p>
    </div>
  );
}

function ComponentBar({ icon, label, value }: { icon: React.ReactNode; label: string; value: number }) {
  return (
    <div className="min-w-0 rounded-3xl border border-white/10 bg-slate-950/40 p-4">
      <div className="flex items-center justify-between gap-2">
        <div className="text-emerald-300">{icon}</div>
        <span className="text-lg font-black text-white">{Math.round(value)}</span>
      </div>
      <p className="mt-3 break-words text-[0.68rem] font-bold uppercase leading-relaxed tracking-[0.18em] text-slate-500">{label}</p>
      <div className="mt-3 h-2 overflow-hidden rounded-full bg-white/10">
        <div className="h-full rounded-full bg-emerald-300" style={{ width: `${Math.max(0, Math.min(100, value))}%` }} />
      </div>
    </div>
  );
}

function formatStatus(status: string) {
  return status.replace(/_/g, ' ');
}
