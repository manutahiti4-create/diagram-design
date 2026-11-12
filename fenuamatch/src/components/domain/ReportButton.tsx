import { useState } from 'react';
import { Flag } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Dialog } from '@/components/ui/Dialog';
import { Field, Select, Textarea } from '@/components/ui/Field';
import { useToast } from '@/components/ui/Toast';
import { errorMessage } from '@/lib/errors';
import { REPORT_REASON_LABELS, REPORT_TARGET_LABELS } from '@/lib/labels';
import { reportContent } from '@/services/moderation';
import type { ReportReason, ReportTarget } from '@/types/models';

export function ReportButton({ targetType, targetId, compact }: { targetType: ReportTarget; targetId: string; compact?: boolean }) {
  const [open, setOpen] = useState(false);
  const [reason, setReason] = useState<ReportReason | ''>('');
  const [details, setDetails] = useState('');
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const toast = useToast();

  async function submit() {
    if (!reason) {
      setError('Choisissez un motif.');
      return;
    }
    setPending(true);
    setError(null);
    try {
      await reportContent(targetType, targetId, reason, details.trim());
      toast.show('Merci, votre signalement a été transmis à l\'équipe.');
      setOpen(false);
      setReason('');
      setDetails('');
    } catch (e) {
      setError(errorMessage(e));
    } finally {
      setPending(false);
    }
  }

  return (
    <>
      <Button variant="ghost" size="sm" icon={<Flag className="size-4" aria-hidden />} onClick={() => setOpen(true)}
        className={compact ? 'text-muted' : undefined}>
        {compact ? <span className="sr-only">Signaler</span> : 'Signaler'}
      </Button>
      <Dialog open={open} onClose={() => setOpen(false)} title={`Signaler : ${REPORT_TARGET_LABELS[targetType].toLowerCase()}`}
        footer={<>
          <Button variant="secondary" onClick={() => setOpen(false)}>Annuler</Button>
          <Button variant="navy" loading={pending} onClick={() => void submit()}>Envoyer le signalement</Button>
        </>}>
        <div className="space-y-4">
          <p className="text-sm text-muted">Votre signalement est confidentiel. L'équipe FenuaMatch l'examinera.</p>
          <Field label="Motif" required error={error ?? undefined}>
            {(p) => (
              <Select {...p} value={reason} onChange={(e) => setReason(e.target.value as ReportReason)}>
                <option value="">Choisir…</option>
                {Object.entries(REPORT_REASON_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
              </Select>
            )}
          </Field>
          <Field label="Précisions" optional>
            {(p) => <Textarea {...p} rows={3} maxLength={1000} value={details} onChange={(e) => setDetails(e.target.value)} />}
          </Field>
        </div>
      </Dialog>
    </>
  );
}
