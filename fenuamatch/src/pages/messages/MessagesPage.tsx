import { Link } from 'react-router';
import { MessageCircle } from 'lucide-react';
import { useAuth } from '@/auth/AuthProvider';
import { Avatar } from '@/components/ui/Avatar';
import { ButtonLink } from '@/components/ui/Button';
import { Card, PageHeader } from '@/components/ui/Card';
import { CardSkeletonList } from '@/components/ui/Spinner';
import { EmptyState, ErrorState } from '@/components/ui/States';
import { cn } from '@/components/ui/cn';
import { formatRelative } from '@/lib/format';
import { publicImageUrl } from '@/lib/storage';
import { useConversations } from '@/services/messages';

export default function MessagesPage() {
  const { user, profile } = useAuth();
  const q = useConversations();
  return (
    <div className="mx-auto max-w-3xl">
      <PageHeader title="Messagerie" />
      {q.isPending ? <CardSkeletonList /> : q.isError ? <ErrorState error={q.error} onRetry={() => void q.refetch()} /> : !q.data?.length ? (
        <EmptyState icon={<MessageCircle className="size-7" aria-hidden />} title="Aucune conversation"
          message={profile?.account_type === 'client'
            ? 'Contactez un prestataire depuis sa fiche, ou publiez une annonce : les réponses arriveront ici.'
            : 'Répondez à une annonce : une conversation s\'ouvrira avec le client.'}
          action={profile?.account_type === 'client' ? <ButtonLink to="/rechercher">Trouver un prestataire</ButtonLink> : <ButtonLink to="/annonces">Voir les annonces</ButtonLink>} />
      ) : (
        <Card className="divide-y divide-line overflow-hidden">
          {q.data.map((c) => {
            const unread = Number(c.unread_count) > 0;
            return (
              <Link key={c.id} to={`/messages/${c.id}`} className="flex items-center gap-3 px-4 py-3 hover:bg-surface">
                <Avatar src={publicImageUrl('avatars', c.other_avatar_path)} name={c.other_display_name} />
                <div className="min-w-0 flex-1">
                  <div className="flex items-baseline justify-between gap-2">
                    <p className={cn('truncate', unread ? 'font-bold text-navy' : 'font-semibold text-ink')}>{c.other_display_name ?? 'Compte supprimé'}</p>
                    <span className="shrink-0 text-xs text-muted">{formatRelative(c.last_message_at)}</span>
                  </div>
                  {c.listing_title && <p className="truncate text-xs font-medium text-brand-strong">{c.listing_title}</p>}
                  <div className="flex items-center gap-2">
                    <p className={cn('truncate text-sm', unread ? 'font-semibold text-ink' : 'text-muted')}>
                      {c.last_sender_id === user?.id && 'Vous : '}{c.last_message_preview ?? 'Nouvelle conversation'}
                    </p>
                    {unread && <span className="ml-auto min-w-5 rounded-full bg-brand px-1.5 text-center text-xs leading-5 font-bold text-navy">{c.unread_count}<span className="sr-only"> non lus</span></span>}
                  </div>
                </div>
              </Link>
            );
          })}
        </Card>
      )}
    </div>
  );
}
