import { useState, type ReactNode } from 'react';
import { Link, useNavigate, useParams } from 'react-router';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { CalendarDays, Clock, MapPin, MessageCircle, Pencil, RefreshCw, Wallet } from 'lucide-react';
import { useAuth } from '@/auth/AuthProvider';
import { Avatar } from '@/components/ui/Avatar';
import { Badge, Card, CardSection, Notice } from '@/components/ui/Card';
import { Button, ButtonLink } from '@/components/ui/Button';
import { ConfirmDialog, Dialog } from '@/components/ui/Dialog';
import { Field, Input, Textarea } from '@/components/ui/Field';
import { PageLoader } from '@/components/ui/Spinner';
import { EmptyState, ErrorState } from '@/components/ui/States';
import { useToast } from '@/components/ui/Toast';
import { BackLink } from '@/components/domain/BackLink';
import { ListingStatusBadge, ProposalStatusBadge, DemoBadge, AvailabilityBadge } from '@/components/domain/StatusBadges';
import { ReportButton } from '@/components/domain/ReportButton';
import { LIMITS } from '@/config/brand';
import { errorMessage } from '@/lib/errors';
import { daysUntil, formatDate, formatPlainDate, formatSince, formatXpf } from '@/lib/format';
import { DATE_MODE_LABELS, MISSION_STATUS_LABELS, effectiveListingStatus, isListingOpen } from '@/lib/labels';
import { publicImageUrl, signedListingUrls } from '@/lib/storage';
import { supabase } from '@/lib/supabase';
import { proposalSchema, type ProposalValues } from '@/schemas/listing';
import {
  cancelListing, closeMission, deleteDraft, missionAction, proposalAction, publishListing, renewListing, submitProposal,
  useListing, useListingMissions, useListingProposals, type ListingDetails, type ProposalWithProvider,
} from '@/services/listings';
import { startConversation } from '@/services/messages';
import { nameById, useCategories, useTrades } from '@/services/reference';
import type { Mission } from '@/types/models';

type PendingAction =
  | { kind: 'select'; proposal: ProposalWithProvider }
  | { kind: 'decline'; proposal: ProposalWithProvider }
  | { kind: 'withdraw'; proposalId: string }
  | { kind: 'confirm'; mission: Mission }
  | { kind: 'declineMission'; mission: Mission }
  | { kind: 'cancelMission'; mission: Mission }
  | { kind: 'complete'; mission: Mission }
  | { kind: 'cancelListing' }
  | { kind: 'deleteDraft' };

export default function ListingDetailPage() {
  const { id } = useParams();
  const { user, profile } = useAuth();
  const navigate = useNavigate();
  const qc = useQueryClient();
  const toast = useToast();
  const listingQuery = useListing(id);
  const details = listingQuery.data;
  const isOwner = Boolean(details && user && details.listing.client_id === user.id);
  const proposals = useListingProposals(id, Boolean(details));
  const missions = useListingMissions(id, Boolean(details));
  const { data: categories } = useCategories();
  const photos = useQuery({
    queryKey: ['listing', id, 'photo-urls', details?.photos.map((p) => p.storage_path).join('|')],
    enabled: Boolean(details?.photos.length),
    staleTime: 30 * 60_000,
    queryFn: () => signedListingUrls(details!.photos.map((p) => p.storage_path)),
  });
  const [action, setAction] = useState<PendingAction | null>(null);
  const [reason, setReason] = useState('');
  const [busy, setBusy] = useState(false);
  const [zoom, setZoom] = useState<string | null>(null);

  if (listingQuery.isPending) return <PageLoader />;
  if (listingQuery.isError) return <ErrorState error={listingQuery.error} onRetry={() => void listingQuery.refetch()} />;
  if (!details) {
    return <EmptyState title="Annonce introuvable" message="Cette annonce n'existe pas, a été retirée ou n'est plus visible."
      action={<ButtonLink to="/annonces">Voir les annonces</ButtonLink>} />;
  }

  const { listing } = details;
  const status = effectiveListingStatus(listing);
  const open = isListingOpen(listing);
  const activeMission = missions.data?.find((m) => m.status === 'awaiting_provider' || m.status === 'confirmed') ?? null;
  const lastMission = missions.data?.[0] ?? null;
  const myProposal = proposals.data?.find((p) => p.provider_id === user?.id) ?? null;
  const myMission = activeMission && activeMission.provider_id === user?.id ? activeMission : null;
  const editable = ['draft', 'published', 'in_discussion', 'expired'].includes(status) && (listing.status === 'draft' || listing.edit_count < LIMITS.listingEdits);
  const canRenew = status === 'expired' || (open && listing.expires_at !== null && daysUntil(listing.expires_at) <= 3);

  async function refresh() {
    await Promise.all([
      qc.invalidateQueries({ queryKey: ['listing', id] }),
      qc.invalidateQueries({ queryKey: ['listings'] }),
      qc.invalidateQueries({ queryKey: ['proposals'] }),
      qc.invalidateQueries({ queryKey: ['missions'] }),
      qc.invalidateQueries({ queryKey: ['notifications'] }),
    ]);
  }

  async function run(fn: () => Promise<unknown>, success: string) {
    setBusy(true);
    try {
      await fn();
      toast.show(success);
      setAction(null);
      setReason('');
      await refresh();
    } catch (e) {
      toast.show(errorMessage(e), 'error');
      await refresh();
    } finally {
      setBusy(false);
    }
  }

  async function quick(fn: () => Promise<unknown>, success: string) {
    await run(fn, success);
  }

  async function openChat(providerId: string) {
    try {
      const conv = await startConversation(providerId);
      navigate(`/messages/${conv}`);
    } catch (e) {
      toast.show(errorMessage(e), 'error');
    }
  }

  function executePending() {
    if (!action) return;
    switch (action.kind) {
      case 'select': return run(() => proposalAction('select_proposal', action.proposal.id), 'Proposition choisie. Le prestataire doit maintenant confirmer.');
      case 'decline': return run(() => proposalAction('decline_proposal', action.proposal.id), 'Proposition refusée.');
      case 'withdraw': return run(() => proposalAction('withdraw_proposal', action.proposalId), 'Proposition retirée.');
      case 'confirm': return run(() => missionAction('confirm_mission', action.mission.id), 'Mission confirmée. Bon travail !');
      case 'declineMission': return run(() => closeMission('decline_mission', action.mission.id, reason), 'Mission refusée.');
      case 'cancelMission': return run(() => closeMission('cancel_mission', action.mission.id, reason), 'Mission annulée.');
      case 'complete': return run(() => missionAction('complete_mission', action.mission.id), 'Mission marquée comme terminée.');
      case 'cancelListing': return run(() => cancelListing(listing.id), 'Annonce annulée.');
      case 'deleteDraft': return run(async () => {
        await deleteDraft(listing.id, details!.photos.map((p) => p.storage_path));
        navigate('/mes-annonces', { replace: true });
      }, 'Brouillon supprimé.');
    }
  }

  return (
    <div className="mx-auto max-w-3xl space-y-4">
      <BackLink to={isOwner ? '/mes-annonces' : '/annonces'} />

      {listing.is_hidden && isOwner && (
        <Notice tone="warning" title="Annonce masquée en attente d'examen">
          Elle n'est plus visible des autres membres. Vous pouvez <Link to="/parametres/moderation" className="font-semibold underline">contester cette décision</Link>.
        </Notice>
      )}

      <Card className="p-5">
        <div className="flex flex-wrap items-start justify-between gap-2">
          <ListingStatusBadge listing={listing} />
          {!isOwner && <ReportButton targetType="listing" targetId={listing.id} compact />}
        </div>
        <h1 className="mt-2 text-2xl font-bold sm:text-3xl">{listing.title}</h1>
        <div className="mt-2 flex flex-wrap gap-1.5">
          {details.categoryIds.map((c) => <Badge key={c} tone="brand">{nameById(categories, c)}</Badge>)}
        </div>
        <ul className="mt-4 grid gap-2 text-ink sm:grid-cols-2">
          <li className="flex items-center gap-2"><MapPin className="size-5 text-brand-strong" aria-hidden />{details.commune}</li>
          <li className="flex items-center gap-2"><CalendarDays className="size-5 text-brand-strong" aria-hidden />
            {listing.date_mode === 'precise' ? `Le ${formatPlainDate(listing.desired_date)}` : DATE_MODE_LABELS[listing.date_mode]}</li>
          <li className="flex items-center gap-2"><Wallet className="size-5 text-brand-strong" aria-hidden />
            {listing.budget_xpf !== null ? `Budget : ${formatXpf(listing.budget_xpf)}` : 'Budget non précisé'}</li>
          {listing.expires_at && (
            <li className="flex items-center gap-2"><Clock className="size-5 text-brand-strong" aria-hidden />
              {status === 'expired' ? `Expirée le ${formatDate(listing.expires_at)}` : `En ligne jusqu'au ${formatDate(listing.expires_at)}`}</li>
          )}
        </ul>
        <p className="mt-4 whitespace-pre-line">{listing.description}</p>

        {details.photos.length > 0 && (
          <ul className="mt-4 grid grid-cols-3 gap-2">
            {details.photos.map((p, i) => {
              const url = photos.data?.[p.storage_path];
              return (
                <li key={p.id}>
                  <button type="button" onClick={() => url && setZoom(url)} className="block w-full overflow-hidden rounded-xl border border-line bg-surface">
                    {url ? <img src={url} alt={`Photo ${i + 1} de l'annonce`} className="aspect-square w-full object-cover" loading="lazy" />
                      : <span className="block aspect-square w-full animate-pulse bg-slate-200" />}
                  </button>
                </li>
              );
            })}
          </ul>
        )}

        <div className="mt-4 flex items-center gap-2 border-t border-line pt-4 text-sm text-muted">
          <Avatar src={publicImageUrl('avatars', details.client?.avatar_path)} name={details.client?.username} size="sm" />
          <span>Publiée par <strong className="text-ink">{details.client?.username ?? 'compte supprimé'}</strong>
            {listing.published_at && ` ${formatSince(listing.published_at)}`}</span>
          {details.client?.is_demo && <DemoBadge />}
        </div>

        {isOwner && (
          <div className="mt-4 flex flex-wrap gap-2">
            {listing.status === 'draft' && <Button onClick={() => void quick(() => publishListing(listing.id), 'Annonce publiée pour 30 jours.')} loading={busy}>Publier</Button>}
            {editable && <ButtonLink to={`/annonces/${listing.id}/modifier`} variant="secondary" icon={<Pencil className="size-4" aria-hidden />}>
              Modifier{listing.status !== 'draft' ? ` (${LIMITS.listingEdits - listing.edit_count} restante${LIMITS.listingEdits - listing.edit_count > 1 ? 's' : ''})` : ''}
            </ButtonLink>}
            {canRenew && <Button variant="navy" icon={<RefreshCw className="size-4" aria-hidden />} loading={busy}
              onClick={() => void quick(() => renewListing(listing.id), 'Annonce renouvelée pour 30 jours.')}>Renouveler gratuitement</Button>}
            {listing.status === 'draft' && <Button variant="dangerGhost" onClick={() => setAction({ kind: 'deleteDraft' })}>Supprimer le brouillon</Button>}
            {!['draft', 'completed', 'cancelled'].includes(listing.status) && !activeMission && (
              <Button variant="dangerGhost" onClick={() => setAction({ kind: 'cancelListing' })}>Annuler l'annonce</Button>
            )}
          </div>
        )}
      </Card>

      {activeMission && (isOwner || myMission) && (
        <MissionPanel mission={activeMission} isOwner={isOwner} proposals={proposals.data ?? []} onAction={setAction} busy={busy} />
      )}
      {!activeMission && lastMission && (isOwner || lastMission.provider_id === user?.id) && ['completed'].includes(lastMission.status) && (
        <Notice tone="success" title="Mission terminée">Merci d'avoir utilisé FenuaMatch.</Notice>
      )}

      {isOwner ? (
        <ProposalsForOwner proposals={proposals.data} loading={proposals.isPending} canSelect={open && !activeMission}
          onSelect={(p) => setAction({ kind: 'select', proposal: p })} onDecline={(p) => setAction({ kind: 'decline', proposal: p })}
          onChat={(pid) => void openChat(pid)} />
      ) : profile?.account_type === 'provider' ? (
        <ProviderSide details={details} myProposal={myProposal} open={open} onWithdraw={(pid) => setAction({ kind: 'withdraw', proposalId: pid })}
          onSubmitted={refresh} />
      ) : (
        <Notice tone="neutral">Seuls les prestataires peuvent répondre aux annonces.</Notice>
      )}

      <ConfirmDialog open={Boolean(action)} onClose={() => { setAction(null); setReason(''); }} loading={busy} onConfirm={() => void executePending()}
        {...dialogText(action)}>
        {(action?.kind === 'cancelMission' || action?.kind === 'declineMission') && (
          <Field label="Motif" optional>
            {(p) => <Textarea {...p} rows={2} maxLength={500} value={reason} onChange={(e) => setReason(e.target.value)} />}
          </Field>
        )}
      </ConfirmDialog>
      <Dialog open={Boolean(zoom)} onClose={() => setZoom(null)} title="Photo de l'annonce">
        {zoom && <img src={zoom} alt="Photo de l'annonce" className="w-full rounded-xl" />}
      </Dialog>
    </div>
  );
}

function dialogText(action: PendingAction | null): { title: string; message: ReactNode; confirmLabel: string; danger?: boolean } {
  switch (action?.kind) {
    case 'select': return {
      title: 'Choisir cette proposition ?',
      message: <>
        <p>Vous choisissez <strong>{action.proposal.provider?.public_name ?? 'ce prestataire'}</strong>. La mission sera attribuée lorsqu'il l'aura confirmée à son tour.</p>
        <p className="text-sm text-muted">Ce choix n'est pas la signature d'un devis : le prix et les conditions se règlent directement entre vous. FenuaMatch ne gère pas les paiements des prestations.</p>
      </>,
      confirmLabel: 'Choisir ce prestataire',
    };
    case 'decline': return { title: 'Refuser cette proposition ?', message: 'Le prestataire sera informé que sa proposition n\'est pas retenue.', confirmLabel: 'Refuser', danger: true };
    case 'withdraw': return { title: 'Retirer votre proposition ?', message: 'Le client sera informé. Vous pourrez proposer à nouveau tant que l\'annonce est ouverte.', confirmLabel: 'Retirer', danger: true };
    case 'confirm': return {
      title: 'Confirmer la mission ?',
      message: <>
        <p>Vous vous engagez auprès du client à réaliser cette prestation. Organisez les détails (date, prix, adresse) avec lui via la messagerie.</p>
        <p className="text-sm text-muted">Cette confirmation n'est pas un devis signé.</p>
      </>,
      confirmLabel: 'Je confirme la mission',
    };
    case 'declineMission': return { title: 'Refuser la mission ?', message: 'L\'annonce redeviendra ouverte pour le client.', confirmLabel: 'Refuser la mission', danger: true };
    case 'cancelMission': return { title: 'Annuler la mission ?', message: 'L\'autre partie sera prévenue et l\'annonce redeviendra ouverte (si elle n\'a pas expiré).', confirmLabel: 'Annuler la mission', danger: true };
    case 'complete': return { title: 'Prestation terminée ?', message: 'L\'annonce sera clôturée comme terminée.', confirmLabel: 'Oui, c\'est terminé' };
    case 'cancelListing': return { title: 'Annuler cette annonce ?', message: 'Elle ne recevra plus de propositions. Les prestataires ayant répondu seront prévenus. Cette action est définitive.', confirmLabel: 'Annuler l\'annonce', danger: true };
    case 'deleteDraft': return { title: 'Supprimer ce brouillon ?', message: 'Le brouillon et ses photos seront supprimés définitivement.', confirmLabel: 'Supprimer', danger: true };
    default: return { title: '', message: '', confirmLabel: '' };
  }
}

function MissionPanel({ mission, isOwner, proposals, onAction, busy }: {
  mission: Mission; isOwner: boolean; proposals: ProposalWithProvider[]; onAction: (a: PendingAction) => void; busy: boolean;
}) {
  const provider = proposals.find((p) => p.id === mission.proposal_id);
  return (
    <CardSection title="Mission" className="border-2 border-brand/40">
      <p className="font-semibold text-navy">{MISSION_STATUS_LABELS[mission.status]}</p>
      {isOwner && provider?.provider && <p className="mt-1 text-muted">Prestataire choisi : <Link to={`/prestataires/${provider.provider_id}`} className="font-semibold text-brand-strong underline">{provider.provider.public_name}</Link></p>}
      {mission.status === 'awaiting_provider' && isOwner && (
        <p className="mt-2 text-sm text-muted">Le prestataire a été prévenu. La mission sera attribuée lorsqu'il l'aura confirmée.</p>
      )}
      {mission.status === 'awaiting_provider' && !isOwner && (
        <p className="mt-2 text-sm">Le client vous a choisi. Confirmez si vous acceptez de réaliser cette mission.</p>
      )}
      <div className="mt-4 flex flex-wrap gap-2">
        {mission.status === 'awaiting_provider' && !isOwner && <>
          <Button loading={busy} onClick={() => onAction({ kind: 'confirm', mission })}>Confirmer la mission</Button>
          <Button variant="secondary" onClick={() => onAction({ kind: 'declineMission', mission })}>Refuser</Button>
        </>}
        {mission.status === 'confirmed' && isOwner && <Button onClick={() => onAction({ kind: 'complete', mission })}>Marquer comme terminée</Button>}
        {(isOwner || mission.status === 'confirmed') && (
          <Button variant="dangerGhost" onClick={() => onAction({ kind: 'cancelMission', mission })}>Annuler la mission</Button>
        )}
      </div>
    </CardSection>
  );
}

function ProposalsForOwner({ proposals, loading, canSelect, onSelect, onDecline, onChat }: {
  proposals: ProposalWithProvider[] | undefined; loading: boolean; canSelect: boolean;
  onSelect: (p: ProposalWithProvider) => void; onDecline: (p: ProposalWithProvider) => void; onChat: (providerId: string) => void;
}) {
  const { data: trades } = useTrades();
  if (loading) return <PageLoader />;
  return (
    <CardSection title={`Propositions reçues (${proposals?.length ?? 0})`}>
      {!proposals?.length ? (
        <p className="text-muted">Aucune proposition pour le moment. Les prestataires intéressés vous répondront ici et vous serez prévenu.</p>
      ) : (
        <ul className="space-y-3">
          {proposals.map((p) => (
            <li key={p.id} className="rounded-xl border border-line p-4">
              <div className="flex items-start gap-3">
                <Avatar src={publicImageUrl('avatars', p.providerProfile?.avatar_path)} name={p.provider?.public_name} />
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    {p.provider_id ? (
                      <Link to={`/prestataires/${p.provider_id}`} className="font-semibold text-navy hover:underline">{p.provider?.public_name ?? p.providerProfile?.username}</Link>
                    ) : <span className="font-semibold text-muted">Compte supprimé</span>}
                    <ProposalStatusBadge status={p.status} />
                    {p.providerProfile?.is_demo && <DemoBadge />}
                  </div>
                  <p className="text-sm text-muted">
                    {nameById(trades, p.provider?.main_trade_id)}{p.provider && <> · <AvailabilityBadge value={p.provider.availability} /></>}
                  </p>
                </div>
              </div>
              <p className="mt-3 whitespace-pre-line">{p.message}</p>
              {p.price_xpf !== null && <p className="mt-2 font-semibold text-navy">Prix indicatif : {formatXpf(p.price_xpf)}</p>}
              <p className="mt-1 text-xs text-muted">Reçue {formatSince(p.created_at)}</p>
              {p.provider_id && (
                <div className="mt-3 flex flex-wrap gap-2">
                  <Button variant="secondary" size="sm" icon={<MessageCircle className="size-4" aria-hidden />} onClick={() => onChat(p.provider_id!)}>Discuter</Button>
                  {p.status === 'pending' && canSelect && <>
                    <Button size="sm" onClick={() => onSelect(p)}>Choisir</Button>
                    <Button variant="ghost" size="sm" onClick={() => onDecline(p)}>Refuser</Button>
                  </>}
                </div>
              )}
            </li>
          ))}
        </ul>
      )}
    </CardSection>
  );
}

function ProviderSide({ details, myProposal, open, onWithdraw, onSubmitted }: {
  details: ListingDetails; myProposal: ProposalWithProvider | null; open: boolean; onWithdraw: (id: string) => void; onSubmitted: () => Promise<void>;
}) {
  const { user } = useAuth();
  const toast = useToast();
  const myProvider = useQuery({
    queryKey: ['provider', user?.id, 'status'],
    queryFn: async () => {
      const { data } = await supabase.from('provider_profiles').select('is_published, is_hidden').eq('id', user!.id).maybeSingle();
      return data;
    },
  });
  const conversation = useQuery({
    queryKey: ['conversation-with', details.listing.client_id],
    enabled: Boolean(myProposal),
    queryFn: async () => {
      const { data } = await supabase.from('conversations').select('id').eq('client_id', details.listing.client_id).eq('provider_id', user!.id).maybeSingle();
      return data?.id ?? null;
    },
  });
  const { register, handleSubmit, reset, formState: { errors, isSubmitting } } = useForm<ProposalValues>({
    resolver: zodResolver(proposalSchema), defaultValues: { message: '', price: '' },
  });

  async function onSubmit(values: ProposalValues) {
    try {
      await submitProposal(details.listing.id, values.message, values.price ? Number(values.price) : undefined);
      toast.show('Proposition envoyée. Le client est prévenu.');
      reset();
      await onSubmitted();
    } catch (e) {
      toast.show(errorMessage(e), 'error');
    }
  }

  if (myProposal && myProposal.status !== 'withdrawn') {
    return (
      <CardSection title="Votre proposition">
        <div className="flex flex-wrap items-center gap-2"><ProposalStatusBadge status={myProposal.status} /><span className="text-sm text-muted">envoyée {formatSince(myProposal.created_at)}</span></div>
        {myProposal.listing_changed_at && myProposal.status === 'pending' && (
          <Notice tone="warning" className="mt-3">Le client a modifié son annonce depuis votre proposition. Vous pouvez la maintenir telle quelle ou la retirer.</Notice>
        )}
        <p className="mt-3 whitespace-pre-line">{myProposal.message}</p>
        {myProposal.price_xpf !== null && <p className="mt-2 font-semibold text-navy">Prix indicatif : {formatXpf(myProposal.price_xpf)}</p>}
        <div className="mt-4 flex flex-wrap gap-2">
          {conversation.data && <ButtonLink to={`/messages/${conversation.data}`} variant="secondary" icon={<MessageCircle className="size-4" aria-hidden />}>Discuter avec le client</ButtonLink>}
          {myProposal.status === 'pending' && <Button variant="dangerGhost" onClick={() => onWithdraw(myProposal.id)}>Retirer ma proposition</Button>}
        </div>
      </CardSection>
    );
  }

  if (!open) return <Notice tone="neutral">Cette annonce n'accepte plus de nouvelles propositions.</Notice>;
  if (myProvider.isPending) return null;
  if (!myProvider.data?.is_published || myProvider.data.is_hidden) {
    return (
      <Notice tone="warning" title="Publiez votre fiche pour répondre">
        Les clients doivent pouvoir consulter votre fiche avant de vous choisir. <Link to="/ma-fiche" className="font-semibold underline">Compléter ma fiche</Link>
      </Notice>
    );
  }
  return (
    <CardSection title={myProposal?.status === 'withdrawn' ? 'Proposer à nouveau' : 'Répondre à cette annonce'}>
      <form noValidate onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        <Field label="Votre message au client" required error={errors.message?.message}
          hint="Présentez-vous, vos disponibilités et votre façon de procéder.">
          {(p) => <Textarea {...p} rows={5} maxLength={2000} {...register('message')} />}
        </Field>
        <Field label="Prix indicatif" optional error={errors.price?.message} hint="Simple indication en F CFP : ce n'est pas un devis.">
          {(p) => (
            <div className="relative">
              <Input {...p} inputMode="numeric" pattern="[0-9]*" className="pr-16" {...register('price')} />
              <span className="pointer-events-none absolute top-1/2 right-4 -translate-y-1/2 text-muted">F CFP</span>
            </div>
          )}
        </Field>
        <Button type="submit" size="lg" block loading={isSubmitting}>Envoyer ma proposition</Button>
      </form>
    </CardSection>
  );
}
