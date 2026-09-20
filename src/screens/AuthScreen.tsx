import { useState } from 'react';
import { Loader2, Mail, Lock, User, MapPin, AlertCircle, CheckCircle2 } from 'lucide-react';
import { useAuth } from '@/lib/auth';

type Mode = 'signin' | 'signup' | 'reset';

interface AuthScreenProps {
  /** Shown when a guest hit a sign-in-required action, so we can explain why. */
  reason?: string | null;
  /** Guest browsing is optional - omit to force sign-in (e.g. mid-session upgrade). */
  allowGuest?: boolean;
  onDismiss?: () => void;
}

export default function AuthScreen({ reason, allowGuest = true, onDismiss }: AuthScreenProps) {
  const { signIn, signUp, signInWithGoogle, resetPassword, continueAsGuest } = useAuth();
  const [mode, setMode] = useState<Mode>('signin');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [guestLoading, setGuestLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [resetSent, setResetSent] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (mode === 'reset') {
      if (!email.trim()) {
        setError('Enter your email first.');
        return;
      }
      setSubmitting(true);
      try {
        await resetPassword(email.trim());
        setResetSent(true);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to send reset email.');
      } finally {
        setSubmitting(false);
      }
      return;
    }

    if (!email.trim() || !password) {
      setError('Enter your email and password.');
      return;
    }
    if (mode === 'signup' && password.length < 6) {
      setError('Password should be at least 6 characters.');
      return;
    }

    setSubmitting(true);
    try {
      if (mode === 'signup') {
        await signUp(email.trim(), password, displayName);
      } else {
        await signIn(email.trim(), password);
      }
      // onAuthStateChanged in AuthProvider takes it from here.
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleGoogle = async () => {
    setError(null);
    setGoogleLoading(true);
    try {
      await signInWithGoogle();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Google sign-in failed.');
    } finally {
      setGoogleLoading(false);
    }
  };

  const handleGuest = async () => {
    setError(null);
    setGuestLoading(true);
    try {
      await continueAsGuest();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to start guest session.');
    } finally {
      setGuestLoading(false);
    }
  };

  return (
    <div className="h-full overflow-y-auto bg-white flex flex-col">
      <div className="flex-1 flex flex-col justify-center px-6 py-10 max-w-sm w-full mx-auto">
        <div className="flex flex-col items-center mb-8">
          <div className="w-14 h-14 rounded-2xl bg-slate-900 flex items-center justify-center mb-3">
            <MapPin size={26} className="text-white" />
          </div>
          <h1 className="text-xl font-bold text-slate-900">LocalFind</h1>
          {reason ? (
            <p className="text-sm text-slate-500 mt-2 text-center">{reason}</p>
          ) : (
            <p className="text-sm text-slate-500 mt-1">Discover local. Shop smart.</p>
          )}
        </div>

        {mode === 'reset' && resetSent ? (
          <div className="bg-emerald-50 text-emerald-700 rounded-2xl p-4 text-sm flex items-start gap-2">
            <CheckCircle2 size={18} className="flex-shrink-0 mt-0.5" />
            <div>
              Password reset email sent to {email}. Check your inbox.
              <button
                type="button"
                onClick={() => {
                  setMode('signin');
                  setResetSent(false);
                }}
                className="block mt-2 font-semibold underline"
              >
                Back to sign in
              </button>
            </div>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-3">
            {mode === 'signup' && (
              <div className="relative">
                <User size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type="text"
                  value={displayName}
                  onChange={(e) => setDisplayName(e.target.value)}
                  placeholder="Your name"
                  autoComplete="name"
                  className="w-full pl-10 pr-3.5 py-3 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-slate-900"
                />
              </div>
            )}

            <div className="relative">
              <Mail size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="Email"
                autoComplete="email"
                className="w-full pl-10 pr-3.5 py-3 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-slate-900"
              />
            </div>

            {mode !== 'reset' && (
              <div className="relative">
                <Lock size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Password"
                  autoComplete={mode === 'signup' ? 'new-password' : 'current-password'}
                  className="w-full pl-10 pr-3.5 py-3 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-slate-900"
                />
              </div>
            )}

            {error && (
              <div className="bg-red-50 text-red-600 text-sm rounded-xl p-3 flex items-start gap-2">
                <AlertCircle size={16} className="flex-shrink-0 mt-0.5" />
                {error}
              </div>
            )}

            {mode === 'signin' && (
              <button
                type="button"
                onClick={() => {
                  setMode('reset');
                  setError(null);
                }}
                className="text-xs text-slate-500 hover:text-slate-700"
              >
                Forgot password?
              </button>
            )}

            <button
              type="submit"
              disabled={submitting}
              className="w-full py-3.5 rounded-xl bg-slate-900 text-white font-semibold text-sm hover:bg-slate-800 active:scale-[0.98] transition-all disabled:opacity-50 flex items-center justify-center gap-2"
            >
              {submitting && <Loader2 size={16} className="animate-spin" />}
              {mode === 'signup' ? 'Create account' : mode === 'reset' ? 'Send reset email' : 'Sign in'}
            </button>
          </form>
        )}

        {mode !== 'reset' && !resetSent && (
          <>
            <div className="flex items-center gap-3 my-5">
              <div className="h-px bg-slate-100 flex-1" />
              <span className="text-xs text-slate-400">or</span>
              <div className="h-px bg-slate-100 flex-1" />
            </div>

            <button
              type="button"
              onClick={handleGoogle}
              disabled={googleLoading}
              className="w-full py-3 rounded-xl border border-slate-200 text-sm font-medium text-slate-700 hover:bg-slate-50 active:scale-[0.98] transition-all disabled:opacity-50 flex items-center justify-center gap-2"
            >
              {googleLoading ? (
                <Loader2 size={16} className="animate-spin" />
              ) : (
                <GoogleIcon />
              )}
              Continue with Google
            </button>

            {allowGuest && (
              <button
                type="button"
                onClick={handleGuest}
                disabled={guestLoading}
                className="w-full mt-3 py-3 rounded-xl text-sm font-medium text-slate-500 hover:bg-slate-50 active:scale-[0.98] transition-all disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {guestLoading && <Loader2 size={16} className="animate-spin" />}
                Browse as guest
              </button>
            )}

            {onDismiss && (
              <button
                type="button"
                onClick={onDismiss}
                className="w-full mt-1 py-2 text-xs text-slate-400 hover:text-slate-600"
              >
                Not now
              </button>
            )}

            <p className="text-center text-sm text-slate-500 mt-6">
              {mode === 'signup' ? 'Already have an account?' : "Don't have an account?"}{' '}
              <button
                type="button"
                onClick={() => {
                  setMode(mode === 'signup' ? 'signin' : 'signup');
                  setError(null);
                }}
                className="font-semibold text-slate-900 hover:underline"
              >
                {mode === 'signup' ? 'Sign in' : 'Sign up'}
              </button>
            </p>
          </>
        )}
      </div>
    </div>
  );
}

function GoogleIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 48 48" aria-hidden="true">
      <path
        fill="#FFC107"
        d="M43.6 20.5H42V20H24v8h11.3c-1.6 4.7-6.1 8-11.3 8-6.6 0-12-5.4-12-12s5.4-12 12-12c3.1 0 5.9 1.2 8 3.1l5.7-5.7C34.6 6 29.6 4 24 4 12.9 4 4 12.9 4 24s8.9 20 20 20 20-8.9 20-20c0-1.2-.1-2.4-.4-3.5z"
      />
      <path
        fill="#FF3D00"
        d="M6.3 14.7l6.6 4.8C14.6 15.9 18.9 13 24 13c3.1 0 5.9 1.2 8 3.1l5.7-5.7C34.6 6 29.6 4 24 4c-7.4 0-13.8 4.1-17.1 10.1z"
      />
      <path
        fill="#4CAF50"
        d="M24 44c5.5 0 10.4-1.9 14.3-5.1l-6.6-5.6c-2 1.5-4.7 2.6-7.7 2.6-5.2 0-9.6-3.3-11.3-8l-6.6 5.1C9.9 39.9 16.4 44 24 44z"
      />
      <path
        fill="#1976D2"
        d="M43.6 20.5H42V20H24v8h11.3c-.8 2.3-2.2 4.3-4.1 5.7l6.6 5.6C41.8 36 44 30.7 44 24c0-1.2-.1-2.4-.4-3.5z"
      />
    </svg>
  );
}
