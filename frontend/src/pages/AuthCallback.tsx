import { useEffect } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { CheckCircle2, Loader2, XCircle } from 'lucide-react';
import { useHuaweiAuth } from '../hooks/useHuaweiAuth';

export function AuthCallback() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { completeCallback, error } = useHuaweiAuth();
  const token = searchParams.get('token');

  useEffect(() => {
    completeCallback(token);
    if (token) {
      const timeout = window.setTimeout(() => navigate('/', { replace: true }), 900);
      return () => window.clearTimeout(timeout);
    }
    return undefined;
  }, [completeCallback, navigate, token]);

  return (
    <main className="grid min-h-screen place-items-center bg-slate-950 px-6 text-white">
      <section className="w-full max-w-md rounded-3xl border border-white/10 bg-white/10 p-8 text-center shadow-2xl shadow-emerald-950/40 backdrop-blur-xl">
        {token ? (
          <>
            <CheckCircle2 className="mx-auto text-emerald-300" size={48} />
            <h1 className="mt-6 text-2xl font-black">Huawei Health connected</h1>
            <p className="mt-3 text-sm text-slate-300">Finalizing your Kemplu session and opening the dashboard.</p>
            <Loader2 className="mx-auto mt-6 animate-spin text-emerald-300" />
          </>
        ) : (
          <>
            <XCircle className="mx-auto text-red-300" size={48} />
            <h1 className="mt-6 text-2xl font-black">Connection failed</h1>
            <p className="mt-3 text-sm text-slate-300">{error ?? 'The callback did not include a valid session token.'}</p>
            <Link className="mt-6 inline-flex rounded-2xl bg-emerald-400 px-5 py-3 font-bold text-slate-950" to="/login">
              Back to login
            </Link>
          </>
        )}
      </section>
    </main>
  );
}
