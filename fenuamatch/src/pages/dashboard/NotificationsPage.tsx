import { Link } from 'react-router';
import { useQueryClient } from '@tanstack/react-query';
import { Bell, CheckCheck, Trash2 } from 'lucide-react';
import { useAuth } from '@/auth/AuthProvider';
import { Button } from '@/components/ui/Button';
import { Card, PageHeader } from '@/components/ui/Card';
import { CardSkeletonList } from '@/components/ui/Spinner';
import { EmptyState, ErrorState } from '@/components/ui/States';
import { useToast } from '@/components/ui/Toast';
import { cn } from '@/components/ui/cn';
import { errorMessage } from '@/lib/errors';
import { formatDateTime } from '@/lib/format';
import { deleteNotification, markNotificationsRead, useNotifications } from '@/services/notifications';
import type { Notification } from '@/types/models';

export function NotificationItem({ n, onOpen, onDelete }: { n: Notification; onOpen: () => void; onDelete?: () => void }) {
  const content = (
    <>
      <span className={cn('mt-1.5 size-2.5 shrink-0 rounded-full', n.read_at ? 'bg-transparent' : 'bg-brand')} aria-hidden />
      <span className="min-w-0 flex-1">
        <span className={cn('block', n.read_at ? 'font-medium text-ink' : 'font-bold text-navy')}>{n.title}{!n.read_at && <span className="sr-only"> (non lue)</span>}</span>
        {n.body && <span className="block text-sm text-muted">{n.body}</span>}
        <span className="mt-0.5 block text-xs text-muted">{formatDateTime(n.created_at)}</span>
      </span>
    </>
  );
  return (
    <li className="flex items-start gap-2 px-4 py-3">
      {n.link_path ? <Link to={n.link_path} onClick={onOpen} className="flex flex-1 items-start gap-3 hover:underline-offset-2">{content}</Link>
        : <button type="button" onClick={onOpen} className="flex flex-1 items-start gap-3 text-left">{content}</button>}
      {onDelete && (
        <button type="button" onClick={onDelete} className="rounded-lg p-2 text-muted hover:bg-surface hover:text-danger" aria-label="Supprimer la notification">
          <Trash2 className="size-4" aria-hidden />
        </button>
      )}
    </li>
  );
}

export default function NotificationsPage() {
  const { user } = useAuth();
  const q = useNotifications(user?.id);
  const qc = useQueryClient();
  const toast = useToast();
  const refresh = () => qc.invalidateQueries({ queryKey: ['notifications'] });
  const hasUnread = q.data?.some((n) => !n.read_at);

  return (
    <div className="mx-auto max-w-3xl">
      <PageHeader title="Notifications" action={hasUnread ? (
        <Button variant="secondary" size="sm" icon={<CheckCheck className="size-4" aria-hidden />}
          onClick={() => void markNotificationsRead().then(refresh)}>Tout marquer comme lu</Button>
      ) : undefined} />
      {q.isPending ? <CardSkeletonList /> : q.isError ? <ErrorState error={q.error} onRetry={() => void q.refetch()} /> : !q.data?.length ? (
        <EmptyState icon={<Bell className="size-7" aria-hidden />} title="Aucune notification" message="Vous serez prévenu ici des nouveaux messages, propositions et confirmations." />
      ) : (
        <Card className="overflow-hidden">
          <ul className="divide-y divide-line">
            {q.data.map((n) => (
              <NotificationItem key={n.id} n={n}
                onOpen={() => { if (!n.read_at) void markNotificationsRead([n.id]).then(refresh); }}
                onDelete={() => void deleteNotification(n.id).then(refresh).catch((e: unknown) => toast.show(errorMessage(e), 'error'))} />
            ))}
          </ul>
        </Card>
      )}
    </div>
  );
}
