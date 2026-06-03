import { Area, AreaChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import type { ElevationPoint } from '../../types/health';

export function ElevationChart({ data }: { data: ElevationPoint[] }) {
  const normalized = data.map((point, index) => ({
    distance_km: point.distance_km ?? point.distance ?? index,
    altitude: point.altitude ?? point.elevation ?? point.value ?? 0,
  }));

  return (
    <div className="h-80 rounded-3xl border border-white/10 bg-white/5 p-5">
      <h3 className="text-lg font-black text-white">Elevation Profile</h3>
      <p className="text-sm text-slate-400">Altitude over distance</p>
      <ResponsiveContainer width="100%" height="80%">
        <AreaChart data={normalized} margin={{ top: 24, right: 8, left: -24, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
          <XAxis dataKey="distance_km" stroke="#94a3b8" />
          <YAxis stroke="#94a3b8" />
          <Tooltip contentStyle={{ background: '#020617', border: '1px solid #1e293b', borderRadius: 16 }} />
          <Area type="monotone" dataKey="altitude" stroke="#34d399" fill="#34d39933" strokeWidth={3} />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}
