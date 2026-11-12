import { Link } from 'react-router';
import { MapPin } from 'lucide-react';
import { Card } from '@/components/ui/Card';
import { Avatar } from '@/components/ui/Avatar';
import { buttonClass } from '@/components/ui/Button';
import { publicImageUrl } from '@/lib/storage';
import type { ProviderSearchResult } from '@/types/models';
import { AvailabilityBadge, DemoBadge } from './StatusBadges';

export function ProviderCard({ provider, onContact, contactPending }: {
  provider: ProviderSearchResult; onContact?: () => void; contactPending?: boolean;
}) {
  return (
    <Card className="flex flex-col p-4">
      <div className="flex gap-3">
        <Avatar src={publicImageUrl('avatars', provider.avatar_path)} name={provider.public_name} size="lg" />
        <div className="min-w-0 flex-1">
          <h3 className="truncate text-lg font-semibold">
            <Link to={`/prestataires/${provider.id}`} className="hover:underline">{provider.public_name}</Link>
          </h3>
          <p className="font-medium text-brand-strong">{provider.main_trade_name}</p>
          <p className="mt-0.5 flex items-center gap-1 text-sm text-muted">
            <MapPin className="size-4 shrink-0" aria-hidden /> {provider.commune_name}
          </p>
        </div>
      </div>
      <div className="mt-3 flex flex-wrap gap-2">
        <AvailabilityBadge value={provider.availability} />
        {provider.is_demo && <DemoBadge />}
      </div>
      <p className="mt-3 line-clamp-2 flex-1 text-sm text-ink/90">{provider.excerpt}</p>
      <div className="mt-4 grid grid-cols-2 gap-2">
        <Link to={`/prestataires/${provider.id}`} className={buttonClass('secondary', 'sm')}>Consulter</Link>
        {onContact ? (
          <button type="button" onClick={onContact} disabled={contactPending} className={buttonClass('primary', 'sm')}>Contacter</button>
        ) : (
          <Link to={`/prestataires/${provider.id}`} className={buttonClass('primary', 'sm')}>Voir la fiche</Link>
        )}
      </div>
    </Card>
  );
}
