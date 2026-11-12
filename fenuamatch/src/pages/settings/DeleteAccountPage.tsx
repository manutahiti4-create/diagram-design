import { useState } from 'react';
import { useNavigate } from 'react-router';
import { AlertTriangle } from 'lucide-react';
import { useAuth } from '@/auth/AuthProvider';
import { Button, ButtonLink } from '@/components/ui/Button';
import { CardSection, Notice, PageHeader } from '@/components/ui/Card';
import { Checkbox, Field, Input } from '@/components/ui/Field';
import { BackLink } from '@/components/domain/BackLink';
import { errorMessage } from '@/lib/errors';
import { deleteMyAccount } from '@/services/account';

export default function DeleteAccountPage() {
  const { user, profile } = useAuth();
  const navigate = useNavigate();
  const [typed, setTyped] = useState('');
  const [understood, setUnderstood] = useState(false);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  if (!user || !profile) return null;
  const ready = understood && typed.trim().toLowerCase() === profile.username;

  async function confirm() {
    setPending(true);
    setError(null);
    try {
      await deleteMyAccount(user!.id, typed.trim().toLowerCase());
      navigate('/', { replace: true });
    } catch (e) {
      setError(errorMessage(e));
      setPending(false);
    }
  }

  return (
    <div className="mx-auto max-w-2xl">
      <BackLink to="/parametres">Paramètres</BackLink>
      <PageHeader title="Supprimer mon compte" />
      <CardSection>
        <div className="space-y-4">
          <div className="flex gap-3 rounded-xl bg-danger-50 p-4 text-danger">
            <AlertTriangle className="size-6 shrink-0" aria-hidden />
            <p className="font-semibold">Cette action est définitive et ne peut pas être annulée.</p>
          </div>
          <ul className="list-disc space-y-1 pl-5">
            <li>Votre compte, votre profil{profile.account_type === 'provider' ? ', votre fiche prestataire et votre galerie' : ' et vos annonces'} seront supprimés.</li>
            <li>Vos missions en cours seront annulées et l'autre partie sera prévenue.</li>
            <li>Les messages déjà envoyés restent visibles par leurs destinataires, mais sans votre nom (« Compte supprimé »).</li>
            <li>Une trace minimale et anonyme de la suppression est conservée pour la sécurité de la plateforme.</li>
          </ul>
          <p className="text-sm text-muted">Conseil : exportez d'abord vos données depuis les paramètres si vous souhaitez en garder une copie.</p>
          <Field label={<>Pour confirmer, tapez votre nom d'utilisateur : <strong>{profile.username}</strong></>}>
            {(p) => <Input {...p} autoCapitalize="none" spellCheck={false} value={typed} onChange={(e) => setTyped(e.target.value)} />}
          </Field>
          <Checkbox label="Je comprends que la suppression est définitive." checked={understood} onChange={(e) => setUnderstood(e.target.checked)} />
          {error && <Notice tone="danger">{error}</Notice>}
          <div className="flex flex-wrap gap-2">
            <Button variant="danger" disabled={!ready} loading={pending} onClick={() => void confirm()}>Supprimer définitivement mon compte</Button>
            <ButtonLink to="/parametres" variant="secondary">Annuler</ButtonLink>
          </div>
        </div>
      </CardSection>
    </div>
  );
}
