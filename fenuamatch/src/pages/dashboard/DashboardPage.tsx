import { Link } from 'react-router';
import { useQueryClient } from '@tanstack/react-query';
import { CalendarClock, ChartLine, Crown, FileText, Images, Megaphone, MessageCircle, Pencil, Plus, Search, type LucideIcon } from 'lucide-react';
import { useAuth } from '@/auth/AuthProvider';
import { Avatar } from '@/components/ui/Avatar';
import { Badge, Card, CardSection, Notice } from '@/components/ui/Card';
import { ButtonLink } from '@/components/ui/Button';
import { PageLoader } from '@/components/ui/Spinner';
import { useToast } from '@/components/ui/Toast';
import { cn } from '@/components/ui/cn';
import { ProposalStatusBadge } from '@/components/domain/StatusBadges';
import { errorMessage } from '@/lib/errors';
import { formatRelative } from '@/lib/format';
import { AVAILABILITY_LABELS, MISSION_STATUS_LABELS, effectiveListingStatus } from '@/lib/labels';
import { publicImageUrl } from '@/lib/storage';
import { useMyListings, useMyMissions, useMyProposals } from '@/services/listings';
import { useConversations } from '@/services/messages';
import { markNotificationsRead, useNotifications } from '@/services/notifications';
import { setAvailability, useProvider } from '@/services/providers';
import { NotificationItem } from './NotificationsPage';
import type { Availability } from '@/types/models';

function QuickAction({ to, icon: Icon, label }: { to: string; icon: LucideIcon; label: string }) {
  return (
    <Link to={to} className="flex min-h-20 flex-col items-center justify-center gap-1.5 rounded-2xl border border-line bg-white p-3 text-center text-sm font-semibold text-navy shadow-[var(--shadow-card)] hover:border-brand">
      <Icon className="size-6 text-brand-strong" aria-hidden />
      {label}
    </Link>
  );
}

function Stat({ label, value, to }: { label: string; value: number; to?: string }) {
  const inner = (
    <>
      <span className="font-display text-3xl font-bold text-navy">{value}</span>
      <span className="text-sm text-muted">{label}</span>
    </>
  );
  return to ? <Link to={to} className="flex flex-col rounded-xl bg-surface p-3 hover:ring-1 hover:ring-brand">{inner}</Link>
    : <div className="flex flex-col rounded-xl bg-surface p-3">{inner}</div>;
}

export default function DashboardPage() {
  const { profile } = useAuth();
  if (!profile) return <PageLoader />;
  return profile.account_type === 'provider' ? <ProviderDashboard /> : <ClientDashboard />;
}

function RecentActivity() {
  const { user } = useAuth();
  const conversations = useConversations();
  const notifications = useNotifications(user?.id, 5);
  const qc = useQueryClient();
  return (
    <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
      <CardSection title="Messages récents" action={<Link to="/messages" className="text-sm font-semibold text-brand-strong hover:underline">Tout voir</Link>}>
        {!conversations.data?.length ? <p className="text-muted">Aucune conversation pour le moment.</p> : (
          <ul className="divide-y divide-line">
            {conversations.data.slice(0, 4).map((c) => (
              <li key={c.id}>
                <Link to={`/messages/${c.id}`} className="flex items-center gap-3 py-2.5">
                  <Avatar src={publicImageUrl('avatars', c.other_avatar_path)} name={c.other_display_name} size="sm" />
                  <span className="min-w-0 flex-1">
                    <span className={cn('block truncate', Number(c.unread_count) > 0 ? 'font-bold text-navy' : 'font-medium')}>{c.other_display_name ?? 'Compte supprimé'}</span>
                    <span className="block truncate text-sm text-muted">{c.last_message_preview}</span>
                  </span>
                  <span className="text-xs text-muted">{formatRelative(c.last_message_at)}</span>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </CardSection>
      <CardSection title="Notifications récentes" action={<Link to="/notifications" className="text-sm font-semibold text-brand-strong hover:underline">Tout voir</Link>}>
        {!notifications.data?.length ? <p className="text-muted">Rien de nouveau.</p> : (
          <ul className="-mx-4 divide-y divide-line">
            {notifications.data.map((n) => (
              <NotificationItem key={n.id} n={n} onOpen={() => { if (!n.read_at) void markNotificationsRead([n.id]).then(() => qc.invalidateQueries({ queryKey: ['notifications'] })); }} />
            ))}
          </ul>
        )}
      </CardSection>
    </div>
  );
}

function ClientDashboard() {
  const { user, profile } = useAuth();
  const listings = useMyListings(user?.id);
  const missions = useMyMissions(user?.id);
  const all = listings.data ?? [];
  const count = (pred: (s: string) => boolean) => all.filter((l) => pred(effectiveListingStatus(l))).length;
  const inProgress = (missions.data ?? []).filter((m) => m.status === 'awaiting_provider' || m.status === 'confirmed');

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-2xl font-bold sm:text-3xl">Bonjour {profile?.username} 👋</h1>
        <p className="text-muted">Que souhaitez-vous faire aujourd'hui ?</p>
      </div>
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <QuickAction to="/annonces/nouvelle" icon={Plus} label="Publier une annonce" />
        <QuickAction to="/rechercher" icon={Search} label="Rechercher un prestataire" />
        <QuickAction to="/mes-annonces" icon={Megaphone} label="Mes annonces" />
        <QuickAction to="/messages" icon={MessageCircle} label="Mes messages" />
      </div>
      <CardSection title="Mes annonces">
        {listings.isPending ? <PageLoader /> : (
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
            <Stat label="Actives" value={count((s) => ['published', 'in_discussion', 'awaiting_confirmation'].includes(s))} to="/mes-annonces" />
            <Stat label="Attribuées" value={count((s) => s === 'assigned')} to="/mes-annonces" />
            <Stat label="Expirées" value={count((s) => s === 'expired')} to="/mes-annonces" />
            <Stat label="Terminées" value={count((s) => s === 'completed')} to="/mes-annonces" />
          </div>
        )}
      </CardSection>
      <CardSection title="Demandes et missions en cours">
        {!inProgress.length ? <p className="text-muted">Aucune mission en cours. Lorsque vous choisirez une proposition, elle apparaîtra ici.</p> : (
          <ul className="divide-y divide-line">
            {inProgress.map((m) => (
              <li key={m.id} className="flex flex-wrap items-center justify-between gap-2 py-2.5">
                <Link to={`/annonces/${m.listing_id}`} className="font-semibold text-navy hover:underline">{m.listing?.title}</Link>
                <Badge tone={m.status === 'confirmed' ? 'success' : 'warning'}>{MISSION_STATUS_LABELS[m.status]}</Badge>
              </li>
            ))}
          </ul>
        )}
      </CardSection>
      <RecentActivity />
    </div>
  );
}

function ProviderDashboard() {
  const { user, profile } = useAuth();
  const provider = useProvider(user?.id);
  const proposals = useMyProposals(user?.id);
  const missions = useMyMissions(user?.id);
  const qc = useQueryClient();
  const toast = useToast();
  const p = provider.data?.provider;
  const openProposals = (proposals.data ?? []).filter((x) => x.status === 'pending' || x.status === 'selected');
  const confirmed = (missions.data ?? []).filter((m) => m.status === 'confirmed');
  const toConfirm = (missions.data ?? []).filter((m) => m.status === 'awaiting_provider');

  async function changeAvailability(a: Availability) {
    try {
      await setAvailability(user!.id, a);
      await qc.invalidateQueries({ queryKey: ['provider', user!.id] });
      toast.show(`Statut : ${AVAILABILITY_LABELS[a]}.`);
    } catch (e) {
      toast.show(errorMessage(e), 'error');
    }
  }

  const future: Array<{ icon: LucideIcon; label: string }> = [
    { icon: FileText, label: 'Mes devis' },
    { icon: CalendarClock, label: 'Mon planning' },
    { icon: ChartLine, label: 'Mes statistiques' },
    { icon: Crown, label: 'Mon abonnement Premium' },
  ];

  return (
    <div className="space-y-5">
      <Card className="flex flex-col gap-4 p-5 sm:flex-row sm:items-center">
        <Avatar src={publicImageUrl('avatars', profile?.avatar_path)} name={p?.public_name ?? profile?.username} size="xl" />
        <div className="min-w-0 flex-1">
          <h1 className="text-2xl font-bold">{p?.public_name ?? profile?.username}</h1>
          <div className="mt-1 flex flex-wrap gap-2">
            {provider.isPending ? null : !p ? <Badge tone="warning">Fiche à créer</Badge>
              : p.is_hidden ? <Badge tone="warning">Fiche masquée — en attente d'examen</Badge>
              : p.is_published ? <Badge tone="success">Fiche publiée</Badge> : <Badge tone="warning">Fiche non publiée</Badge>}
            {profile?.hidden_for_inactivity && <Badge tone="warning">Masquée pour inactivité</Badge>}
          </div>
        </div>
        <ButtonLink to="/ma-fiche" variant="secondary" icon={<Pencil className="size-4" aria-hidden />}>Modifier mon profil</ButtonLink>
      </Card>

      {!provider.isPending && !p && (
        <Notice tone="warning" title="Créez votre fiche pour être visible">
          Ajoutez une photo, votre métier, votre commune et une description. <Link to="/ma-fiche" className="font-semibold underline">Créer ma fiche</Link>
        </Notice>
      )}
      {toConfirm.length > 0 && (
        <Notice tone="warning" title={`${toConfirm.length} mission${toConfirm.length > 1 ? 's' : ''} à confirmer`}>
          {toConfirm.map((m) => <Link key={m.id} to={`/annonces/${m.listing_id}`} className="block font-semibold underline">{m.listing?.title}</Link>)}
        </Notice>
      )}

      {p && (
        <CardSection title="Ma disponibilité">
          <div className="grid grid-cols-3 gap-2" role="radiogroup" aria-label="Disponibilité">
            {(Object.keys(AVAILABILITY_LABELS) as Availability[]).map((a) => (
              <button key={a} type="button" role="radio" aria-checked={p.availability === a} onClick={() => void changeAvailability(a)}
                className={cn('min-h-12 rounded-xl border-2 px-2 text-sm font-semibold', p.availability === a ? 'border-brand-strong bg-brand-50 text-brand-strong' : 'border-line bg-white text-ink')}>
                {AVAILABILITY_LABELS[a]}
              </button>
            ))}
          </div>
        </CardSection>
      )}

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <QuickAction to="/annonces" icon={Search} label="Rechercher des annonces" />
        <QuickAction to="/mes-propositions" icon={Megaphone} label="Mes propositions" />
        <QuickAction to="/messages" icon={MessageCircle} label="Mes messages" />
        <QuickAction to="/ma-fiche" icon={Images} label={`Ma galerie (${provider.data?.photos.length ?? 0}/10)`} />
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <CardSection title="Propositions en cours" action={<Link to="/mes-propositions" className="text-sm font-semibold text-brand-strong hover:underline">Tout voir</Link>}>
          {!openProposals.length ? <p className="text-muted">Aucune proposition en attente.</p> : (
            <ul className="divide-y divide-line">
              {openProposals.slice(0, 5).map((x) => (
                <li key={x.id} className="flex flex-wrap items-center justify-between gap-2 py-2.5">
                  <Link to={`/annonces/${x.listing_id}`} className="font-medium text-navy hover:underline">{x.listing?.title}</Link>
                  <ProposalStatusBadge status={x.status} />
                </li>
              ))}
            </ul>
          )}
        </CardSection>
        <CardSection title="Missions confirmées">
          {!confirmed.length ? <p className="text-muted">Aucune mission confirmée en cours.</p> : (
            <ul className="divide-y divide-line">
              {confirmed.map((m) => (
                <li key={m.id} className="py-2.5"><Link to={`/annonces/${m.listing_id}`} className="font-medium text-navy hover:underline">{m.listing?.title}</Link></li>
              ))}
            </ul>
          )}
        </CardSection>
      </div>

      <RecentActivity />

      <section aria-labelledby="bientot" className="rounded-2xl border border-dashed border-line p-4">
        <h2 id="bientot" className="text-base font-semibold text-muted">Prochainement sur FenuaMatch</h2>
        <p className="text-sm text-muted">Ces outils professionnels ne sont pas encore disponibles.</p>
        <ul className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-4">
          {future.map(({ icon: Icon, label }) => (
            <li key={label} className="flex items-center gap-2 rounded-xl bg-white/60 px-3 py-2 text-sm text-muted" aria-disabled="true">
              <Icon className="size-4" aria-hidden />{label}
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}
