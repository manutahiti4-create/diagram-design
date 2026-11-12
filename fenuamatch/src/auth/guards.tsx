import type { ReactNode } from 'react';
import { Navigate, useLocation } from 'react-router';
import { useAuth } from './AuthProvider';
import { PageLoader } from '@/components/ui/Spinner';
import { ErrorState } from '@/components/ui/States';
import type { AccountType } from '@/types/models';

/** Chemin interne sûr (évite les redirections vers un site externe). */
export function safeRedirect(value: string | null | undefined, fallback = '/tableau-de-bord'): string {
  if (!value || !value.startsWith('/') || value.startsWith('//') || value.includes('\\')) return fallback;
  return value;
}

export function RequireAuth({ children, accountType }: { children: ReactNode; accountType?: AccountType }) {
  const { user, profile, loading, profileLoading } = useAuth();
  const location = useLocation();
  if (loading || profileLoading) return <PageLoader />;
  if (!user) {
    const redirect = encodeURIComponent(location.pathname + location.search);
    return <Navigate to={`/connexion?redirect=${redirect}`} replace />;
  }
  if (!profile) {
    return <ErrorState title="Profil introuvable" message="Votre profil n'a pas pu être chargé. Réessayez ou reconnectez-vous." />;
  }
  if (profile.status === 'suspended') {
    return <ErrorState title="Compte suspendu" message="Votre compte est suspendu. Contactez l'équipe FenuaMatch pour en savoir plus." />;
  }
  if (accountType && profile.account_type !== accountType) {
    return (
      <ErrorState
        title="Accès réservé"
        message={accountType === 'provider'
          ? 'Cette page est réservée aux comptes prestataires.'
          : 'Cette page est réservée aux comptes clients.'}
      />
    );
  }
  return <>{children}</>;
}

/** Protection d'affichage uniquement : toutes les données d'administration sont vérifiées côté serveur. */
export function RequireAdmin({ children }: { children: ReactNode }) {
  const { isAdmin, loading } = useAuth();
  if (loading) return <PageLoader />;
  if (!isAdmin) return <ErrorState title="Accès refusé" message="Cette zone est réservée à l'administration de FenuaMatch." />;
  return <>{children}</>;
}

export function GuestOnly({ children }: { children: ReactNode }) {
  const { user, loading } = useAuth();
  const location = useLocation();
  if (loading) return <PageLoader />;
  if (user) {
    const params = new URLSearchParams(location.search);
    return <Navigate to={safeRedirect(params.get('redirect'))} replace />;
  }
  return <>{children}</>;
}
