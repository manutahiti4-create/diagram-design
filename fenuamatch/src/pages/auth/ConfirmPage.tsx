import { useEffect, useRef, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router';
import type { EmailOtpType } from '@supabase/supabase-js';
import { supabase } from '@/lib/supabase';
import { errorMessage } from '@/lib/errors';
import { Spinner } from '@/components/ui/Spinner';
import { Notice } from '@/components/ui/Card';
import { ButtonLink } from '@/components/ui/Button';
import { useToast } from '@/components/ui/Toast';
import { safeRedirect } from '@/auth/guards';
import { AuthCard, consumeRedirect } from './AuthCard';
import { ResendConfirmation } from './CheckEmailPage';

const TYPES: EmailOtpType[] = ['signup', 'email', 'recovery', 'email_change', 'invite', 'magiclink'];

/** Point d'arrivée des liens reçus par e-mail (confirmation, réinitialisation, changement d'adresse). */
export default function ConfirmPage() {
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const toast = useToast();
  const [error, setError] = useState<string | null>(null);
  const done = useRef(false);

  useEffect(() => {
    if (done.current) return;
    done.current = true;
    const tokenHash = params.get('token_hash');
    const type = params.get('type') as EmailOtpType | null;
    const urlError = params.get('error_description');

    (async () => {
      if (urlError) throw new Error(urlError);
      if (tokenHash && type && TYPES.includes(type)) {
        const { error: e } = await supabase.auth.verifyOtp({ token_hash: tokenHash, type });
        if (e) throw e;
      } else {
        // Lien au format PKCE (?code=...) : échangé automatiquement par le client Supabase.
        const { data } = await supabase.auth.getSession();
        if (!data.session) throw new Error('Lien invalide ou expiré.');
      }
      if (type === 'recovery') {
        navigate('/nouveau-mot-de-passe', { replace: true });
      } else if (type === 'email_change') {
        toast.show('Adresse e-mail confirmée.');
        navigate('/parametres', { replace: true });
      } else {
        toast.show('Adresse e-mail confirmée. Bienvenue sur FenuaMatch !');
        navigate(safeRedirect(consumeRedirect()), { replace: true });
      }
    })().catch((e: unknown) => setError(errorMessage(e, 'Ce lien est invalide ou a expiré.')));
  }, [params, navigate, toast]);

  if (error) {
    return (
      <AuthCard title="Lien invalide ou expiré">
        <div className="space-y-4">
          <Notice tone="danger">{error}</Notice>
          {params.get('type') === 'recovery'
            ? <ButtonLink to="/mot-de-passe-oublie" block>Demander un nouveau lien</ButtonLink>
            : <ResendConfirmation />}
          <ButtonLink to="/connexion" variant="ghost" block>Aller à la connexion</ButtonLink>
        </div>
      </AuthCard>
    );
  }
  return (
    <AuthCard title="Vérification en cours…">
      <div className="flex justify-center py-6"><Spinner className="size-8" /></div>
    </AuthCard>
  );
}
