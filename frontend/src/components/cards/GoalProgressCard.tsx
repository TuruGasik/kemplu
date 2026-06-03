import type { GoalProgress } from '../../types/health';

export function GoalProgressCard({ goals }: { goals: GoalProgress }) {
  const items = [
    ['Steps', goals.steps],
    ['Calories', goals.calories],
    ['Active Time', goals.active_hours],
  ] as const;

  return (
    <div className="rounded-3xl border border-white/10 bg-white/5 p-6">
      <h3 className="text-lg font-black text-white">Goal Progress</h3>
      <div className="mt-5 space-y-4">
        {items.map(([label, value]) => (
          <div key={label}>
            <div className="mb-2 flex justify-between text-sm">
              <span className="text-slate-300">{label}</span>
              <span className="font-bold text-emerald-300">{Math.round(value * 100)}%</span>
            </div>
            <div className="h-2 rounded-full bg-slate-800">
              <div className="h-2 rounded-full bg-emerald-300" style={{ width: `${Math.min(value * 100, 100)}%` }} />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
