import { Activity, ArrowRight, Bike, ShieldCheck } from 'lucide-react';
import { Link, Navigate, useNavigate } from 'react-router-dom';
import { isDemoModeEnabled } from '../api/client';
import { useHuaweiAuth } from '../hooks/useHuaweiAuth';

export function Login() {
  const navigate = useNavigate();
  const { connect, error, isAuthenticated, isLoading, startDemoSession } = useHuaweiAuth();

  if (isAuthenticated) {
    return <Navigate to="/" replace />;
  }

  return (
    <main className="relative min-h-screen overflow-hidden bg-slate-950 text-white">
      <div className="absolute left-1/2 top-0 h-[36rem] w-[36rem] -translate-x-1/2 rounded-full bg-emerald-500/20 blur-3xl" />
      <div className="absolute bottom-0 right-0 h-[28rem] w-[28rem] rounded-full bg-cyan-500/10 blur-3xl" />

      <section className="relative mx-auto grid min-h-screen max-w-6xl items-center gap-12 px-6 py-12 lg:grid-cols-[1.1fr_0.9fr]">
        <div>
          <div className="inline-flex items-center gap-2 rounded-full border border-emerald-400/30 bg-emerald-400/10 px-4 py-2 text-sm font-semibold text-emerald-200">
            <Bike size={16} /> Cycling Performance Dashboard
          </div>
          <h1 className="mt-8 text-5xl font-black tracking-tight text-white md:text-7xl">
            Kemplu cycling analytics, built for performance.
          </h1>
          <p className="mt-6 max-w-2xl text-lg leading-8 text-slate-300">
            Connect HUAWEI Health to sync rides, elevation, training load, intensity, and seasonal performance trends.
          </p>

          <div className="mt-10 grid gap-4 sm:grid-cols-3">
            <Feature icon={<Activity size={20} />} title="Training Load" />
            <Feature icon={<Bike size={20} />} title="Ride Trends" />
            <Feature icon={<ShieldCheck size={20} />} title="Secure OAuth" />
          </div>
        </div>

        <div className="rounded-[2rem] border border-white/10 bg-white/10 p-8 shadow-2xl shadow-emerald-950/40 backdrop-blur-xl">
          <div className="rounded-3xl bg-slate-950/80 p-8">
            <p className="text-sm font-semibold uppercase tracking-[0.35em] text-emerald-300">Get Started</p>
            <h2 className="mt-4 text-3xl font-black">Connect your account</h2>
            <p className="mt-3 text-sm leading-6 text-slate-400">
              You will be redirected to HUAWEI ID to authorize Health Kit scopes. Kemplu stores encrypted session tokens locally and API tokens in Redis.
            </p>

            {error ? (
              <div className="mt-6 rounded-2xl border border-red-400/30 bg-red-500/10 p-4 text-sm text-red-200">{error}</div>
            ) : null}

            <button
              type="button"
              onClick={connect}
              disabled={isLoading}
              className="mt-8 flex w-full items-center justify-center gap-3 rounded-2xl bg-emerald-400 px-6 py-4 text-base font-black text-slate-950 transition hover:bg-emerald-300 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {isLoading ? 'Connecting...' : 'Connect with HUAWEI Health'}
              <ArrowRight size={20} />
            </button>

            {isDemoModeEnabled ? (
              <div className="mt-4 rounded-2xl border border-cyan-300/20 bg-cyan-300/10 p-4">
                <p className="text-sm font-black text-cyan-200">Explore with sample cycling data</p>
                <p className="mt-2 text-xs leading-5 text-slate-400">
                  Try Kemplu with sample Huawei cycling sessions, analytics, and dashboard data without connecting an account.
                </p>
                <button
                  type="button"
                  onClick={() => {
                    startDemoSession();
                    navigate('/', { replace: true });
                  }}
                  className="mt-4 flex w-full items-center justify-center gap-3 rounded-2xl border border-cyan-300/30 bg-cyan-300/10 px-6 py-4 text-base font-black text-cyan-100 transition hover:bg-cyan-300/20"
                >
                  Continue in Mock Demo Mode
                  <ArrowRight size={20} />
                </button>
              </div>
            ) : null}

            <p className="mt-6 text-center text-xs leading-5 text-slate-500">
              By continuing, you agree to the{' '}
              <Link to="/terms-of-service" className="font-bold text-emerald-300 hover:text-emerald-200">User Agreement</Link>
              {' '}and acknowledge the{' '}
              <Link to="/privacy-policy" className="font-bold text-emerald-300 hover:text-emerald-200">Privacy Policy</Link>.
            </p>
          </div>
        </div>
      </section>
    </main>
  );
}

function Feature({ icon, title }: { icon: React.ReactNode; title: string }) {
  return (
    <div className="rounded-2xl border border-white/10 bg-white/5 p-4 text-sm font-bold text-slate-200">
      <div className="mb-3 text-emerald-300">{icon}</div>
      {title}
    </div>
  );
}
