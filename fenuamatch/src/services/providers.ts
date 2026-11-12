import { keepPreviousData, useInfiniteQuery, useQuery } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import type { Availability, Profile, ProviderPhoto, ProviderProfile, ProviderSearchResult } from '@/types/models';
import type { ProviderValues } from '@/schemas/provider';

export interface SearchFilters {
  q?: string;
  categoryId?: number;
  tradeId?: number;
  communeId?: number;
  availability?: Availability;
}

const PAGE_SIZE = 12;

export function useProviderSearch(filters: SearchFilters, enabled = true) {
  return useInfiniteQuery({
    queryKey: ['providers', 'search', filters],
    enabled,
    initialPageParam: 0,
    placeholderData: keepPreviousData,
    queryFn: async ({ pageParam }): Promise<ProviderSearchResult[]> => {
      const { data, error } = await supabase.rpc('search_providers', {
        p_query: filters.q || undefined,
        p_category_id: filters.categoryId,
        p_trade_id: filters.tradeId,
        p_commune_id: filters.communeId,
        p_availability: filters.availability,
        p_limit: PAGE_SIZE,
        p_offset: pageParam,
      });
      if (error) throw error;
      return data ?? [];
    },
    getNextPageParam: (last, all) => {
      const loaded = all.reduce((n, p) => n + p.length, 0);
      const total = last[0]?.total_count ?? 0;
      return last.length === PAGE_SIZE && loaded < total ? loaded : undefined;
    },
  });
}

export interface ProviderDetails {
  provider: ProviderProfile;
  profile: Profile;
  secondaryTradeIds: number[];
  photos: ProviderPhoto[];
}

export async function fetchProvider(id: string): Promise<ProviderDetails | null> {
  const [prov, prof, trades, photos] = await Promise.all([
    supabase.from('provider_profiles').select('*').eq('id', id).maybeSingle(),
    supabase.from('profiles').select('*').eq('id', id).maybeSingle(),
    supabase.from('provider_trades').select('trade_id').eq('provider_id', id),
    supabase.from('provider_photos').select('*').eq('provider_id', id).order('position').order('created_at'),
  ]);
  for (const r of [prov, prof, trades, photos]) if (r.error) throw r.error;
  if (!prov.data || !prof.data) return null;
  return {
    provider: prov.data,
    profile: prof.data,
    secondaryTradeIds: (trades.data ?? []).map((t) => t.trade_id),
    photos: photos.data ?? [],
  };
}

export function useProvider(id: string | undefined) {
  return useQuery({
    queryKey: ['provider', id],
    enabled: Boolean(id),
    queryFn: () => fetchProvider(id!),
  });
}

export async function saveProviderProfile(userId: string, values: ProviderValues, publish: boolean, exists: boolean) {
  const row = {
    public_name: values.publicName,
    description: values.description,
    main_trade_id: values.mainTradeId,
    commune_id: values.communeId,
    availability: values.availability,
    phone: values.phone || null,
    opening_hours: values.openingHours || null,
    service_area: values.serviceArea || null,
    extra_info: values.extraInfo || null,
    is_published: publish,
  };
  const res = exists
    ? await supabase.from('provider_profiles').update(row).eq('id', userId)
    : await supabase.from('provider_profiles').insert({ id: userId, ...row });
  if (res.error) throw res.error;

  // Métiers secondaires : on synchronise la liste.
  const wanted = new Set(values.secondaryTradeIds.filter((t) => t !== values.mainTradeId));
  const { data: current, error } = await supabase.from('provider_trades').select('trade_id').eq('provider_id', userId);
  if (error) throw error;
  const have = new Set((current ?? []).map((t) => t.trade_id));
  const toRemove = [...have].filter((t) => !wanted.has(t));
  const toAdd = [...wanted].filter((t) => !have.has(t));
  if (toRemove.length) {
    const r = await supabase.from('provider_trades').delete().eq('provider_id', userId).in('trade_id', toRemove);
    if (r.error) throw r.error;
  }
  if (toAdd.length) {
    const r = await supabase.from('provider_trades').insert(toAdd.map((trade_id) => ({ provider_id: userId, trade_id })));
    if (r.error) throw r.error;
  }
}

export async function setAvailability(userId: string, availability: Availability) {
  const { error } = await supabase.from('provider_profiles').update({ availability }).eq('id', userId);
  if (error) throw error;
}

export async function setPublished(userId: string, isPublished: boolean) {
  const { error } = await supabase.from('provider_profiles').update({ is_published: isPublished }).eq('id', userId);
  if (error) throw error;
}

export async function addGalleryPhoto(userId: string, storagePath: string, position: number, caption?: string) {
  const { error } = await supabase.from('provider_photos').insert({
    provider_id: userId, storage_path: storagePath, position, caption: caption || null,
  });
  if (error) throw error;
}

export async function updateGalleryCaption(photoId: string, caption: string) {
  const { error } = await supabase.from('provider_photos').update({ caption: caption.trim() || null }).eq('id', photoId);
  if (error) throw error;
}

export async function deleteGalleryPhoto(photo: ProviderPhoto) {
  const { error } = await supabase.from('provider_photos').delete().eq('id', photo.id);
  if (error) throw error;
  await supabase.storage.from('provider-photos').remove([photo.storage_path]);
}
