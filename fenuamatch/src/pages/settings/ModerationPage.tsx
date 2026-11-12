import { useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { ShieldCheck } from 'lucide-react';
import { Badge, CardSection, PageHeader } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Field, Textarea } from '@/components/ui/Field';
import { PageLoader } from '@/components/ui/Spinner';
import { EmptyState, ErrorState } from '@/components/ui/States';
import { useToast } from '@/components/ui/Toast';
import { BackLink } from '@/components/domain/BackLink';
import { errorMessage } from '@/lib/errors';
import { submitAppeal, useMyHiddenContent } from '@/services/moderation';
import type { HiddenContent } from '@/types/models';

const APPEAL_LABEL: Record<string, string> = { open: 'Contestation en cours d\'examen', accepted: 'Contestation acceptée', rejected: 'Contestation refusée' };

export default function ModerationPage() {
  const q = useMyHiddenContent(true);
  return (
    <div className="mx-auto max-w-2xl">
      <BackLink to="/parametres">Paramètres</BackLink>
      <PageHeader title="Modération" subtitle="Vos contenus masqués et vos contestations." />
      {q.isPending ? <PageLoader /> : q.isError ? <ErrorState error={q.error} onRetry={() => void q.refetch()} /> : !q.data?.length ? (
        <EmptyState icon={<ShieldCheck className="size-7" aria-hidden />} title="Aucun contenu masqué" message="Tous vos contenus sont visibles normalement." />
      ) : (
        <div className="space-y-3">
          <p className="text-sm text-muted">
            Un contenu peut être masqué temporairement après plusieurs signalements, en attendant un examen par l'équipe.
            Ce n'est pas une sanction définitive. Nous nous efforçons de traiter les contestations sous 7 jours.
          </p>
          {q.data.map((item) => <HiddenItem key={`${item.target_type}-${item.target_id}`} item={item} />)}
        </div>
      )}
    </div>
  );
}

function HiddenItem({ item }: { item: HiddenContent }) {
  const [message, setMessage] = useState('');
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string>();
  const qc = useQueryClient();
  const toast = useToast();

  async function send() {
    if (message.trim().length < 5) {
      setError('Expliquez en quelques mots pourquoi ce contenu devrait être rétabli.');
      return;
    }
    setPending(true);
    setError(undefined);
    try {
      await submitAppeal(item.target_type, item.target_id, message.trim());
      toast.show('Contestation envoyée.');
      setMessage('');
      await qc.invalidateQueries({ queryKey: ['moderation', 'mine'] });
    } catch (e) {
      setError(errorMessage(e));
    } finally {
      setPending(false);
    }
  }

  return (
    <CardSection title={item.label}>
      <div className="flex flex-wrap gap-2">
        <Badge tone="warning">{item.hidden_reason === 'auto_reports' || item.hidden_reason === 'reports' ? 'Masqué suite à des signalements' : 'Masqué par la modération'}</Badge>
        {item.appeal_status && <Badge tone={item.appeal_status === 'accepted' ? 'success' : 'neutral'}>{APPEAL_LABEL[item.appeal_status]}</Badge>}
      </div>
      {item.appeal_status !== 'open' && (
        <div className="mt-4 space-y-3">
          <Field label="Votre contestation" error={error}>
            {(p) => <Textarea {...p} rows={3} maxLength={2000} value={message} onChange={(e) => setMessage(e.target.value)} />}
          </Field>
          <Button variant="navy" loading={pending} onClick={() => void send()}>Envoyer la contestation</Button>
        </div>
      )}
    </CardSection>
  );
}
