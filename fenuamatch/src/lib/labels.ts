import type {
  Availability, DateMode, ListingStatus, MissionStatus, ProposalStatus, ReportReason, ReportTarget,
} from '@/types/models';

export const AVAILABILITY_LABELS: Record<Availability, string> = {
  available: 'Disponible',
  busy: 'Occupé',
  unavailable: 'Indisponible',
};

export const LISTING_STATUS_LABELS: Record<ListingStatus, string> = {
  draft: 'Brouillon',
  published: 'Publiée',
  in_discussion: 'En discussion',
  awaiting_confirmation: 'En attente de confirmation',
  assigned: 'Attribuée',
  completed: 'Terminée',
  expired: 'Expirée',
  cancelled: 'Annulée',
};

export const PROPOSAL_STATUS_LABELS: Record<ProposalStatus, string> = {
  pending: 'En attente',
  selected: 'Choisie — à confirmer',
  accepted: 'Mission confirmée',
  declined: 'Non retenue',
  withdrawn: 'Retirée',
  not_selected: 'Autre prestataire choisi',
  cancelled: 'Annulée',
};

export const MISSION_STATUS_LABELS: Record<MissionStatus, string> = {
  awaiting_provider: 'En attente de confirmation du prestataire',
  confirmed: 'Confirmée',
  completed: 'Terminée',
  declined: 'Refusée par le prestataire',
  cancelled: 'Annulée',
};

export const DATE_MODE_LABELS: Record<DateMode, string> = {
  asap: 'Dès que possible',
  precise: 'Date précise',
  flexible: 'Date flexible',
};

export const REPORT_REASON_LABELS: Record<ReportReason, string> = {
  fraud: 'Contenu frauduleux',
  harassment: 'Harcèlement',
  spam: 'Publicité abusive',
  forbidden: 'Contenu interdit',
  impersonation: 'Usurpation d\'identité',
  other: 'Autre',
};

export const REPORT_TARGET_LABELS: Record<ReportTarget, string> = {
  profile: 'Profil',
  listing: 'Annonce',
  message: 'Message',
};

export type Tone = 'neutral' | 'brand' | 'success' | 'warning' | 'danger' | 'navy';

export const LISTING_STATUS_TONE: Record<ListingStatus, Tone> = {
  draft: 'neutral',
  published: 'brand',
  in_discussion: 'brand',
  awaiting_confirmation: 'warning',
  assigned: 'navy',
  completed: 'success',
  expired: 'neutral',
  cancelled: 'neutral',
};

export const AVAILABILITY_TONE: Record<Availability, Tone> = {
  available: 'success',
  busy: 'warning',
  unavailable: 'neutral',
};

/** Le statut affiché tient compte de l'expiration, même avant le passage de la tâche planifiée. */
export function effectiveListingStatus(listing: { status: ListingStatus; expires_at: string | null }): ListingStatus {
  if ((listing.status === 'published' || listing.status === 'in_discussion') && listing.expires_at
      && new Date(listing.expires_at).getTime() <= Date.now()) {
    return 'expired';
  }
  return listing.status;
}

export function isListingOpen(listing: { status: ListingStatus; expires_at: string | null; is_hidden?: boolean }): boolean {
  const s = effectiveListingStatus(listing);
  return (s === 'published' || s === 'in_discussion') && !listing.is_hidden;
}
