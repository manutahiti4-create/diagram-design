import { useState } from 'react';
import { Link } from 'react-router';
import { useQueryClient } from '@tanstack/react-query';
import { Badge, Card, CardSection } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { PageLoader } from '@/components/ui/Spinner';
import { EmptyState, ErrorState } from '@/components/ui/States';
import { useToast } from '@/components/ui/Toast';
import { cn } from '@/components/ui/cn';
import { errorMessage } from '@/lib/errors';
import { formatDateTime } from '@/lib/format';
import { REPORT_REASON_LABELS, REPORT_TARGET_LABELS } from '@/lib/labels';
import { adminResolveAppeal, adminResolveReports, useAppeals, useReportQueue } from '@/services/moderation';
import type { ReportQueueItem, ReportReason, ReportStatus } from '@/types/models';
import { ReasonDialog } from './ReasonDialog';

export default function AdminReports() {
  const [status, setStatus] = useState<ReportStatus>('open');
  const q = useReportQueue(status);
  const appeals = useAppeals();
  const qc = useQueryClient();
  const toast = useToast();
  const [pending, setPending] = useState<{ item: ReportQueueItem; decision: 'upheld' | 'dismissed' } | null>(null);
  const [appealAction, setAppealAction] = useState<{ id: string; accept: boolean } | null>(null);

  async function resolve(note: string) {
    if (!pending) return;
    try {
      await adminResolveReports(pending.item.target_type, pending.item.target_id, pending.decision, note);
      toast.show('Décision enregistrée.');
      setPending(null);
      await qc.invalidateQueries({ queryKey: ['admin'] });
    } catch (e) {
      toast.show(errorMessage(e), 'error');
    }
  }

  async function resolveAppeal(note: string) {
    if (!appealAction) return;
    try {
      await adminResolveAppeal(appealAction.id, appealAction.accept, note);
      toast.show('Contestation traitée.');
      setAppealAction(null);
      await qc.invalidateQueries({ queryKey: ['admin'] });
    } catch (e) {
      toast.show(errorMessage(e), 'error');
    }
  }

  return (
    <div className="space-y-6">
      {Boolean(appeals.data?.length) && (
        <CardSection title={`Contestations en attente (${appeals.data!.length})`}>
          <ul className="space-y-3">
            {appeals.data!.map((a) => (
              <li key={a.id} className="rounded-xl border border-line p-3">
                <p className="text-sm text-muted">{REPORT_TARGET_LABELS[a.target_type]} · {formatDateTime(a.created_at)}</p>
                <p className="mt-1 whitespace-pre-line">{a.message}</p>
                <div className="mt-2 flex gap-2">
                  <Button size="sm" onClick={() => setAppealAction({ id: a.id, accept: true })}>Accepter (rétablir)</Button>
                  <Button size="sm" variant="secondary" onClick={() => setAppealAction({ id: a.id, accept: false })}>Refuser</Button>
                </div>
              </li>
            ))}
          </ul>
        </CardSection>
      )}

      <div className="flex gap-1">
        {(['open', 'upheld', 'dismissed'] as ReportStatus[]).map((s) => (
          <button key={s} type="button" onClick={() => setStatus(s)}
            className={cn('min-h-10 rounded-lg px-3 text-sm font-semibold', status === s ? 'bg-navy text-white' : 'bg-white text-navy ring-1 ring-line')}>
            {{ open: 'À traiter', upheld: 'Maintenus', dismissed: 'Rejetés' }[s]}
          </button>
        ))}
      </div>

      {q.isPending ? <PageLoader /> : q.isError ? <ErrorState error={q.error} /> : !q.data?.length ? (
        <EmptyState title="Aucun signalement" message={status === 'open' ? 'Rien à traiter pour le moment.' : undefined} />
      ) : (
        <ul className="space-y-3">
          {q.data.map((r) => (
            <li key={`${r.target_type}-${r.target_id}`}>
              <Card className="p-4">
                <div className="flex flex-wrap items-center gap-2">
                  <Badge tone="navy">{REPORT_TARGET_LABELS[r.target_type]}</Badge>
                  <Badge tone="danger">{r.report_count} signalement(s)</Badge>
                  {r.is_hidden && <Badge tone="warning">Actuellement masqué</Badge>}
                  <span className="text-xs text-muted">depuis le {formatDateTime(r.first_reported_at)}</span>
                </div>
                <p className="mt-2 text-sm">Auteur : <strong>@{r.owner_username ?? 'compte supprimé'}</strong></p>
                <p className="text-sm">Motifs : {r.reasons.map((x) => REPORT_REASON_LABELS[x as ReportReason] ?? x).join(', ')}</p>
                {r.preview && <blockquote className="mt-2 rounded-lg bg-surface p-3 text-sm whitespace-pre-line">{r.preview}</blockquote>}
                {r.details.length > 0 && (
                  <details className="mt-2 text-sm"><summary className="cursor-pointer font-semibold">Précisions des signalements</summary>
                    <ul className="mt-1 list-disc pl-5">{r.details.map((d, i) => <li key={i}>{d}</li>)}</ul>
                  </details>
                )}
                <div className="mt-3 flex flex-wrap gap-2">
                  {r.link_path && <Link to={r.link_path} className="text-sm font-semibold text-brand-strong underline">Voir le contenu</Link>}
                  {status === 'open' && <>
                    <Button size="sm" variant="danger" onClick={() => setPending({ item: r, decision: 'upheld' })}>Masquer / maintenir masqué</Button>
                    <Button size="sm" variant="secondary" onClick={() => setPending({ item: r, decision: 'dismissed' })}>Rejeter les signalements</Button>
                  </>}
                </div>
              </Card>
            </li>
          ))}
        </ul>
      )}

      <ReasonDialog open={Boolean(pending)} onClose={() => setPending(null)} onConfirm={resolve} required={pending?.decision === 'upheld'}
        danger={pending?.decision === 'upheld'}
        title={pending?.decision === 'upheld' ? 'Maintenir le contenu masqué ?' : 'Rejeter les signalements ?'}
        message={pending?.decision === 'upheld' ? 'Le contenu restera masqué. L\'auteur sera informé et pourra contester.'
          : 'Les signalements seront classés. Si le contenu avait été masqué automatiquement, il redeviendra visible.'}
        confirmLabel="Confirmer" />
      <ReasonDialog open={Boolean(appealAction)} onClose={() => setAppealAction(null)} onConfirm={resolveAppeal} required={false}
        title={appealAction?.accept ? 'Accepter la contestation ?' : 'Refuser la contestation ?'}
        message={appealAction?.accept ? 'Le contenu sera rétabli.' : 'Le contenu restera masqué.'} confirmLabel="Confirmer" />
    </div>
  );
}
