import { Link } from 'react-router';
import { useAuth } from '@/auth/AuthProvider';
import { ButtonLink } from '@/components/ui/Button';
import { Card, PageHeader } from '@/components/ui/Card';
import { CardSkeletonList } from '@/components/ui/Spinner';
import { EmptyState, ErrorState } from '@/components/ui/States';
import { ProposalStatusBadge } from '@/components/domain/StatusBadges';
import { formatSince, formatXpf } from '@/lib/format';
import { useMyProposals } from '@/services/listings';

export default function MyProposalsPage() {
  const { user } = useAuth();
  const q = useMyProposals(user?.id);
  return (
    <div>
      <PageHeader title="Mes propositions" subtitle="Les annonces auxquelles vous avez répondu."
        action={<ButtonLink to="/annonces" size="sm">Voir les annonces</ButtonLink>} />
      {q.isPending ? <CardSkeletonList /> : q.isError ? <ErrorState error={q.error} onRetry={() => void q.refetch()} /> : !q.data?.length ? (
        <EmptyState title="Aucune proposition pour l'instant" message="Parcourez les annonces et répondez à celles qui correspondent à vos métiers."
          action={<ButtonLink to="/annonces">Voir les annonces</ButtonLink>} />
      ) : (
        <ul className="space-y-3">
          {q.data.map((p) => (
            <li key={p.id}>
              <Card className="relative p-4">
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <h2 className="text-lg font-semibold">
                    <Link to={`/annonces/${p.listing_id}`} className="after:absolute after:inset-0 hover:underline">{p.listing?.title ?? 'Annonce'}</Link>
                  </h2>
                  <ProposalStatusBadge status={p.status} />
                </div>
                <p className="mt-1 line-clamp-2 text-sm text-muted">{p.message}</p>
                <p className="mt-2 text-xs text-muted">
                  Envoyée {formatSince(p.created_at)}{p.price_xpf !== null && ` · prix indicatif ${formatXpf(p.price_xpf)}`}
                  {p.listing_changed_at && p.status === 'pending' && <strong className="ml-1 text-warning">· annonce modifiée depuis</strong>}
                </p>
              </Card>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
