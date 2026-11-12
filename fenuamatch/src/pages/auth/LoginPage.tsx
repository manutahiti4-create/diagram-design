import { useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { supabase } from '@/lib/supabase';
import { errorMessage } from '@/lib/errors';
import { loginSchema, type LoginValues } from '@/schemas/auth';
import { Button } from '@/components/ui/Button';
import { Field, Input } from '@/components/ui/Field';
import { Notice } from '@/components/ui/Card';
import { safeRedirect } from '@/auth/guards';
import { AuthCard } from './AuthCard';
import { ResendConfirmation } from './CheckEmailPage';

export default function LoginPage() {
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const redirect = params.get('redirect');
  const [serverError, setServerError] = useState<string | null>(null);
  const [unconfirmedEmail, setUnconfirmedEmail] = useState<string | null>(null);
  const { register, handleSubmit, formState: { errors, isSubmitting } } = useForm<LoginValues>({
    resolver: zodResolver(loginSchema), defaultValues: { email: '', password: '' },
  });

  async function onSubmit(values: LoginValues) {
    setServerError(null);
    setUnconfirmedEmail(null);
    const { error } = await supabase.auth.signInWithPassword(values);
    if (error) {
      if (/not confirmed/i.test(error.message)) setUnconfirmedEmail(values.email);
      setServerError(errorMessage(error));
      return;
    }
    navigate(safeRedirect(redirect), { replace: true });
  }

  const signupLink = `/inscription${redirect ? `?redirect=${encodeURIComponent(redirect)}` : ''}`;
  return (
    <AuthCard title="Connexion" subtitle={redirect ? 'Connectez-vous pour accéder à cette page.' : 'Heureux de vous revoir !'}
      footer={<>Pas encore de compte ? <Link to={signupLink} className="font-semibold text-brand-strong hover:underline">Créer un compte gratuit</Link></>}>
      <form onSubmit={handleSubmit(onSubmit)} noValidate className="space-y-5">
        <Field label="Adresse e-mail" error={errors.email?.message}>
          {(p) => <Input {...p} type="email" autoComplete="email" inputMode="email" {...register('email')} />}
        </Field>
        <Field label="Mot de passe" error={errors.password?.message}>
          {(p) => <Input {...p} type="password" autoComplete="current-password" {...register('password')} />}
        </Field>
        <div className="-mt-2 text-right">
          <Link to="/mot-de-passe-oublie" className="text-sm font-semibold text-brand-strong hover:underline">Mot de passe oublié ?</Link>
        </div>
        {serverError && <Notice tone="danger">{serverError}</Notice>}
        <Button type="submit" size="lg" block loading={isSubmitting}>Se connecter</Button>
      </form>
      {unconfirmedEmail && <div className="mt-4"><ResendConfirmation initialEmail={unconfirmedEmail} /></div>}
    </AuthCard>
  );
}
