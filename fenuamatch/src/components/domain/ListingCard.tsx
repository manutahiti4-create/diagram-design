import { Link } from 'react-router';
import { CalendarDays, Camera, MapPin, Wallet } from 'lucide-react';
import { Card, Badge } from '@/components/ui/Card';
import { formatPlainDate, formatSince, formatXpf, pluralize } from '@/lib/format';
import { DATE_MODE_LABELS } from '@/lib/labels';
import { nameById, useCategories } from '@/services/reference';
import type { ListingCardData } from '@/services/listings';
import { ListingStatusBadge } from './StatusBadges';

export function ListingCard({ listing, showStatus, href }: { listing: ListingCardData; showStatus?: boolean; href?: string }) {
  const { data: categories } = useCategories();
  return (
    <Card className="relative p-4 transition-shadow hover:shadow-md">
      <div className="flex items-start justify-between gap-3">
        <h3 className="min-w-0 text-lg font-semibold">
          <Link to={href ?? `/annonces/${listing.id}`} className="after:absolute after:inset-0 hover:underline">{listing.title}</Link>
        </h3>
        {showStatus && <ListingStatusBadge listing={listing} />}
      </div>
      <div className="mt-2 flex flex-wrap gap-1.5">
        {listing.cats.map((c) => (
          <Badge key={c.category_id} tone="brand">{nameById(categories, c.category_id)}</Badge>
        ))}
      </div>
      <p className="mt-2 line-clamp-2 text-sm text-ink/90">{listing.description}</p>
      <ul className="mt-3 flex flex-wrap gap-x-4 gap-y-1 text-sm text-muted">
        <li className="flex items-center gap-1"><MapPin className="size-4" aria-hidden />{listing.commune?.name}</li>
        <li className="flex items-center gap-1"><CalendarDays className="size-4" aria-hidden />
          {listing.date_mode === 'precise' ? formatPlainDate(listing.desired_date) : DATE_MODE_LABELS[listing.date_mode]}
        </li>
        {listing.budget_xpf !== null && <li className="flex items-center gap-1"><Wallet className="size-4" aria-hidden />{formatXpf(listing.budget_xpf)}</li>}
        {listing.photos.length > 0 && <li className="flex items-center gap-1"><Camera className="size-4" aria-hidden />{pluralize(listing.photos.length, 'photo')}</li>}
        {listing.proposals_count !== undefined && <li className="font-semibold text-navy">{pluralize(listing.proposals_count, 'proposition')}</li>}
      </ul>
      <p className="mt-2 text-xs text-muted">
        {listing.published_at ? `Publiée ${formatSince(listing.published_at)}` : 'Brouillon'}
        {listing.client && ` · par ${listing.client.username}`}
      </p>
    </Card>
  );
}
