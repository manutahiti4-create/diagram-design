import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import type { Session, User } from '@supabase/supabase-js';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import type { Profile } from '@/types/models';

interface AuthContextValue {
  session: Session | null;
  user: User | null;
  profile: Profile | null;
  isAdmin: boolean;
  /** Vrai tant que la session initiale n'est pas connue. */
  loading: boolean;
  profileLoading: boolean;
  /** Vrai si l'utilisateur vient d'ouvrir un lien de réinitialisation du mot de passe. */
  recoveryMode: boolean;
  refreshProfile: () => Promise<void>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const queryClient = useQueryClient();
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const [recoveryMode, setRecoveryMode] = useState(false);

  useEffect(() => {
    let mounted = true;
    supabase.auth.getSession().then(({ data }) => {
      if (!mounted) return;
      setSession(data.session);
      setLoading(false);
    });
    const { data: sub } = supabase.auth.onAuthStateChange((event, next) => {
      setSession(next);
      if (event === 'PASSWORD_RECOVERY') setRecoveryMode(true);
      if (event === 'SIGNED_OUT') {
        setRecoveryMode(false);
        queryClient.clear();
      }
    });
    return () => {
      mounted = false;
      sub.subscription.unsubscribe();
    };
  }, [queryClient]);

  const userId = session?.user.id ?? null;

  const profileQuery = useQuery({
    queryKey: ['me', 'profile', userId],
    enabled: Boolean(userId),
    queryFn: async () => {
      const { data, error } = await supabase.from('profiles').select('*').eq('id', userId!).maybeSingle();
      if (error) throw error;
      return data;
    },
    staleTime: 60_000,
  });

  const adminQuery = useQuery({
    queryKey: ['me', 'is-admin', userId],
    enabled: Boolean(userId),
    queryFn: async () => {
      const { data, error } = await supabase.rpc('is_admin');
      if (error) throw error;
      return Boolean(data);
    },
    staleTime: 5 * 60_000,
  });

  // Signale l'activité (gestion des comptes inactifs) une fois par session.
  useEffect(() => {
    if (userId) void supabase.rpc('touch_activity');
  }, [userId]);

  const value = useMemo<AuthContextValue>(() => ({
    session,
    user: session?.user ?? null,
    profile: profileQuery.data ?? null,
    isAdmin: adminQuery.data ?? false,
    loading,
    profileLoading: Boolean(userId) && profileQuery.isPending,
    recoveryMode,
    refreshProfile: async () => {
      await queryClient.invalidateQueries({ queryKey: ['me'] });
    },
    signOut: async () => {
      await supabase.auth.signOut();
    },
  }), [session, profileQuery.data, profileQuery.isPending, adminQuery.data, loading, recoveryMode, queryClient, userId]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth doit être utilisé dans <AuthProvider>.');
  return ctx;
}
