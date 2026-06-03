import { Bell, Search } from 'lucide-react';

export function Navbar({ title }: { title: string }) {
  return (
    <header className="flex flex-col gap-4 border-b border-white/10 bg-slate-950/70 px-6 py-5 backdrop-blur md:flex-row md:items-center md:justify-between">
      <div>
        <h1 className="text-3xl font-black text-white">{title}</h1>
      </div>
      <div className="flex items-center gap-3">
        <div className="hidden items-center gap-2 rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-slate-400 sm:flex">
          <Search size={18} /> Search rides
        </div>
        <button className="rounded-2xl border border-white/10 bg-white/5 p-3 text-slate-300" type="button">
          <Bell size={18} />
        </button>
      </div>
    </header>
  );
}
