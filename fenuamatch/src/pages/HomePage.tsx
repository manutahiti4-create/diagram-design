import { Link } from 'react-router';
import { ArrowRight, MessageCircle, Megaphone, Search, UserCheck } from 'lucide-react';
import { useAuth } from '@/auth/AuthProvider';
import { BRAND, SEARCH_EXAMPLES } from '@/config/brand';
import { ButtonLink } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { CardSkeletonList } from '@/components/ui/Spinner';
import { EmptyState } from '@/components/ui/States';
import { SearchBar } from '@/components/domain/SearchBar';
import { ProviderCard } from '@/components/domain/ProviderCard';
import { ListingCard } from '@/components/domain/ListingCard';
import { useCategories } from '@/services/reference';
import { useProviderSearch } from '@/services/providers';
import { useOpenListings } from '@/services/listings';

const STEPS = [
  { icon: Search, title: 'Cherchez ou publiez', text: 'Trouvez un prestataire par métier et commune, ou décrivez votre besoin dans une annonce gratuite.' },
  { icon: MessageCircle, title: 'Échangez', text: 'Discutez avec les prestataires grâce à la messagerie privée, sans dévoiler vos coordonnées.' },
  { icon: UserCheck, title: 'Confirmez', text: 'Choisissez une proposition : la mission est attribuée quand le prestataire la confirme à son tour.' },
];

export default function HomePage() {
  const { user, profile } = useAuth();
  const { data: categories } = useCategories();

  return (
    <div className="space-y-10">
      <section className="-mx-4 -mt-5 bg-gradient-to-b from-white to-surface px-4 pt-8 pb-10 sm:mx-0 sm:mt-0 sm:rounded-3xl sm:pt-14">
        <div className="mx-auto max-w-3xl text-center">
          <p className="mb-3 inline-flex rounded-full bg-brand-50 px-3 py-1 text-sm font-semibold text-brand-strong">
            Tahiti · Gratuit pour les clients et les prestataires
          </p>
          <h1 className="text-3xl font-bold sm:text-5xl">{BRAND.heroTitle}</h1>
          <p className="mx-auto mt-4 max-w-2xl text-lg text-muted">{BRAND.heroSubtitle}</p>
          <div className="mx-auto mt-6 max-w-2xl">
            <SearchBar large />
          </div>
          <ul className="mt-4 flex flex-wrap justify-center gap-2" aria-label="Exemples de recherches">
            {SEARCH_EXAMPLES.map((ex) => (
              <li key={ex}>
                <Link to={`/rechercher?q=${encodeURIComponent(ex)}`}
                  className="inline-flex min-h-10 items-center rounded-full border border-line bg-white px-3.5 text-sm font-medium text-navy hover:border-brand">
                  {ex}
                </Link>
              </li>
            ))}
          </ul>
          <div className="mx-auto mt-8 grid max-w-xl grid-cols-1 gap-3 sm:grid-cols-2">
            <ButtonLink to="/rechercher" size="lg" icon={<Search className="size-5" aria-hidden />}>Trouver un prestataire</ButtonLink>
            <ButtonLink to={profile?.account_type === 'provider' ? '/annonces' : '/annonces/nouvelle'} size="lg" variant="navy"
              icon={<Megaphone className="size-5" aria-hidden />}>
              {profile?.account_type === 'provider' ? 'Voir les annonces' : 'Publier une annonce'}
            </ButtonLink>
          </div>
        </div>
      </section>

      <section aria-labelledby="metiers">
        <div className="mb-4 flex items-end justify-between">
          <h2 id="metiers" className="text-2xl font-bold">Métiers populaires</h2>
          <Link to="/rechercher" className="text-sm font-semibold text-brand-strong hover:underline">Tout voir</Link>
        </div>
        <ul className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          {(categories ?? []).filter((c) => c.slug !== 'autres-services').slice(0, 8).map((c) => (
            <li key={c.id}>
              <Link to={`/rechercher?categorie=${c.id}`}
                className="flex min-h-16 items-center justify-between gap-2 rounded-2xl border border-line bg-white px-4 py-3 font-semibold text-navy shadow-[var(--shadow-card)] hover:border-brand">
                <span>{c.name}</span>
                <ArrowRight className="size-4 shrink-0 text-brand-strong" aria-hidden />
              </Link>
            </li>
          ))}
        </ul>
      </section>

      {user ? <MemberSections /> : <VisitorTeaser />}

      <section aria-labelledby="fonctionnement">
        <h2 id="fonctionnement" className="mb-4 text-2xl font-bold">Comment ça marche ?</h2>
        <ol className="grid grid-cols-1 gap-3 sm:grid-cols-3">
          {STEPS.map(({ icon: Icon, title, text }, i) => (
            <li key={title}>
              <Card className="h-full p-5">
                <div className="flex items-center gap-3">
                  <span className="flex size-11 items-center justify-center rounded-full bg-brand-50 text-brand-strong"><Icon className="size-5" aria-hidden /></span>
                  <span className="font-display text-sm font-semibold text-muted">Étape {i + 1}</span>
                </div>
                <h3 className="mt-3 text-lg font-semibold">{title}</h3>
                <p className="mt-1 text-muted">{text}</p>
              </Card>
            </li>
          ))}
        </ol>
      </section>
    </div>
  );
}

function VisitorTeaser() {
  return (
    <section className="rounded-3xl bg-navy px-6 py-8 text-white sm:px-10">
      <h2 className="text-2xl font-bold text-white">Rejoignez FenuaMatch</h2>
      <p className="mt-2 max-w-2xl text-white/85">
        Créez un compte gratuit pour consulter les fiches des prestataires, publier une annonce ou proposer vos services aux habitants de Tahiti.
      </p>
      <div className="mt-5 flex flex-wrap gap-3">
        <ButtonLink to="/inscription" size="lg">Créer mon compte</ButtonLink>
        <ButtonLink to="/connexion" size="lg" variant="secondary">J'ai déjà un compte</ButtonLink>
      </div>
    </section>
  );
}

function MemberSections() {
  const providers = useProviderSearch({});
  const listings = useOpenListings({});
  const providerList = providers.data?.pages[0]?.slice(0, 3) ?? [];
  const listingList = listings.data?.pages[0]?.slice(0, 3) ?? [];
  return (
    <>
      <section aria-labelledby="prestataires">
        <div className="mb-4 flex items-end justify-between">
          <h2 id="prestataires" className="text-2xl font-bold">Prestataires</h2>
          <Link to="/rechercher" className="text-sm font-semibold text-brand-strong hover:underline">Rechercher</Link>
        </div>
        {providers.isPending ? <CardSkeletonList count={2} /> : providerList.length === 0 ? (
          <EmptyState title="Les premiers prestataires arrivent"
            message="FenuaMatch vient d'ouvrir. Vous êtes prestataire ? Créez votre fiche pour être parmi les premiers visibles." />
        ) : (
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">{providerList.map((p) => <ProviderCard key={p.id} provider={p} />)}</div>
        )}
      </section>
      <section aria-labelledby="annonces-recentes">
        <div className="mb-4 flex items-end justify-between">
          <h2 id="annonces-recentes" className="text-2xl font-bold">Dernières annonces</h2>
          <Link to="/annonces" className="text-sm font-semibold text-brand-strong hover:underline">Toutes les annonces</Link>
        </div>
        {listings.isPending ? <CardSkeletonList count={2} /> : listingList.length === 0 ? (
          <EmptyState title="Aucune annonce pour l'instant" message="Besoin d'un coup de main ? Publiez la première annonce, c'est gratuit."
            action={<ButtonLink to="/annonces/nouvelle">Publier une annonce</ButtonLink>} />
        ) : (
          <div className="grid grid-cols-1 gap-3 lg:grid-cols-3">{listingList.map((l) => <ListingCard key={l.id} listing={l} />)}</div>
        )}
      </section>
    </>
  );
}
