import { useState, type FormEvent } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { Badge, CardSection } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Field, Input, Select } from '@/components/ui/Field';
import { PageLoader } from '@/components/ui/Spinner';
import { useToast } from '@/components/ui/Toast';
import { errorMessage } from '@/lib/errors';
import { supabase } from '@/lib/supabase';
import { useCategories, useTrades } from '@/services/reference';
import type { Category, Trade } from '@/types/models';

function slugify(v: string) {
  return v.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 60);
}

export default function AdminCategories() {
  const categories = useCategories(true);
  const trades = useTrades(true);
  const qc = useQueryClient();
  const toast = useToast();
  const [newCat, setNewCat] = useState('');
  const [newTrade, setNewTrade] = useState({ name: '', categoryId: '' });
  const refresh = () => qc.invalidateQueries({ queryKey: ['ref'] });

  async function act(fn: () => PromiseLike<{ error: unknown }>, ok: string) {
    const { error } = await fn();
    if (error) toast.show(errorMessage(error), 'error');
    else {
      toast.show(ok);
      await refresh();
    }
  }

  function addCategory(e: FormEvent) {
    e.preventDefault();
    if (newCat.trim().length < 2) return;
    void act(() => supabase.from('categories').insert({ name: newCat.trim(), slug: slugify(newCat) }), 'Catégorie ajoutée.').then(() => setNewCat(''));
  }
  function addTrade(e: FormEvent) {
    e.preventDefault();
    if (newTrade.name.trim().length < 2 || !newTrade.categoryId) return;
    void act(() => supabase.from('trades').insert({ name: newTrade.name.trim(), slug: slugify(newTrade.name), category_id: Number(newTrade.categoryId) }), 'Métier ajouté.')
      .then(() => setNewTrade({ name: '', categoryId: newTrade.categoryId }));
  }
  function rename(table: 'categories' | 'trades', item: Category | Trade) {
    const name = window.prompt('Nouveau nom :', item.name)?.trim();
    if (!name || name === item.name) return;
    void act(() => supabase.from(table).update({ name }).eq('id', item.id), 'Nom modifié.');
  }
  function move(table: 'categories' | 'trades', item: Category | Trade, delta: number) {
    void act(() => supabase.from(table).update({ sort_order: item.sort_order + delta }).eq('id', item.id), 'Ordre modifié.');
  }
  function toggle(table: 'categories' | 'trades', item: Category | Trade) {
    void act(() => supabase.from(table).update({ is_active: !item.is_active }).eq('id', item.id), item.is_active ? 'Désactivé.' : 'Réactivé.');
  }

  if (categories.isPending || trades.isPending) return <PageLoader />;

  return (
    <div className="space-y-4">
      <p className="text-sm text-muted">Les éléments désactivés n'apparaissent plus dans les formulaires mais restent attachés aux fiches et annonces existantes. Toutes les modifications sont journalisées.</p>
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <CardSection title="Ajouter une catégorie">
          <form onSubmit={addCategory} className="flex items-end gap-2">
            <Field label="Nom" className="flex-1">{(p) => <Input {...p} value={newCat} onChange={(e) => setNewCat(e.target.value)} />}</Field>
            <Button type="submit" variant="navy">Ajouter</Button>
          </form>
        </CardSection>
        <CardSection title="Ajouter un métier">
          <form onSubmit={addTrade} className="space-y-2">
            <Field label="Nom">{(p) => <Input {...p} value={newTrade.name} onChange={(e) => setNewTrade({ ...newTrade, name: e.target.value })} />}</Field>
            <div className="flex items-end gap-2">
              <Field label="Catégorie" className="flex-1">
                {(p) => (
                  <Select {...p} value={newTrade.categoryId} onChange={(e) => setNewTrade({ ...newTrade, categoryId: e.target.value })}>
                    <option value="">Choisir…</option>
                    {categories.data?.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
                  </Select>
                )}
              </Field>
              <Button type="submit" variant="navy">Ajouter</Button>
            </div>
          </form>
        </CardSection>
      </div>

      {categories.data?.map((c) => (
        <CardSection key={c.id} title={<span className="flex items-center gap-2">{c.name}{!c.is_active && <Badge>Désactivée</Badge>}</span>}
          action={
            <div className="flex flex-wrap gap-1">
              <Button size="sm" variant="ghost" onClick={() => move('categories', c, -15)} aria-label={`Monter ${c.name}`}>↑</Button>
              <Button size="sm" variant="ghost" onClick={() => move('categories', c, 15)} aria-label={`Descendre ${c.name}`}>↓</Button>
              <Button size="sm" variant="ghost" onClick={() => rename('categories', c)}>Renommer</Button>
              <Button size="sm" variant="ghost" onClick={() => toggle('categories', c)}>{c.is_active ? 'Désactiver' : 'Réactiver'}</Button>
            </div>
          }>
          <ul className="divide-y divide-line">
            {trades.data?.filter((t) => t.category_id === c.id).map((t) => (
              <li key={t.id} className="flex flex-wrap items-center justify-between gap-2 py-2">
                <span className={t.is_active ? '' : 'text-muted line-through'}>{t.name}</span>
                <span className="flex gap-1">
                  <Button size="sm" variant="ghost" onClick={() => rename('trades', t)}>Renommer</Button>
                  <Select aria-label={`Catégorie de ${t.name}`} className="min-h-10 w-auto py-0 text-sm" value={t.category_id}
                    onChange={(e) => void act(() => supabase.from('trades').update({ category_id: Number(e.target.value) }).eq('id', t.id), 'Métier déplacé.')}>
                    {categories.data?.map((x) => <option key={x.id} value={x.id}>{x.name}</option>)}
                  </Select>
                  <Button size="sm" variant="ghost" onClick={() => toggle('trades', t)}>{t.is_active ? 'Désactiver' : 'Réactiver'}</Button>
                </span>
              </li>
            ))}
          </ul>
        </CardSection>
      ))}
    </div>
  );
}
