import { useState } from 'react';
import { Link, useSearchParams } from 'react-router';
import { MailCheck } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { env } from '@/config/env';
import { errorMessage } from '@/lib/errors';
import { Button } from '@/components/ui/Button';
import { Field, Input } from '@/components/ui/Field';
import { Notice } from '@/components/ui/Card';
import { AuthCard } from './AuthCard';

export function ResendConfirmation({ initialEmail = '' }: { initialEmail?: string }) {
  const [email, setEmail] = useState(initialEmail);
  const [state, setState] = useState<'idle' | 'sending' | 'sent'>('idle');
  const [error, setError] = useState<string | null>(null);
  async function resend() {
    setError(null);
    setState('sending');
    const { error: e } = await supabase.auth.resend({ type: 'signup', email: email.trim(), options: { emailRedirectTo: `${env.siteUrl}/auth/confirmer` } });
    if (e) {
      setError(errorMessage(e));
      setState('idle');
    } else {
      setState('sent');
    }
  }
  return (
    <div className="space-y-3">
      {!initialEmail && (
        <Field label="Adresse e-mail">{(p) => <Input {...p} type="email" value={email} onChange={(e) => setEmail(e.target.value)} />}</Field>
      )}
      {state === 'sent' && <Notice tone="success">Un nouvel e-mail vient d'être envoyé.</Notice>}
      {error && <Notice tone="danger">{error}</Notice>}
      <Button variant="secondary" block loading={state === 'sending'} disabled={!email} onClick={() => void resend()}>
        Renvoyer l'e-mail de confirmation
      </Button>
    </div>
  );
}

export default function CheckEmailPage() {
  const [params] = useSearchParams();
  const email = params.get('email') ?? '';
  return (
    <AuthCard title="Confirmez votre adresse e-mail">
      <div className="space-y-4">
        <div className="flex justify-center"><MailCheck className="size-14 text-brand-strong" aria-hidden /></div>
        <p>
          Nous avons envoyé un lien de confirmation {email ? <>à <strong className="break-all">{email}</strong></> : 'à votre adresse'}.
          Ouvrez-le pour activer votre compte.
        </p>
        <p className="text-sm text-muted">Pensez à vérifier vos courriers indésirables (spam). Le lien est valable 24 heures.</p>
        <ResendConfirmation initialEmail={email} />
        <p className="text-center text-sm"><Link to="/connexion" className="font-semibold text-brand-strong hover:underline">Retour à la connexion</Link></p>
      </div>
    </AuthCard>
  );
}
