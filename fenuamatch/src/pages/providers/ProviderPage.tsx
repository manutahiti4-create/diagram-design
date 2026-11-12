import { useState } from 'react';
import { useParams } from 'react-router';
import { Clock, Info, MapPin, MessageCircle, Pencil, Phone, Route, Share2 } from 'lucide-react';
import { useAuth } from '@/auth/AuthProvider';
import { Avatar } from '@/components/ui/Avatar';
import { Badge, Card, CardSection, Notice } from '@/components/ui/Card';
import { Button, ButtonLink } from '@/components/ui/Button';
import { Dialog } from '@/components/ui/Dialog';
import { PageLoader } from '@/components/ui/Spinner';
import { EmptyState, ErrorState } from '@/components/ui/States';
import { useToast } from '@/components/ui/Toast';
import { AvailabilityBadge, DemoBadge } from '@/components/domain/StatusBadges';
import { ReportButton } from '@/components/domain/ReportButton';
import { BackLink } from '@/components/domain/BackLink';
import { publicImageUrl } from '@/lib/storage';
import { useProvider } from '@/services/providers';
import { nameById, useCommunes, useTrades } from '@/services/reference';
import { useContactProvider } from '@/hooks/useContactProvider';
import type { ProviderPhoto } from '@/types/models';

export default function ProviderPage() {
  const { id } = useParams();
  const { user, profile } = useAuth();
  const { data, isPending, isError, error, refetch } = useProvider(id);
  const { data: trades } = useTrades();
  const { data: communes } = useCommunes();
  const { contact, pendingId } = useContactProvider();
  const toast = useToast();
  const [zoom, setZoom] = useState<ProviderPhoto | null>(null);

  if (isPending) return <PageLoader />;
  if (isError) return <ErrorState error={error} onRetry={() => void refetch()} />;
  if (!data) {
    return <EmptyState title="Fiche introuvable" message="Ce prestataire n'existe pas ou sa fiche n'est plus visible."
      action={<ButtonLink to="/rechercher">Rechercher un prestataire</ButtonLink>} />;
  }

  const { provider, profile: providerAccount, secondaryTradeIds, photos } = data;
  const isOwner = user?.id === provider.id;
  const secondary = secondaryTradeIds.filter((t) => t !== provider.main_trade_id).map((t) => nameById(trades, t)).filter(Boolean);

  async function share() {
    const url = window.location.href;
    try {
      if (navigator.share) await navigator.share({ title: provider.public_name, url });
      else {
        await navigator.clipboard.writeText(url);
        toast.show('Lien copié.');
      }
    } catch { /* partage annulé */ }
  }

  return (
    <div className="mx-auto max-w-3xl space-y-4">
      <BackLink to="/rechercher">Retour à la recherche</BackLink>
      {isOwner && !provider.is_published && <Notice tone="warning" title="Votre fiche n'est pas publiée">Elle n'apparaît pas dans les recherches.</Notice>}
      {provider.is_hidden && isOwner && (
        <Notice tone="warning" title="Fiche masquée en attente d'examen">Vous pouvez contester depuis Paramètres › Modération.</Notice>
      )}

      <Card className="p-5">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
          <Avatar src={publicImageUrl('avatars', providerAccount.avatar_path)} name={provider.public_name} size="xl" />
          <div className="min-w-0 flex-1">
            <h1 className="text-2xl font-bold sm:text-3xl">{provider.public_name}</h1>
            <p className="text-lg font-semibold text-brand-strong">{nameById(trades, provider.main_trade_id)}</p>
            <p className="mt-1 flex items-center gap-1 text-muted"><MapPin className="size-4" aria-hidden />{nameById(communes, provider.commune_id)}</p>
            <div className="mt-2 flex flex-wrap gap-2">
              <AvailabilityBadge value={provider.availability} />
              {providerAccount.is_demo && <DemoBadge />}
            </div>
          </div>
        </div>
        <p className="mt-3 text-xs text-muted">La disponibilité est indiquée par le prestataire à titre indicatif.</p>

        <div className="mt-5 grid gap-2 sm:flex">
          {isOwner ? (
            <ButtonLink to="/ma-fiche" icon={<Pencil className="size-5" aria-hidden />}>Modifier ma fiche</ButtonLink>
          ) : profile?.account_type === 'client' ? (
            <Button size="lg" icon={<MessageCircle className="size-5" aria-hidden />} loading={pendingId === provider.id}
              onClick={() => void contact(provider.id)}>Contacter</Button>
          ) : (
            <Notice tone="neutral">Seuls les comptes clients peuvent contacter directement un prestataire.</Notice>
          )}
          <Button variant="secondary" icon={<Share2 className="size-5" aria-hidden />} onClick={() => void share()}>Partager</Button>
          {!isOwner && <div className="sm:ml-auto"><ReportButton targetType="profile" targetId={provider.id} /></div>}
        </div>
      </Card>

      {secondary.length > 0 && (
        <CardSection title="Autres métiers">
          <div className="flex flex-wrap gap-2">{secondary.map((t) => <Badge key={t} tone="brand">{t}</Badge>)}</div>
        </CardSection>
      )}

      <CardSection title="Présentation">
        <p className="whitespace-pre-line">{provider.description}</p>
      </CardSection>

      {(provider.phone || provider.opening_hours || provider.service_area || provider.extra_info) && (
        <CardSection title="Informations pratiques">
          <dl className="space-y-3">
            {provider.phone && (
              <div className="flex gap-3"><Phone className="mt-0.5 size-5 shrink-0 text-brand-strong" aria-hidden />
                <div><dt className="text-sm text-muted">Téléphone</dt><dd><a href={`tel:${provider.phone.replace(/[^0-9+]/g, '')}`} className="font-semibold text-brand-strong underline">{provider.phone}</a></dd></div></div>
            )}
            {provider.opening_hours && (
              <div className="flex gap-3"><Clock className="mt-0.5 size-5 shrink-0 text-brand-strong" aria-hidden />
                <div><dt className="text-sm text-muted">Horaires</dt><dd className="whitespace-pre-line">{provider.opening_hours}</dd></div></div>
            )}
            {provider.service_area && (
              <div className="flex gap-3"><Route className="mt-0.5 size-5 shrink-0 text-brand-strong" aria-hidden />
                <div><dt className="text-sm text-muted">Zone d'intervention</dt><dd className="whitespace-pre-line">{provider.service_area}</dd></div></div>
            )}
            {provider.extra_info && (
              <div className="flex gap-3"><Info className="mt-0.5 size-5 shrink-0 text-brand-strong" aria-hidden />
                <div><dt className="text-sm text-muted">Informations complémentaires</dt><dd className="whitespace-pre-line">{provider.extra_info}</dd></div></div>
            )}
          </dl>
        </CardSection>
      )}

      <CardSection title="Réalisations">
        {photos.length === 0 ? <p className="text-muted">Aucune photo pour le moment.</p> : (
          <ul className="grid grid-cols-2 gap-2 sm:grid-cols-3">
            {photos.map((ph) => (
              <li key={ph.id}>
                <button type="button" onClick={() => setZoom(ph)} className="block w-full overflow-hidden rounded-xl border border-line bg-surface text-left">
                  <img src={publicImageUrl('provider-photos', ph.storage_path) ?? ''} alt={ph.caption ?? 'Réalisation'} loading="lazy" decoding="async" className="aspect-square w-full object-cover" />
                  {ph.caption && <span className="block truncate px-2 py-1.5 text-sm">{ph.caption}</span>}
                </button>
              </li>
            ))}
          </ul>
        )}
      </CardSection>

      <Dialog open={Boolean(zoom)} onClose={() => setZoom(null)} title={zoom?.caption || 'Réalisation'}>
        {zoom && <img src={publicImageUrl('provider-photos', zoom.storage_path) ?? ''} alt={zoom.caption ?? 'Réalisation'} className="w-full rounded-xl" />}
      </Dialog>
    </div>
  );
}
