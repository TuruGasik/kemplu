export function DailyScoreCard({ score }: { score: number }) {
  return (
    <div className="rounded-3xl border border-emerald-400/20 bg-emerald-400/10 p-6">
      <p className="text-sm font-bold uppercase tracking-widest text-emerald-200">Daily Score</p>
      <div className="mt-4 flex items-end gap-2">
        <span className="text-5xl font-black text-white">{Math.round(score)}</span>
        <span className="pb-2 text-slate-300">/100</span>
      </div>
      <div className="mt-5 h-3 overflow-hidden rounded-full bg-slate-800">
        <div className="h-full rounded-full bg-emerald-300" style={{ width: `${Math.min(score, 100)}%` }} />
      </div>
    </div>
  );
}
