import { useMemo, useState, type FormEvent } from 'react';
import { useSearchParams } from 'react-router';
import { Search, SlidersHorizontal, SearchX } from 'lucide-react';
import { useAuth } from '@/auth/AuthProvider';
import { Button } from '@/components/ui/Button';
import { PageHeader } from '@/components/ui/Card';
import { Field, Input, Select } from '@/components/ui/Field';
import { CardSkeletonList } from '@/components/ui/Spinner';
import { EmptyState, ErrorState } from '@/components/ui/States';
import { ProviderCard } from '@/components/domain/ProviderCard';
import { useCategories, useCommunes, useTrades } from '@/services/reference';
import { useProviderSearch, type SearchFilters } from '@/services/providers';
import { useContactProvider } from '@/hooks/useContactProvider';
import { AVAILABILITY_LABELS } from '@/lib/labels';
import { pluralize } from '@/lib/format';
import type { Availability } from '@/types/models';

const num = (v: string | null) => (v && /^\d+$/.test(v) ? Number(v) : undefined);

export default function SearchPage() {
  const { profile } = useAuth();
  const [params, setParams] = useSearchParams();
  const [text, setText] = useState(params.get('q') ?? '');
  const [showFilters, setShowFilters] = useState(Boolean(params.get('commune') || params.get('metier') || params.get('dispo')));
  const { data: categories } = useCategories();
  const { data: trades } = useTrades();
  const { data: communes } = useCommunes();
  const { contact, pendingId } = useContactProvider();

  const filters: SearchFilters = useMemo(() => ({
    q: params.get('q') ?? undefined,
    categoryId: num(params.get('categorie')),
    tradeId: num(params.get('metier')),
    communeId: num(params.get('commune')),
    availability: (['available', 'busy', 'unavailable'] as const).find((a) => a === params.get('dispo')),
  }), [params]);

  const search = useProviderSearch(filters);
  const results = search.data?.pages.flat() ?? [];
  const total = search.data?.pages[0]?.[0]?.total_count ?? 0;

  function update(key: string, value: string | undefined) {
    const next = new URLSearchParams(params);
    if (value) next.set(key, value);
    else next.delete(key);
    if (key === 'categorie') next.delete('metier');
    setParams(next, { replace: true });
  }

  function submit(e: FormEvent) {
    e.preventDefault();
    update('q', text.trim() || undefined);
  }

  const tradeOptions = (trades ?? []).filter((t) => !filters.categoryId || t.category_id === filters.categoryId);
  const activeCount = [filters.categoryId, filters.tradeId, filters.communeId, filters.availability].filter(Boolean).length;

  return (
    <div>
      <PageHeader title="Rechercher un prestataire" subtitle="Partout à Tahiti : choisissez un métier, une commune ou tapez un nom." />

      <form role="search" onSubmit={submit} className="space-y-3">
        <div className="flex gap-2">
          <label htmlFor="q" className="sr-only">Métier, spécialité ou nom</label>
          <div className="relative flex-1">
            <Search className="pointer-events-none absolute top-1/2 left-4 size-5 -translate-y-1/2 text-muted" aria-hidden />
            <Input id="q" type="search" enterKeyHint="search" value={text} onChange={(e) => setText(e.target.value)}
              placeholder="Ex. : plombier, climatisation, Teva…" className="pl-12" />
          </div>
          <Button type="submit" variant="navy">Chercher</Button>
        </div>
        <Button variant="ghost" size="sm" icon={<SlidersHorizontal className="size-4" aria-hidden />}
          onClick={() => setShowFilters((v) => !v)} aria-expanded={showFilters} aria-controls="filtres">
          Filtres{activeCount ? ` (${activeCount})` : ''}
        </Button>
        {showFilters && (
          <div id="filtres" className="grid grid-cols-1 gap-3 rounded-2xl border border-line bg-white p-4 sm:grid-cols-2 lg:grid-cols-4">
            <Field label="Catégorie">
              {(p) => (
                <Select {...p} value={filters.categoryId ?? ''} onChange={(e) => update('categorie', e.target.value || undefined)}>
                  <option value="">Toutes</option>
                  {categories?.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
                </Select>
              )}
            </Field>
            <Field label="Métier">
              {(p) => (
                <Select {...p} value={filters.tradeId ?? ''} onChange={(e) => update('metier', e.target.value || undefined)}>
                  <option value="">Tous</option>
                  {tradeOptions.map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}
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
            <Field label="Disponibilité">
              {(p) => (
                <Select {...p} value={filters.availability ?? ''} onChange={(e) => update('dispo', e.target.value || undefined)}>
                  <option value="">Peu importe</option>
                  {(Object.keys(AVAILABILITY_LABELS) as Availability[]).map((a) => <option key={a} value={a}>{AVAILABILITY_LABELS[a]}</option>)}
                </Select>
              )}
            </Field>
            {activeCount > 0 && (
              <Button variant="link" className="justify-start sm:col-span-2 lg:col-span-4"
                onClick={() => setParams(filters.q ? { q: filters.q } : {}, { replace: true })}>
                Effacer les filtres
              </Button>
            )}
          </div>
        )}
      </form>

      <div className="mt-6" aria-live="polite">
        {search.isPending ? <CardSkeletonList count={4} /> : search.isError ? (
          <ErrorState error={search.error} onRetry={() => void search.refetch()} />
        ) : results.length === 0 ? (
          <EmptyState icon={<SearchX className="size-7" aria-hidden />} title="Aucun prestataire trouvé"
            message="Essayez un autre mot, retirez un filtre ou choisissez « Tout Tahiti ». Vous pouvez aussi publier une annonce : les prestataires viendront à vous." />
        ) : (
          <>
            <p className="mb-3 text-sm font-medium text-muted">{pluralize(total, 'prestataire trouvé', 'prestataires trouvés')}</p>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {results.map((p) => (
                <ProviderCard key={p.id} provider={p}
                  onContact={profile?.account_type === 'client' ? () => void contact(p.id) : undefined}
                  contactPending={pendingId === p.id} />
              ))}
            </div>
            {search.hasNextPage && (
              <div className="mt-6 flex justify-center">
                <Button variant="secondary" loading={search.isFetchingNextPage} onClick={() => void search.fetchNextPage()}>Voir plus de résultats</Button>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
