import { useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Briefcase, Eye, EyeOff, UserRound } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { env } from '@/config/env';
import { BRAND } from '@/config/brand';
import { errorMessage } from '@/lib/errors';
import { signupSchema, type SignupValues } from '@/schemas/auth';
import { Button } from '@/components/ui/Button';
import { Checkbox, Field, Input } from '@/components/ui/Field';
import { Notice } from '@/components/ui/Card';
import { cn } from '@/components/ui/cn';
import { safeRedirect } from '@/auth/guards';
import { AuthCard, rememberRedirect } from './AuthCard';

export default function SignupPage() {
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const [serverError, setServerError] = useState<string | null>(null);
  const [showPassword, setShowPassword] = useState(false);
  const { register, handleSubmit, control, setError, formState: { errors, isSubmitting } } = useForm<SignupValues>({
    resolver: zodResolver(signupSchema),
    defaultValues: {
      email: '', username: '', password: '', passwordConfirm: '',
      accountType: params.get('type') === 'prestataire' ? 'provider' : 'client', adult: false, terms: false,
    },
  });

  async function onSubmit(values: SignupValues) {
    setServerError(null);
    const { data: problem, error: checkError } = await supabase.rpc('check_username', { p_username: values.username });
    if (checkError) {
      setServerError(errorMessage(checkError));
      return;
    }
    if (problem) {
      setError('username', { message: problem });
      return;
    }
    const { data, error } = await supabase.auth.signUp({
      email: values.email,
      password: values.password,
      options: {
        emailRedirectTo: `${env.siteUrl}/auth/confirmer`,
        data: {
          username: values.username,
          account_type: values.accountType,
          adult_confirmed: String(values.adult),
          terms_version: BRAND.termsVersion,
        },
      },
    });
    if (error) {
      setServerError(errorMessage(error));
      return;
    }
    // Supabase ne renvoie pas d'erreur si l'adresse existe déjà : l'utilisateur n'a alors aucune identité.
    if (data.user && (data.user.identities?.length ?? 0) === 0) {
      setError('email', { message: 'Un compte existe déjà avec cette adresse. Connectez-vous ou utilisez « Mot de passe oublié ».' });
      return;
    }
    rememberRedirect(params.get('redirect') ? safeRedirect(params.get('redirect')) : values.accountType === 'provider' ? '/ma-fiche' : '/tableau-de-bord');
    navigate(`/verifier-email?email=${encodeURIComponent(values.email)}`, { replace: true });
  }

  return (
    <AuthCard title="Créer un compte" subtitle="Gratuit, en moins d'une minute."
      footer={<>Déjà inscrit ? <Link to={`/connexion${params.get('redirect') ? `?redirect=${encodeURIComponent(params.get('redirect')!)}` : ''}`} className="font-semibold text-brand-strong hover:underline">Se connecter</Link></>}>
      <form onSubmit={handleSubmit(onSubmit)} noValidate className="space-y-5">
        <Controller control={control} name="accountType" render={({ field }) => (
          <fieldset>
            <legend className="mb-2 text-sm font-semibold text-navy">Je suis…</legend>
            <div className="grid grid-cols-2 gap-3">
              {([
                { value: 'client', title: 'Client', text: 'Je cherche un prestataire', icon: UserRound },
                { value: 'provider', title: 'Prestataire', text: 'Je propose mes services', icon: Briefcase },
              ] as const).map(({ value, title, text, icon: Icon }) => (
                <label key={value} className={cn('flex cursor-pointer flex-col gap-1 rounded-2xl border-2 p-3 transition-colors',
                  field.value === value ? 'border-brand-strong bg-brand-50' : 'border-line bg-white hover:border-navy/30')}>
                  <input type="radio" name={field.name} value={value} checked={field.value === value} onChange={() => field.onChange(value)} className="sr-only" />
                  <Icon className="size-6 text-brand-strong" aria-hidden />
                  <span className="font-semibold text-navy">{title}</span>
                  <span className="text-sm text-muted">{text}</span>
                </label>
              ))}
            </div>
          </fieldset>
        )} />

        <Field label="Adresse e-mail" required error={errors.email?.message} hint="Elle reste privée et ne sera jamais affichée.">
          {(p) => <Input {...p} type="email" autoComplete="email" inputMode="email" {...register('email')} />}
        </Field>
        <Field label="Nom d'utilisateur" required error={errors.username?.message} hint="Visible par les autres membres. Ex. : manu.tahiti">
          {(p) => <Input {...p} autoComplete="username" autoCapitalize="none" spellCheck={false} {...register('username')} />}
        </Field>
        <Field label="Mot de passe" required error={errors.password?.message} hint="8 caractères minimum, avec des lettres et des chiffres.">
          {(p) => (
            <div className="relative">
              <Input {...p} type={showPassword ? 'text' : 'password'} autoComplete="new-password" className="pr-12" {...register('password')} />
              <button type="button" onClick={() => setShowPassword((v) => !v)} className="absolute top-1/2 right-2 -translate-y-1/2 rounded-lg p-2 text-muted"
                aria-label={showPassword ? 'Masquer le mot de passe' : 'Afficher le mot de passe'}>
                {showPassword ? <EyeOff className="size-5" aria-hidden /> : <Eye className="size-5" aria-hidden />}
              </button>
            </div>
          )}
        </Field>
        <Field label="Confirmer le mot de passe" required error={errors.passwordConfirm?.message}>
          {(p) => <Input {...p} type={showPassword ? 'text' : 'password'} autoComplete="new-password" {...register('passwordConfirm')} />}
        </Field>

        <div className="space-y-3 rounded-xl bg-surface p-4">
          <Checkbox label="Je certifie avoir 18 ans ou plus." error={errors.adult?.message} {...register('adult')} />
          <Checkbox
            label={<>J'accepte les <Link to="/cgu" target="_blank" className="font-semibold text-brand-strong underline">conditions d'utilisation</Link> et
              la <Link to="/confidentialite" target="_blank" className="font-semibold text-brand-strong underline">politique de confidentialité</Link>.</>}
            error={errors.terms?.message} {...register('terms')} />
        </div>

        {serverError && <Notice tone="danger">{serverError}</Notice>}
        <Button type="submit" size="lg" block loading={isSubmitting}>Créer mon compte</Button>
      </form>
    </AuthCard>
  );
}
