import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react';
import type { Session, User } from '@supabase/supabase-js';
import { isSupabaseConfigured, supabase } from '@/lib/supabase';

export type AuthStatus =
  | 'unconfigured'
  | 'loading'
  | 'signed-out'
  | 'bootstrapping'
  | 'authenticated'
  | 'bootstrap-error';

interface AuthActionResult {
  error: string | null;
}

interface AuthContextValue {
  status: AuthStatus;
  session: Session | null;
  user: User | null;
  workspaceId: string | null;
  bootstrapError: string | null;
  signIn: (email: string, password: string) => Promise<AuthActionResult>;
  signUp: (email: string, password: string) => Promise<AuthActionResult>;
  signOut: () => Promise<AuthActionResult>;
  retryBootstrap: () => void;
}

const AuthContext = createContext<AuthContextValue | null>(null);

function getBrowserTimezone(): string {
  try {
    return Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC';
  } catch {
    return 'UTC';
  }
}

function getBootstrapDisplayName(user: User): string | null {
  const metadataName =
    typeof user.user_metadata?.full_name === 'string'
      ? user.user_metadata.full_name.trim()
      : '';

  if (metadataName) return metadataName;

  const emailName = user.email?.split('@')[0]?.trim();
  return emailName || null;
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [workspaceId, setWorkspaceId] = useState<string | null>(null);
  const [bootstrapError, setBootstrapError] = useState<string | null>(null);
  const [bootstrapAttempt, setBootstrapAttempt] = useState(0);
  const bootstrappedUserId = useRef<string | null>(null);

  useEffect(() => {
    if (!supabase) {
      setAuthLoading(false);
      return;
    }

    let cancelled = false;

    void supabase.auth.getSession().then(({ data, error }) => {
      if (cancelled) return;
      setSession(error ? null : data.session);
      setAuthLoading(false);
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, nextSession) => {
      if (cancelled) return;
      setSession(nextSession);
      if (!nextSession) {
        setWorkspaceId(null);
        setBootstrapError(null);
        bootstrappedUserId.current = null;
      }
    });

    return () => {
      cancelled = true;
      subscription.unsubscribe();
    };
  }, []);

  useEffect(() => {
    if (!supabase || !session) {
      setWorkspaceId(null);
      setBootstrapError(null);
      return;
    }

    if (
      bootstrappedUserId.current === session.user.id &&
      workspaceId !== null
    ) {
      return;
    }

    let cancelled = false;
    setWorkspaceId(null);
    setBootstrapError(null);

    void supabase
      .rpc('bootstrap_user_workspace', {
        p_timezone: getBrowserTimezone(),
        p_display_name: getBootstrapDisplayName(session.user),
      })
      .then(({ data, error }) => {
        if (cancelled) return;
        if (error || typeof data !== 'string') {
          setBootstrapError(
            error?.message || 'We could not prepare your workspace.',
          );
          return;
        }

        bootstrappedUserId.current = session.user.id;
        setWorkspaceId(data);
      });

    return () => {
      cancelled = true;
    };
  }, [bootstrapAttempt, session, workspaceId]);

  const signIn = useCallback(
    async (email: string, password: string): Promise<AuthActionResult> => {
      if (!supabase) {
        return { error: 'Supabase is not configured for this app.' };
      }

      const { error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });
      return { error: error?.message ?? null };
    },
    [],
  );

  const signUp = useCallback(
    async (email: string, password: string): Promise<AuthActionResult> => {
      if (!supabase) {
        return { error: 'Supabase is not configured for this app.' };
      }

      const { error } = await supabase.auth.signUp({
        email,
        password,
      });
      return { error: error?.message ?? null };
    },
    [],
  );

  const signOut = useCallback(async (): Promise<AuthActionResult> => {
    if (!supabase) return { error: null };

    const { error } = await supabase.auth.signOut();
    return { error: error?.message ?? null };
  }, []);

  const retryBootstrap = useCallback(() => {
    bootstrappedUserId.current = null;
    setBootstrapAttempt((attempt) => attempt + 1);
  }, []);

  const status: AuthStatus = !isSupabaseConfigured
    ? 'unconfigured'
    : authLoading
      ? 'loading'
      : !session
        ? 'signed-out'
        : bootstrapError
          ? 'bootstrap-error'
          : workspaceId
            ? 'authenticated'
            : 'bootstrapping';

  const value = useMemo<AuthContextValue>(
    () => ({
      status,
      session,
      user: session?.user ?? null,
      workspaceId,
      bootstrapError,
      signIn,
      signUp,
      signOut,
      retryBootstrap,
    }),
    [
      bootstrapError,
      retryBootstrap,
      session,
      signIn,
      signOut,
      signUp,
      status,
      workspaceId,
    ],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used within AuthProvider');
  return context;
}