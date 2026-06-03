import type { HeatmapPoint } from '../../types/health';

export function ActivityHeatmap({ data }: { data: HeatmapPoint[] }) {
  const cells = normalizeCells(data);

  return (
    <div className="rounded-3xl border border-white/10 bg-white/5 p-5">
      <div className="mb-5 flex items-end justify-between gap-4">
        <div>
          <h3 className="text-lg font-black text-white">Activity Heatmap</h3>
          <p className="text-sm text-slate-400">Last 52 weeks daily score</p>
        </div>
        <div className="hidden items-center gap-1 text-xs text-slate-400 sm:flex">
          Low <span className="h-3 w-3 rounded-sm bg-emerald-950" /> <span className="h-3 w-3 rounded-sm bg-emerald-800" /> <span className="h-3 w-3 rounded-sm bg-emerald-500" /> High
        </div>
      </div>
      <div className="grid grid-flow-col grid-rows-7 gap-1 overflow-x-auto pb-2">
        {cells.map((cell) => (
          <div key={cell.date} title={`${cell.date}: ${cell.value}`} className={`h-3 w-3 rounded-sm ${color(cell.value)}`} />
        ))}
      </div>
    </div>
  );
}

function normalizeCells(data: HeatmapPoint[]) {
  if (data.length >= 364) return data.slice(-364);
  const output = [...data];
  while (output.length < 364) {
    output.unshift({ date: `empty-${output.length}`, value: 0 });
  }
  return output;
}

function color(value: number) {
  if (value >= 80) return 'bg-emerald-400';
  if (value >= 60) return 'bg-emerald-600';
  if (value >= 30) return 'bg-emerald-800';
  return 'bg-slate-800';
}
