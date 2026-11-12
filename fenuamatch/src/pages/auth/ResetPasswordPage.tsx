import { useState } from 'react';
import { useNavigate } from 'react-router';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { supabase } from '@/lib/supabase';
import { errorMessage } from '@/lib/errors';
import { newPasswordSchema, type NewPasswordValues } from '@/schemas/auth';
import { useAuth } from '@/auth/AuthProvider';
import { Button, ButtonLink } from '@/components/ui/Button';
import { Field, Input } from '@/components/ui/Field';
import { Notice } from '@/components/ui/Card';
import { PageLoader } from '@/components/ui/Spinner';
import { useToast } from '@/components/ui/Toast';
import { AuthCard } from './AuthCard';

export default function ResetPasswordPage() {
  const { user, loading } = useAuth();
  const navigate = useNavigate();
  const toast = useToast();
  const [error, setError] = useState<string | null>(null);
  const { register, handleSubmit, formState: { errors, isSubmitting } } = useForm<NewPasswordValues>({
    resolver: zodResolver(newPasswordSchema), defaultValues: { password: '', passwordConfirm: '' },
  });

  if (loading) return <PageLoader />;
  if (!user) {
    return (
      <AuthCard title="Lien expiré">
        <Notice tone="warning">Ouvrez le lien reçu par e-mail pour choisir un nouveau mot de passe, ou demandez-en un nouveau.</Notice>
        <ButtonLink to="/mot-de-passe-oublie" block className="mt-4">Demander un nouveau lien</ButtonLink>
      </AuthCard>
    );
  }

  async function onSubmit(values: NewPasswordValues) {
    setError(null);
    const { error: e } = await supabase.auth.updateUser({ password: values.password });
    if (e) {
      setError(errorMessage(e));
      return;
    }
    toast.show('Mot de passe modifié.');
    navigate('/tableau-de-bord', { replace: true });
  }

  return (
    <AuthCard title="Nouveau mot de passe">
      <form onSubmit={handleSubmit(onSubmit)} noValidate className="space-y-5">
        <Field label="Nouveau mot de passe" error={errors.password?.message} hint="8 caractères minimum, avec des lettres et des chiffres.">
          {(p) => <Input {...p} type="password" autoComplete="new-password" {...register('password')} />}
        </Field>
        <Field label="Confirmer" error={errors.passwordConfirm?.message}>
          {(p) => <Input {...p} type="password" autoComplete="new-password" {...register('passwordConfirm')} />}
        </Field>
        {error && <Notice tone="danger">{error}</Notice>}
        <Button type="submit" size="lg" block loading={isSubmitting}>Enregistrer</Button>
      </form>
    </AuthCard>
  );
}
