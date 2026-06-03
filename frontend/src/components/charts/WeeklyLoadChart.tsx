import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import type { WeeklyLoadPoint } from '../../types/health';

export function WeeklyLoadChart({ data }: { data: WeeklyLoadPoint[] }) {
  return (
    <div className="h-72 rounded-3xl border border-white/10 bg-white/5 p-5">
      <h3 className="text-lg font-black text-white">Weekly Training Load</h3>
      <p className="text-sm text-slate-400">TSS by day</p>
      <ResponsiveContainer width="100%" height="80%">
        <BarChart data={data} margin={{ top: 24, right: 8, left: -24, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
          <XAxis dataKey="day" stroke="#94a3b8" />
          <YAxis stroke="#94a3b8" />
          <Tooltip contentStyle={{ background: '#020617', border: '1px solid #1e293b', borderRadius: 16 }} />
          <Bar dataKey="tss" radius={[10, 10, 0, 0]} fill="#34d399" />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
