import { useState } from 'react';
import { ConfirmDialog } from '@/components/ui/Dialog';
import { Field, Textarea } from '@/components/ui/Field';

/** Demande une justification avant une action sensible (journalisée). */
export function ReasonDialog({ open, title, message, confirmLabel, danger, required = true, onConfirm, onClose }: {
  open: boolean; title: string; message: string; confirmLabel: string; danger?: boolean; required?: boolean;
  onConfirm: (reason: string) => Promise<void>; onClose: () => void;
}) {
  const [reason, setReason] = useState('');
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string>();
  async function go() {
    if (required && !reason.trim()) {
      setError('Indiquez une justification (elle sera enregistrée dans le journal).');
      return;
    }
    setPending(true);
    try {
      await onConfirm(reason.trim());
      setReason('');
      setError(undefined);
    } finally {
      setPending(false);
    }
  }
  return (
    <ConfirmDialog open={open} title={title} message={message} confirmLabel={confirmLabel} danger={danger} loading={pending}
      onConfirm={() => void go()} onClose={() => { setReason(''); setError(undefined); onClose(); }}>
      <Field label="Justification" required={required} optional={!required} error={error}>
        {(p) => <Textarea {...p} rows={3} maxLength={500} value={reason} onChange={(e) => setReason(e.target.value)} />}
      </Field>
    </ConfirmDialog>
  );
}
