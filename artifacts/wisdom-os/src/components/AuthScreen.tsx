import { FormEvent, useState } from 'react';
import { AlertCircle, ArrowRight, Loader2, LockKeyhole } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';

export default function AuthScreen({
  bootstrapError,
  onRetryBootstrap,
}: {
  bootstrapError?: string | null;
  onRetryBootstrap?: () => void;
}) {
  const { status, signIn, signUp } = useAuth();
  const [mode, setMode] = useState<'sign-in' | 'sign-up'>('sign-in');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const configured = status !== 'unconfigured';
  const isBootstrapFailure = status === 'bootstrap-error';

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError(null);
    setMessage(null);

    if (password.length < 6) {
      setError('Use a password with at least 6 characters.');
      return;
    }

    setSubmitting(true);
    const result =
      mode === 'sign-in'
        ? await signIn(email.trim(), password)
        : await signUp(email.trim(), password);
    setSubmitting(false);

    if (result.error) {
      setError(result.error);
      return;
    }

    if (mode === 'sign-up') {
      setMessage(
        'Your account was created. Check your email if confirmation is required, then sign in.',
      );
      setMode('sign-in');
      setPassword('');
    }
  };

  return (
    <main className="min-h-screen bg-ink-950 px-5 py-12 text-ink-100">
      <div className="mx-auto flex min-h-[calc(100vh-6rem)] max-w-md items-center">
        <section className="w-full">
          <div className="mb-8">
            <p className="mb-3 text-xs font-semibold uppercase tracking-[0.24em] text-accent-400">
              WISDOM OS
            </p>
            <h1 className="text-3xl font-bold tracking-tight text-ink-50">
              {configured ? 'Make space for what matters.' : 'Connect your workspace.'}
            </h1>
            <p className="mt-3 max-w-sm text-sm leading-6 text-ink-400">
              {configured
                ? 'Sign in to prepare your private Wisdom OS workspace.'
                : 'Supabase authentication is ready in the app, but its public browser configuration is not set yet.'}
            </p>
          </div>

          {!configured ? (
            <div className="rounded-3xl border border-ink-700 bg-ink-900 p-5">
              <div className="mb-4 flex items-start gap-3">
                <AlertCircle className="mt-0.5 shrink-0 text-accent-400" size={19} />
                <div>
                  <h2 className="font-semibold text-ink-50">
                    Add the public Supabase variables
                  </h2>
                  <p className="mt-1 text-sm leading-6 text-ink-400">
                    Create a local environment file from the included example and
                    restart the web workflow.
                  </p>
                </div>
              </div>
              <code className="block rounded-2xl bg-ink-850 px-4 py-3 text-xs leading-6 text-ink-300">
                VITE_SUPABASE_URL
                <br />
                VITE_SUPABASE_PUBLISHABLE_KEY
              </code>
              <p className="mt-4 text-xs leading-5 text-ink-500">
                Only the public publishable/anon key belongs in the browser.
                Never add a service-role key here.
              </p>
            </div>
          ) : isBootstrapFailure ? (
            <div className="rounded-3xl border border-rose-400/30 bg-rose-950/20 p-5">
              <div className="flex items-start gap-3">
                <AlertCircle className="mt-0.5 shrink-0 text-rose-300" size={19} />
                <div>
                  <h2 className="font-semibold text-rose-100">
                    Workspace setup needs attention
                  </h2>
                  <p className="mt-1 text-sm leading-6 text-rose-200/80">
                    {bootstrapError}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={onRetryBootstrap}
                className="mt-5 w-full rounded-2xl bg-accent-500 py-3 text-sm font-semibold text-ink-950 transition-colors hover:bg-accent-400"
              >
                Try again
              </button>
            </div>
          ) : (
            <form
              onSubmit={submit}
              className="rounded-3xl border border-ink-700 bg-ink-900 p-5"
            >
              <div className="mb-5 flex items-center gap-2 text-sm text-ink-300">
                <LockKeyhole size={16} className="text-accent-400" />
                Private account access
              </div>

              <label className="mb-2 block text-xs font-semibold uppercase tracking-wider text-ink-400">
                Email
              </label>
              <input
                type="email"
                autoComplete="email"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                placeholder="you@example.com"
                required
                className="mb-4 w-full rounded-2xl border border-ink-700 bg-ink-850 px-4 py-3 text-sm text-ink-100 outline-none transition-colors placeholder:text-ink-500 focus:border-accent-500"
              />

              <label className="mb-2 block text-xs font-semibold uppercase tracking-wider text-ink-400">
                Password
              </label>
              <input
                type="password"
                autoComplete={mode === 'sign-in' ? 'current-password' : 'new-password'}
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                placeholder="At least 6 characters"
                required
                minLength={6}
                className="w-full rounded-2xl border border-ink-700 bg-ink-850 px-4 py-3 text-sm text-ink-100 outline-none transition-colors placeholder:text-ink-500 focus:border-accent-500"
              />

              {error && (
                <div className="mt-4 flex items-start gap-2 rounded-2xl border border-rose-400/30 bg-rose-950/20 px-3 py-3 text-sm text-rose-200">
                  <AlertCircle size={16} className="mt-0.5 shrink-0" />
                  <span>{error}</span>
                </div>
              )}

              {message && (
                <p className="mt-4 rounded-2xl border border-accent-500/30 bg-accent-500/10 px-3 py-3 text-sm leading-5 text-accent-200">
                  {message}
                </p>
              )}

              <button
                type="submit"
                disabled={submitting}
                className="mt-5 flex w-full items-center justify-center gap-2 rounded-2xl bg-accent-500 py-3.5 text-sm font-semibold text-ink-950 transition-colors hover:bg-accent-400 disabled:cursor-wait disabled:opacity-60"
              >
                {submitting ? (
                  <Loader2 size={16} className="animate-spin" />
                ) : (
                  <ArrowRight size={16} />
                )}
                {mode === 'sign-in' ? 'Sign in' : 'Create account'}
              </button>

              <button
                type="button"
                onClick={() => {
                  setMode((current) =>
                    current === 'sign-in' ? 'sign-up' : 'sign-in',
                  );
                  setError(null);
                  setMessage(null);
                }}
                className="mt-4 w-full text-center text-sm text-ink-400 transition-colors hover:text-ink-100"
              >
                {mode === 'sign-in'
                  ? 'Need an account? Create one'
                  : 'Already have an account? Sign in'}
              </button>
            </form>
          )}
        </section>
      </div>
    </main>
  );
}