import { Badge } from '@/components/ui/Card';
import {
  AVAILABILITY_LABELS, AVAILABILITY_TONE, LISTING_STATUS_LABELS, LISTING_STATUS_TONE, PROPOSAL_STATUS_LABELS, effectiveListingStatus,
} from '@/lib/labels';
import type { Availability, ListingStatus, ProposalStatus } from '@/types/models';

export function AvailabilityBadge({ value }: { value: Availability }) {
  return <Badge tone={AVAILABILITY_TONE[value]} dot>{AVAILABILITY_LABELS[value]}</Badge>;
}

export function ListingStatusBadge({ listing }: { listing: { status: ListingStatus; expires_at: string | null; is_hidden?: boolean } }) {
  if (listing.is_hidden) return <Badge tone="warning">Masquée — en attente d'examen</Badge>;
  const s = effectiveListingStatus(listing);
  return <Badge tone={LISTING_STATUS_TONE[s]}>{LISTING_STATUS_LABELS[s]}</Badge>;
}

const PROPOSAL_TONE: Record<ProposalStatus, 'brand' | 'warning' | 'success' | 'neutral' | 'navy'> = {
  pending: 'brand', selected: 'warning', accepted: 'success', declined: 'neutral', withdrawn: 'neutral', not_selected: 'neutral', cancelled: 'neutral',
};

export function ProposalStatusBadge({ status }: { status: ProposalStatus }) {
  return <Badge tone={PROPOSAL_TONE[status]}>{PROPOSAL_STATUS_LABELS[status]}</Badge>;
}

export function DemoBadge() {
  return <Badge tone="warning">Compte de démonstration</Badge>;
}
