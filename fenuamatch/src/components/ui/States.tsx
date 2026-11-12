import type { ReactNode } from 'react';
import { AlertTriangle, Inbox } from 'lucide-react';
import { Button } from './Button';
import { errorMessage } from '@/lib/errors';

export function EmptyState({ icon, title, message, action }: { icon?: ReactNode; title: string; message?: ReactNode; action?: ReactNode }) {
  return (
    <div className="flex flex-col items-center rounded-2xl border border-dashed border-line bg-white px-6 py-10 text-center">
      <div className="mb-3 flex size-14 items-center justify-center rounded-full bg-brand-50 text-brand-strong">
        {icon ?? <Inbox className="size-7" aria-hidden />}
      </div>
      <h2 className="text-lg font-semibold">{title}</h2>
      {message && <p className="mt-1 max-w-md text-muted">{message}</p>}
      {action && <div className="mt-5">{action}</div>}
    </div>
  );
}

export function ErrorState({ title = 'Impossible d\'afficher cette page', message, error, onRetry }: {
  title?: string; message?: ReactNode; error?: unknown; onRetry?: () => void;
}) {
  return (
    <div className="flex flex-col items-center rounded-2xl border border-danger/20 bg-danger-50 px-6 py-10 text-center" role="alert">
      <AlertTriangle className="mb-3 size-10 text-danger" aria-hidden />
      <h2 className="text-lg font-semibold text-danger">{title}</h2>
      <p className="mt-1 max-w-md text-ink">{message ?? errorMessage(error)}</p>
      {onRetry && <Button variant="secondary" className="mt-5" onClick={onRetry}>Réessayer</Button>}
    </div>
  );
}
