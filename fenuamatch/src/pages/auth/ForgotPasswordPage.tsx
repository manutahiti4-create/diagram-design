import { useState, type FormEvent } from 'react';
import { Link } from 'react-router';
import { supabase } from '@/lib/supabase';
import { env } from '@/config/env';
import { errorMessage } from '@/lib/errors';
import { emailSchema } from '@/schemas/auth';
import { Button } from '@/components/ui/Button';
import { Field, Input } from '@/components/ui/Field';
import { Notice } from '@/components/ui/Card';
import { AuthCard } from './AuthCard';

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('');
  const [fieldError, setFieldError] = useState<string>();
  const [error, setError] = useState<string | null>(null);
  const [sent, setSent] = useState(false);
  const [pending, setPending] = useState(false);

  async function submit(e: FormEvent) {
    e.preventDefault();
    const parsed = emailSchema.safeParse(email);
    if (!parsed.success) {
      setFieldError(parsed.error.issues[0]?.message);
      return;
    }
    setFieldError(undefined);
    setError(null);
    setPending(true);
    const { error: err } = await supabase.auth.resetPasswordForEmail(parsed.data, { redirectTo: `${env.siteUrl}/auth/confirmer?type=recovery` });
    setPending(false);
    if (err) setError(errorMessage(err));
    else setSent(true);
  }

  return (
    <AuthCard title="Mot de passe oublié" subtitle="Recevez un lien pour choisir un nouveau mot de passe."
      footer={<Link to="/connexion" className="font-semibold text-brand-strong hover:underline">Retour à la connexion</Link>}>
      {sent ? (
        <Notice tone="success" title="Vérifiez votre messagerie">
          Si un compte existe avec cette adresse, un e-mail contenant un lien de réinitialisation vient d'être envoyé. Le lien est valable 1 heure.
        </Notice>
      ) : (
        <form onSubmit={submit} noValidate className="space-y-5">
          <Field label="Adresse e-mail" error={fieldError}>
            {(p) => <Input {...p} type="email" autoComplete="email" inputMode="email" value={email} onChange={(e) => setEmail(e.target.value)} />}
          </Field>
          {error && <Notice tone="danger">{error}</Notice>}
          <Button type="submit" size="lg" block loading={pending}>Envoyer le lien</Button>
        </form>
      )}
    </AuthCard>
  );
}
