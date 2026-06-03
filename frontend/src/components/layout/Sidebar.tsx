import { BarChart3, Bike, Home, LogOut } from 'lucide-react';
import { NavLink } from 'react-router-dom';

export function Sidebar({ onLogout }: { onLogout: () => void }) {
  return (
    <>
      <aside className="hidden min-h-screen w-72 border-r border-white/10 bg-slate-950/80 p-6 lg:block">
        <div className="text-2xl font-black text-white">Kemplu</div>
        <nav className="mt-10 space-y-2">
          <Item to="/" icon={<Home size={18} />} label="Dashboard" />
          <Item to="/rides" icon={<Bike size={18} />} label="Ride History" />
          <Item to="/analytics" icon={<BarChart3 size={18} />} label="Analytics" />
        </nav>
        <button onClick={onLogout} className="mt-10 flex w-full items-center gap-3 rounded-2xl px-4 py-3 font-bold text-slate-400 hover:bg-white/10 hover:text-white" type="button">
          <LogOut size={18} /> Logout
        </button>
      </aside>

      <nav className="fixed inset-x-3 bottom-3 z-50 grid grid-cols-4 gap-1 rounded-[1.5rem] border border-white/10 bg-slate-950/95 p-2 shadow-2xl shadow-black/50 backdrop-blur lg:hidden">
        <MobileItem to="/" icon={<Home size={19} />} label="Home" />
        <MobileItem to="/rides" icon={<Bike size={19} />} label="Rides" />
        <MobileItem to="/analytics" icon={<BarChart3 size={19} />} label="Stats" />
        <button onClick={onLogout} className="flex flex-col items-center justify-center gap-1 rounded-2xl px-2 py-2 text-[0.65rem] font-black text-slate-400 hover:bg-white/10 hover:text-white" type="button">
          <LogOut size={19} /> Logout
        </button>
      </nav>
    </>
  );
}

function Item({ to, icon, label }: { to: string; icon: React.ReactNode; label: string }) {
  return (
    <NavLink to={to} className={({ isActive }) => `flex items-center gap-3 rounded-2xl px-4 py-3 font-bold ${isActive ? 'bg-emerald-400 text-slate-950' : 'text-slate-400 hover:bg-white/10 hover:text-white'}`}>
      {icon} {label}
    </NavLink>
  );
}

function MobileItem({ to, icon, label }: { to: string; icon: React.ReactNode; label: string }) {
  return (
    <NavLink to={to} end={to === '/'} className={({ isActive }) => `flex flex-col items-center justify-center gap-1 rounded-2xl px-2 py-2 text-[0.65rem] font-black ${isActive ? 'bg-emerald-400 text-slate-950' : 'text-slate-400 hover:bg-white/10 hover:text-white'}`}>
      {icon}
      <span>{label}</span>
    </NavLink>
  );
}
