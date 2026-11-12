import { useState } from 'react';
import { Plus } from 'lucide-react';
import { useAuth } from '@/auth/AuthProvider';
import { ButtonLink } from '@/components/ui/Button';
import { PageHeader } from '@/components/ui/Card';
import { CardSkeletonList } from '@/components/ui/Spinner';
import { EmptyState, ErrorState } from '@/components/ui/States';
import { cn } from '@/components/ui/cn';
import { ListingCard } from '@/components/domain/ListingCard';
import { effectiveListingStatus } from '@/lib/labels';
import { useMyListings, type ListingCardData } from '@/services/listings';

const TABS = [
  { key: 'active', label: 'En cours', match: (l: ListingCardData) => ['draft', 'published', 'in_discussion', 'awaiting_confirmation', 'assigned'].includes(effectiveListingStatus(l)) },
  { key: 'expired', label: 'Expirées', match: (l: ListingCardData) => effectiveListingStatus(l) === 'expired' },
  { key: 'closed', label: 'Terminées / annulées', match: (l: ListingCardData) => ['completed', 'cancelled'].includes(l.status) },
] as const;

export default function MyListingsPage() {
  const { user } = useAuth();
  const q = useMyListings(user?.id);
  const [tab, setTab] = useState<(typeof TABS)[number]['key']>('active');
  const current = TABS.find((t) => t.key === tab)!;
  const items = (q.data ?? []).filter(current.match);

  return (
    <div>
      <PageHeader title="Mes annonces" action={<ButtonLink to="/annonces/nouvelle" size="sm" icon={<Plus className="size-4" aria-hidden />}>Publier une annonce</ButtonLink>} />
      <div role="tablist" aria-label="Filtrer mes annonces" className="mb-4 flex gap-1 overflow-x-auto rounded-xl bg-white p-1 ring-1 ring-line">
        {TABS.map((t) => {
          const count = (q.data ?? []).filter(t.match).length;
          return (
            <button key={t.key} role="tab" aria-selected={tab === t.key} onClick={() => setTab(t.key)}
              className={cn('min-h-10 flex-1 rounded-lg px-3 text-sm font-semibold whitespace-nowrap', tab === t.key ? 'bg-navy text-white' : 'text-navy hover:bg-surface')}>
              {t.label} ({count})
            </button>
          );
        })}
      </div>
      {q.isPending ? <CardSkeletonList /> : q.isError ? <ErrorState error={q.error} onRetry={() => void q.refetch()} /> : items.length === 0 ? (
        <EmptyState title="Aucune annonce ici" message={tab === 'active' ? 'Décrivez votre besoin : les prestataires de Tahiti pourront vous répondre.' : undefined}
          action={tab === 'active' ? <ButtonLink to="/annonces/nouvelle">Publier une annonce</ButtonLink> : undefined} />
      ) : (
        <div className="grid grid-cols-1 gap-3 lg:grid-cols-2">{items.map((l) => <ListingCard key={l.id} listing={l} showStatus />)}</div>
      )}
    </div>
  );
}
