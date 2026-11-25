import { useEffect, useState, type FormEvent } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { ArrowLeft, Lock } from 'lucide-react';
import { useAdminAuth } from '../../admin/context/AdminAuthContext';

const LOGO_URL =
  'https://firebasestorage.googleapis.com/v0/b/prime-housing-72330.firebasestorage.app/o/logo.png?alt=media&token=1f4ff1d7-9db1-44dd-b7fb-92740bb7b1b7';

export function AdminLoginPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const redirectTo = (location.state as { from?: string } | null)?.from || '/admin';
  const { isAuthorized, loading: authLoading, authError, login } = useAdminAuth();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    document.title = 'Administrator Sign In — PRIME HOUSING';
    if (!authLoading && isAuthorized) {
      navigate(redirectTo, { replace: true });
    }
  }, [authLoading, isAuthorized, navigate, redirectTo]);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (submitting) return;
    setError('');
    setSubmitting(true);
    try {
      await login(email, password);
      navigate(redirectTo, { replace: true });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Authentication failed.');
    } finally {
      setSubmitting(false);
    }
  };

  const displayError = error || authError;

  return (
    <div className="min-h-screen bg-[#1D0816] flex flex-col justify-center px-4 py-12">
      <div className="w-full max-w-md mx-auto">
        <div className="mb-6">
          <Link
            to="/"
            className="inline-flex items-center gap-1.5 text-xs font-medium text-[#A3ABA6] hover:text-white transition-colors"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>Return to Public Website</span>
          </Link>
        </div>

        <div className="bg-white border border-[#EAE1E6] rounded-xl p-7 sm:p-8 shadow-2xl">
          <div className="flex items-center gap-2.5 mb-5">
            <img
              src={LOGO_URL}
              alt="PRIME HOUSING logo"
              className="h-9 w-auto object-contain shrink-0"
            />
            <span className="font-display text-lg font-semibold tracking-tight text-[#9B0B5E]">
              PRIME HOUSING
            </span>
          </div>

          <div className="flex items-center gap-2.5 text-[#9B0B5E] mb-4">
            <div className="p-2 rounded-lg bg-[#F7E8F1]">
              <Lock className="w-4 h-4" />
            </div>
            <span className="text-xs font-semibold tracking-wide text-[#9B0B5E]">
              Administrator Portal
            </span>
          </div>

          <h1 className="font-display text-2xl font-medium text-[#1C1F1E] mb-1.5">
            Administrator Sign In
          </h1>
          <p className="text-xs text-[#646B67] mb-6 leading-relaxed">
            Authorized personnel only. Public registration is disabled to protect landowner and buyer records.
          </p>

          {displayError && (
            <div className="mb-4 p-3 rounded-lg bg-red-50 border border-red-200 text-xs text-red-700">
              {displayError}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-medium text-[#3D4340] mb-1">
                Administrator Email
              </label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                autoComplete="email"
                placeholder="Enter administrator email"
                className="w-full px-3.5 py-2.5 text-sm border border-[#D7C8D1] rounded-lg focus:outline-none focus:border-[#9B0B5E]"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-[#3D4340] mb-1">
                Password
              </label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                autoComplete="current-password"
                placeholder="••••••••••••"
                className="w-full px-3.5 py-2.5 text-sm border border-[#D7C8D1] rounded-lg focus:outline-none focus:border-[#9B0B5E]"
              />
            </div>

            <button
              type="submit"
              disabled={submitting || authLoading}
              className="w-full py-2.5 px-4 text-sm font-medium text-white bg-[#9B0B5E] hover:bg-[#7A084A] disabled:opacity-60 rounded-lg transition-colors"
            >
              {submitting ? 'Verifying Credentials...' : 'Sign In to Admin Panel'}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
