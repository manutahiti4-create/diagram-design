import { useState, type FormEvent } from 'react';
import { useSearchParams } from 'react-router';
import { Megaphone, Plus, Search } from 'lucide-react';
import { useAuth } from '@/auth/AuthProvider';
import { Button, ButtonLink } from '@/components/ui/Button';
import { PageHeader } from '@/components/ui/Card';
import { Field, Input, Select } from '@/components/ui/Field';
import { CardSkeletonList } from '@/components/ui/Spinner';
import { EmptyState, ErrorState } from '@/components/ui/States';
import { ListingCard } from '@/components/domain/ListingCard';
import { useCategories, useCommunes } from '@/services/reference';
import { useOpenListings } from '@/services/listings';

const num = (v: string | null) => (v && /^\d+$/.test(v) ? Number(v) : undefined);

export default function ListingsPage() {
  const { profile } = useAuth();
  const [params, setParams] = useSearchParams();
  const [text, setText] = useState(params.get('q') ?? '');
  const { data: categories } = useCategories();
  const { data: communes } = useCommunes();
  const filters = { q: params.get('q') ?? undefined, categoryId: num(params.get('categorie')), communeId: num(params.get('commune')) };
  const query = useOpenListings(filters);
  const items = query.data?.pages.flat() ?? [];
  const isClient = profile?.account_type === 'client';

  function update(key: string, value?: string) {
    const next = new URLSearchParams(params);
    if (value) next.set(key, value);
    else next.delete(key);
    setParams(next, { replace: true });
  }
  function submit(e: FormEvent) {
    e.preventDefault();
    update('q', text.trim() || undefined);
  }

  return (
    <div>
      <PageHeader title="Annonces"
        subtitle={isClient ? 'Les demandes publiées par les habitants de Tahiti.' : 'Trouvez de nouveaux clients : répondez aux demandes en cours.'}
        action={isClient
          ? <div className="flex gap-2"><ButtonLink to="/mes-annonces" variant="secondary" size="sm">Mes annonces</ButtonLink><ButtonLink to="/annonces/nouvelle" size="sm" icon={<Plus className="size-4" aria-hidden />}>Publier</ButtonLink></div>
          : <ButtonLink to="/mes-propositions" variant="secondary" size="sm">Mes propositions</ButtonLink>} />

      <form onSubmit={submit} className="grid grid-cols-1 gap-3 rounded-2xl border border-line bg-white p-4 sm:grid-cols-[2fr_1fr_1fr_auto] sm:items-end">
        <Field label="Mots-clés">
          {(p) => (
            <div className="relative">
              <Search className="pointer-events-none absolute top-1/2 left-3 size-5 -translate-y-1/2 text-muted" aria-hidden />
              <Input {...p} type="search" value={text} onChange={(e) => setText(e.target.value)} placeholder="Ex. : prises, fuite, tonte" className="pl-10" />
            </div>
          )}
        </Field>
        <Field label="Catégorie">
          {(p) => (
            <Select {...p} value={filters.categoryId ?? ''} onChange={(e) => update('categorie', e.target.value || undefined)}>
              <option value="">Toutes</option>
              {categories?.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
            </Select>
          )}
        </Field>
        <Field label="Commune">
          {(p) => (
            <Select {...p} value={filters.communeId ?? ''} onChange={(e) => update('commune', e.target.value || undefined)}>
              <option value="">Tout Tahiti</option>
              {communes?.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
            </Select>
          )}
        </Field>
        <Button type="submit" variant="navy">Filtrer</Button>
      </form>

      <div className="mt-6">
        {query.isPending ? <CardSkeletonList count={4} /> : query.isError ? (
          <ErrorState error={query.error} onRetry={() => void query.refetch()} />
        ) : items.length === 0 ? (
          <EmptyState icon={<Megaphone className="size-7" aria-hidden />} title="Aucune annonce ouverte"
            message={filters.q || filters.categoryId || filters.communeId ? 'Aucun résultat avec ces critères. Essayez « Tout Tahiti » ou d\'autres mots.' : 'Il n\'y a pas encore d\'annonce en cours.'}
            action={isClient ? <ButtonLink to="/annonces/nouvelle">Publier une annonce</ButtonLink> : undefined} />
        ) : (
          <>
            <div className="grid grid-cols-1 gap-3 lg:grid-cols-2">{items.map((l) => <ListingCard key={l.id} listing={l} />)}</div>
            {query.hasNextPage && (
              <div className="mt-6 flex justify-center">
                <Button variant="secondary" loading={query.isFetchingNextPage} onClick={() => void query.fetchNextPage()}>Voir plus d'annonces</Button>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
