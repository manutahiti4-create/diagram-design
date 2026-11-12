import { useEffect, useState, type FormEvent } from 'react';
import { Link } from 'react-router';
import { Download, LogOut, ShieldAlert, Trash2, UserRoundPen } from 'lucide-react';
import { useAuth } from '@/auth/AuthProvider';
import { Button, ButtonLink } from '@/components/ui/Button';
import { CardSection, Notice, PageHeader } from '@/components/ui/Card';
import { Field, Input, Select } from '@/components/ui/Field';
import { useToast } from '@/components/ui/Toast';
import { AvatarUploader } from '@/components/domain/AvatarUploader';
import { env } from '@/config/env';
import { LIMITS } from '@/config/brand';
import { errorMessage } from '@/lib/errors';
import { formatDate } from '@/lib/format';
import { supabase } from '@/lib/supabase';
import { emailSchema, passwordSchema, usernameSchema } from '@/schemas/auth';
import { changeUsername, exportMyData, updateMyPhone, updateMyProfile, useMyPrivate } from '@/services/account';
import { useCommunes } from '@/services/reference';

export default function SettingsPage() {
  const { user, profile, signOut } = useAuth();
  const toast = useToast();
  if (!user || !profile) return null;

  async function download() {
    try {
      const data = await exportMyData();
      const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `fenuamatch-mes-donnees-${new Date().toISOString().slice(0, 10)}.json`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (e) {
      toast.show(errorMessage(e), 'error');
    }
  }

  return (
    <div className="mx-auto max-w-2xl space-y-4">
      <PageHeader title="Paramètres du compte" subtitle={`Connecté en tant que ${profile.username} (${profile.account_type === 'provider' ? 'prestataire' : 'client'})`} />

      <CardSection title="Photo de profil"><AvatarUploader required={profile.account_type === 'provider'} /></CardSection>

      {profile.account_type === 'provider' && (
        <CardSection title="Ma fiche prestataire">
          <p className="mb-3 text-muted">Métiers, description, disponibilité, galerie…</p>
          <ButtonLink to="/ma-fiche" variant="secondary" icon={<UserRoundPen className="size-4" aria-hidden />}>Modifier ma fiche</ButtonLink>
        </CardSection>
      )}

      <PersonalInfo />
      <UsernameSection />
      <EmailSection />
      <PasswordSection />

      <CardSection title="Mes données">
        <div className="space-y-3">
          <p className="text-sm text-muted">
            Téléchargez une copie de vos données personnelles, consultez l'état de vos contenus ou supprimez votre compte.
            Voir la <Link to="/confidentialite" className="text-brand-strong underline">politique de confidentialité</Link>.
          </p>
          <div className="flex flex-wrap gap-2">
            <Button variant="secondary" icon={<Download className="size-4" aria-hidden />} onClick={() => void download()}>Exporter mes données</Button>
            <ButtonLink to="/parametres/moderation" variant="secondary" icon={<ShieldAlert className="size-4" aria-hidden />}>Modération et contestations</ButtonLink>
          </div>
        </div>
      </CardSection>

      <CardSection title="Sessions">
        <div className="flex flex-wrap gap-2">
          <Button variant="navy" icon={<LogOut className="size-4" aria-hidden />} onClick={() => void signOut()}>Se déconnecter</Button>
          <Button variant="secondary" onClick={() => void supabase.auth.signOut({ scope: 'global' })}>Se déconnecter de tous les appareils</Button>
        </div>
      </CardSection>

      <CardSection title="Zone sensible">
        <ButtonLink to="/parametres/suppression" variant="dangerGhost" icon={<Trash2 className="size-4" aria-hidden />}>Supprimer mon compte</ButtonLink>
      </CardSection>
      <p className="pb-4 text-center text-xs text-muted">Version {import.meta.env.MODE === 'production' ? 'V1' : 'développement'} · {env.siteUrl}</p>
    </div>
  );
}

function PersonalInfo() {
  const { user, profile, refreshProfile } = useAuth();
  const { data: communes } = useCommunes();
  const priv = useMyPrivate(user?.id);
  const toast = useToast();
  const [commune, setCommune] = useState<string>(profile?.commune_id ? String(profile.commune_id) : '');
  const [phone, setPhone] = useState('');
  const [phoneError, setPhoneError] = useState<string>();
  const [pending, setPending] = useState(false);
  useEffect(() => setPhone(priv.data?.phone ?? ''), [priv.data?.phone]);

  async function save(e: FormEvent) {
    e.preventDefault();
    if (phone && !/^[0-9+ .-]{6,20}$/.test(phone.trim())) {
      setPhoneError('Numéro invalide.');
      return;
    }
    setPhoneError(undefined);
    setPending(true);
    try {
      await updateMyProfile(user!.id, { commune_id: commune ? Number(commune) : null });
      await updateMyPhone(user!.id, phone.trim() || null);
      await refreshProfile();
      toast.show('Informations enregistrées.');
    } catch (err) {
      toast.show(errorMessage(err), 'error');
    } finally {
      setPending(false);
    }
  }

  return (
    <CardSection title="Informations personnelles">
      <form onSubmit={(e) => void save(e)} className="space-y-4">
        <Field label="Ma commune" optional hint="Facultatif. Sert uniquement à vous proposer des contenus proches.">
          {(p) => (
            <Select {...p} value={commune} onChange={(e) => setCommune(e.target.value)}>
              <option value="">Non précisée</option>
              {communes?.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
            </Select>
          )}
        </Field>
        <Field label="Téléphone" optional error={phoneError} hint="Privé : jamais affiché aux autres membres.">
          {(p) => <Input {...p} type="tel" inputMode="tel" autoComplete="tel" value={phone} onChange={(e) => setPhone(e.target.value)} />}
        </Field>
        <Button type="submit" variant="navy" loading={pending}>Enregistrer</Button>
      </form>
    </CardSection>
  );
}

function UsernameSection() {
  const { profile, refreshProfile } = useAuth();
  const toast = useToast();
  const [value, setValue] = useState(profile?.username ?? '');
  const [error, setError] = useState<string>();
  const [pending, setPending] = useState(false);
  if (!profile) return null;
  const nextAllowed = profile.username_change_count >= 1 && profile.username_changed_at
    ? new Date(new Date(profile.username_changed_at).getTime() + LIMITS.usernameChangeDelayDays * 86_400_000) : null;
  const locked = nextAllowed !== null && nextAllowed > new Date();

  async function save(e: FormEvent) {
    e.preventDefault();
    const parsed = usernameSchema.safeParse(value);
    if (!parsed.success) {
      setError(parsed.error.issues[0]?.message);
      return;
    }
    setError(undefined);
    setPending(true);
    try {
      await changeUsername(parsed.data);
      await refreshProfile();
      toast.show('Nom d\'utilisateur modifié.');
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setPending(false);
    }
  }

  return (
    <CardSection title="Nom d'utilisateur">
      <form onSubmit={(e) => void save(e)} className="space-y-3">
        <p className="text-sm text-muted">Le premier changement est libre. Ensuite, il faut attendre {LIMITS.usernameChangeDelayDays} jours entre deux changements.</p>
        {locked && <Notice tone="neutral">Prochain changement possible à partir du {formatDate(nextAllowed)}.</Notice>}
        <Field label="Nom d'utilisateur" error={error}>
          {(p) => <Input {...p} autoCapitalize="none" spellCheck={false} disabled={locked} value={value} onChange={(e) => setValue(e.target.value)} />}
        </Field>
        <Button type="submit" variant="navy" loading={pending} disabled={locked || value.trim().toLowerCase() === profile.username}>Changer</Button>
      </form>
    </CardSection>
  );
}

function EmailSection() {
  const { user } = useAuth();
  const [email, setEmail] = useState('');
  const [error, setError] = useState<string>();
  const [sent, setSent] = useState(false);
  const [pending, setPending] = useState(false);

  async function save(e: FormEvent) {
    e.preventDefault();
    const parsed = emailSchema.safeParse(email);
    if (!parsed.success) {
      setError(parsed.error.issues[0]?.message);
      return;
    }
    setError(undefined);
    setPending(true);
    const { error: err } = await supabase.auth.updateUser({ email: parsed.data }, { emailRedirectTo: `${env.siteUrl}/auth/confirmer?type=email_change` });
    setPending(false);
    if (err) setError(errorMessage(err));
    else setSent(true);
  }

  return (
    <CardSection title="Adresse e-mail">
      <p className="text-sm">Adresse actuelle : <strong className="break-all">{user?.email}</strong></p>
      {user?.new_email && <Notice tone="warning" className="mt-3">Changement en attente vers {user.new_email} : confirmez depuis les deux boîtes e-mail.</Notice>}
      {sent ? (
        <Notice tone="success" className="mt-3">Pour votre sécurité, un lien de confirmation a été envoyé à l'ancienne et à la nouvelle adresse. Le changement sera effectif après les deux confirmations.</Notice>
      ) : (
        <form onSubmit={(e) => void save(e)} className="mt-3 space-y-3">
          <Field label="Nouvelle adresse e-mail" error={error}>
            {(p) => <Input {...p} type="email" inputMode="email" autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} />}
          </Field>
          <Button type="submit" variant="navy" loading={pending} disabled={!email}>Changer d'adresse</Button>
        </form>
      )}
    </CardSection>
  );
}

function PasswordSection() {
  const toast = useToast();
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [nonce, setNonce] = useState('');
  const [needsCode, setNeedsCode] = useState(false);
  const [error, setError] = useState<string>();
  const [pending, setPending] = useState(false);

  async function save(e: FormEvent) {
    e.preventDefault();
    const parsed = passwordSchema.safeParse(password);
    if (!parsed.success) {
      setError(parsed.error.issues[0]?.message);
      return;
    }
    if (password !== confirm) {
      setError('Les mots de passe ne correspondent pas.');
      return;
    }
    setError(undefined);
    setPending(true);
    try {
      const { error: err } = await supabase.auth.updateUser(needsCode ? { password, nonce: nonce.trim() } : { password });
      if (err) {
        if (!needsCode && /reauthenticat/i.test(err.message)) {
          // Connexion trop ancienne : Supabase envoie un code de vérification par e-mail.
          const { error: reErr } = await supabase.auth.reauthenticate();
          if (reErr) throw reErr;
          setNeedsCode(true);
          toast.show('Un code de vérification vient de vous être envoyé par e-mail.');
          return;
        }
        throw err;
      }
      toast.show('Mot de passe modifié.');
      setPassword('');
      setConfirm('');
      setNonce('');
      setNeedsCode(false);
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setPending(false);
    }
  }

  return (
    <CardSection title="Mot de passe">
      <form onSubmit={(e) => void save(e)} className="space-y-3">
        <Field label="Nouveau mot de passe" hint="8 caractères minimum, avec des lettres et des chiffres.">
          {(p) => <Input {...p} type="password" autoComplete="new-password" value={password} onChange={(e) => setPassword(e.target.value)} />}
        </Field>
        <Field label="Confirmer le mot de passe">
          {(p) => <Input {...p} type="password" autoComplete="new-password" value={confirm} onChange={(e) => setConfirm(e.target.value)} />}
        </Field>
        {needsCode && (
          <Field label="Code reçu par e-mail">
            {(p) => <Input {...p} inputMode="numeric" autoComplete="one-time-code" value={nonce} onChange={(e) => setNonce(e.target.value)} />}
          </Field>
        )}
        {error && <Notice tone="danger">{error}</Notice>}
        <Button type="submit" variant="navy" loading={pending} disabled={!password}>Changer le mot de passe</Button>
        <p className="text-sm"><Link to="/mot-de-passe-oublie" className="text-brand-strong underline">Mot de passe oublié ?</Link></p>
      </form>
    </CardSection>
  );
}
