import { keepPreviousData, useInfiniteQuery, useQuery } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import type { DateMode, Listing, ListingPhoto, Mission, Proposal, ProviderProfile, Profile } from '@/types/models';
import type { ListingValues } from '@/schemas/listing';

export interface ListingCardData extends Listing {
  cats: { category_id: number }[];
  photos: { storage_path: string; position: number }[];
  commune: { name: string } | null;
  client: { username: string; avatar_path: string | null } | null;
  proposals_count?: number;
}

const CARD_SELECT = `*, cats:listing_categories(category_id), photos:listing_photos(storage_path, position),
  commune:communes(name), client:profiles!listings_client_id_fkey(username, avatar_path)`;

export interface ListingFilters {
  q?: string;
  categoryId?: number;
  communeId?: number;
}

const PAGE = 12;

export function normalizeQuery(q: string): string {
  return q.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/[^a-z0-9 ]+/g, ' ').trim();
}

/** Annonces ouvertes (publiées, non expirées) — visibles des membres connectés. */
export function useOpenListings(filters: ListingFilters, enabled = true) {
  return useInfiniteQuery({
    queryKey: ['listings', 'open', filters],
    enabled,
    initialPageParam: 0,
    placeholderData: keepPreviousData,
    queryFn: async ({ pageParam }): Promise<ListingCardData[]> => {
      const select = filters.categoryId ? `${CARD_SELECT}, filter:listing_categories!inner(category_id)` : CARD_SELECT;
      let q = supabase
        .from('listings')
        .select(select)
        .in('status', ['published', 'in_discussion'])
        .gt('expires_at', new Date().toISOString())
        .eq('is_hidden', false)
        .order('published_at', { ascending: false })
        .range(pageParam, pageParam + PAGE - 1);
      if (filters.categoryId) q = q.eq('filter.category_id', filters.categoryId);
      if (filters.communeId) q = q.eq('commune_id', filters.communeId);
      const text = filters.q ? normalizeQuery(filters.q) : '';
      if (text) q = q.textSearch('search_document', text, { config: 'french', type: 'websearch' });
      const { data, error } = await q;
      if (error) throw error;
      return (data ?? []) as unknown as ListingCardData[];
    },
    getNextPageParam: (last, all) => (last.length === PAGE ? all.reduce((n, p) => n + p.length, 0) : undefined),
  });
}

export function useMyListings(userId: string | undefined) {
  return useQuery({
    queryKey: ['listings', 'mine', userId],
    enabled: Boolean(userId),
    queryFn: async (): Promise<ListingCardData[]> => {
      const { data, error } = await supabase
        .from('listings')
        .select(`${CARD_SELECT}, proposals(count)`)
        .eq('client_id', userId!)
        .order('created_at', { ascending: false })
        .limit(100);
      if (error) throw error;
      return (data ?? []).map((l) => {
        const row = l as unknown as ListingCardData & { proposals: { count: number }[] };
        return { ...row, proposals_count: row.proposals?.[0]?.count ?? 0 };
      });
    },
  });
}

export interface ListingDetails {
  listing: Listing;
  categoryIds: number[];
  photos: ListingPhoto[];
  client: Pick<Profile, 'id' | 'username' | 'avatar_path' | 'is_demo'> | null;
  commune: string;
}

export function useListing(id: string | undefined) {
  return useQuery({
    queryKey: ['listing', id],
    enabled: Boolean(id),
    queryFn: async (): Promise<ListingDetails | null> => {
      const { data, error } = await supabase
        .from('listings')
        .select(`*, cats:listing_categories(category_id), photos:listing_photos(*), commune:communes(name),
          client:profiles!listings_client_id_fkey(id, username, avatar_path, is_demo)`)
        .eq('id', id!)
        .maybeSingle();
      if (error) throw error;
      if (!data) return null;
      const row = data as unknown as Listing & {
        cats: { category_id: number }[]; photos: ListingPhoto[]; commune: { name: string } | null;
        client: ListingDetails['client'];
      };
      const { cats, photos, commune, client, ...listing } = row;
      return {
        listing: listing as Listing,
        categoryIds: cats.map((c) => c.category_id),
        photos: [...photos].sort((a, b) => a.position - b.position),
        client,
        commune: commune?.name ?? '',
      };
    },
  });
}

export interface ProposalWithProvider extends Proposal {
  provider: Pick<ProviderProfile, 'id' | 'public_name' | 'availability' | 'main_trade_id'> | null;
  providerProfile: Pick<Profile, 'id' | 'username' | 'avatar_path' | 'is_demo'> | null;
}

export function useListingProposals(listingId: string | undefined, enabled = true) {
  return useQuery({
    queryKey: ['listing', listingId, 'proposals'],
    enabled: Boolean(listingId) && enabled,
    queryFn: async (): Promise<ProposalWithProvider[]> => {
      const { data, error } = await supabase
        .from('proposals')
        .select('*')
        .eq('listing_id', listingId!)
        .order('created_at', { ascending: true });
      if (error) throw error;
      const ids = (data ?? []).map((p) => p.provider_id).filter((v): v is string => Boolean(v));
      const [pp, prof] = ids.length
        ? await Promise.all([
            supabase.from('provider_profiles').select('id, public_name, availability, main_trade_id').in('id', ids),
            supabase.from('profiles').select('id, username, avatar_path, is_demo').in('id', ids),
          ])
        : [{ data: [], error: null }, { data: [], error: null }];
      if (pp.error) throw pp.error;
      if (prof.error) throw prof.error;
      return (data ?? []).map((p) => ({
        ...p,
        provider: pp.data?.find((x) => x.id === p.provider_id) ?? null,
        providerProfile: prof.data?.find((x) => x.id === p.provider_id) ?? null,
      }));
    },
  });
}

export function useListingMissions(listingId: string | undefined, enabled = true) {
  return useQuery({
    queryKey: ['listing', listingId, 'missions'],
    enabled: Boolean(listingId) && enabled,
    queryFn: async (): Promise<Mission[]> => {
      const { data, error } = await supabase.from('missions').select('*').eq('listing_id', listingId!).order('created_at', { ascending: false });
      if (error) throw error;
      return data ?? [];
    },
  });
}

export interface MyProposal extends Proposal {
  listing: Pick<Listing, 'id' | 'title' | 'status' | 'expires_at' | 'commune_id' | 'is_hidden'> | null;
}

export function useMyProposals(userId: string | undefined) {
  return useQuery({
    queryKey: ['proposals', 'mine', userId],
    enabled: Boolean(userId),
    queryFn: async (): Promise<MyProposal[]> => {
      const { data, error } = await supabase
        .from('proposals')
        .select('*, listing:listings(id, title, status, expires_at, commune_id, is_hidden)')
        .eq('provider_id', userId!)
        .order('updated_at', { ascending: false })
        .limit(100);
      if (error) throw error;
      return (data ?? []) as unknown as MyProposal[];
    },
  });
}

export interface MissionWithListing extends Mission {
  listing: Pick<Listing, 'id' | 'title'> | null;
}

export function useMyMissions(userId: string | undefined) {
  return useQuery({
    queryKey: ['missions', 'mine', userId],
    enabled: Boolean(userId),
    queryFn: async (): Promise<MissionWithListing[]> => {
      const { data, error } = await supabase
        .from('missions')
        .select('*, listing:listings(id, title)')
        .or(`client_id.eq.${userId},provider_id.eq.${userId}`)
        .order('updated_at', { ascending: false })
        .limit(50);
      if (error) throw error;
      return (data ?? []) as unknown as MissionWithListing[];
    },
  });
}

function rpcArgs(values: ListingValues) {
  const budget = values.budget ? Number(values.budget) : undefined;
  return {
    p_title: values.title,
    p_description: values.description,
    p_commune_id: values.communeId,
    p_category_ids: values.categoryIds,
    p_budget_xpf: budget,
    p_date_mode: values.dateMode as DateMode,
    p_desired_date: values.dateMode === 'precise' ? values.desiredDate : undefined,
  };
}

export async function createListing(values: ListingValues, publish: boolean): Promise<string> {
  const { data, error } = await supabase.rpc('create_listing', { ...rpcArgs(values), p_publish: publish });
  if (error) throw error;
  return data;
}

export async function updateListing(id: string, values: ListingValues) {
  const { error } = await supabase.rpc('update_listing', { p_listing_id: id, ...rpcArgs(values) });
  if (error) throw error;
}

async function call(fn: 'publish_listing' | 'renew_listing' | 'cancel_listing', id: string) {
  const { error } = await supabase.rpc(fn, { p_listing_id: id });
  if (error) throw error;
}
export const publishListing = (id: string) => call('publish_listing', id);
export const renewListing = (id: string) => call('renew_listing', id);
export const cancelListing = (id: string) => call('cancel_listing', id);

export async function deleteDraft(id: string, photoPaths: string[]) {
  if (photoPaths.length) await supabase.storage.from('listing-photos').remove(photoPaths);
  const { error } = await supabase.from('listings').delete().eq('id', id).eq('status', 'draft');
  if (error) throw error;
}

export async function addListingPhoto(listingId: string, storagePath: string, position: number) {
  const { error } = await supabase.from('listing_photos').insert({ listing_id: listingId, storage_path: storagePath, position });
  if (error) {
    await supabase.storage.from('listing-photos').remove([storagePath]);
    throw error;
  }
}

export async function removeListingPhoto(photo: Pick<ListingPhoto, 'id' | 'storage_path'>) {
  const { error } = await supabase.from('listing_photos').delete().eq('id', photo.id);
  if (error) throw error;
  await supabase.storage.from('listing-photos').remove([photo.storage_path]);
}

// --- Propositions et missions -------------------------------------------------
export async function submitProposal(listingId: string, message: string, price?: number) {
  const { data, error } = await supabase.rpc('submit_proposal', { p_listing_id: listingId, p_message: message, p_price_xpf: price });
  if (error) throw error;
  return data;
}

type ProposalFn = 'withdraw_proposal' | 'decline_proposal' | 'select_proposal';
export async function proposalAction(fn: ProposalFn, proposalId: string) {
  const { error } = await supabase.rpc(fn, { p_proposal_id: proposalId });
  if (error) throw error;
}

export async function missionAction(fn: 'confirm_mission' | 'complete_mission', missionId: string) {
  const { error } = await supabase.rpc(fn, { p_mission_id: missionId });
  if (error) throw error;
}

export async function closeMission(fn: 'decline_mission' | 'cancel_mission', missionId: string, reason?: string) {
  const { error } = await supabase.rpc(fn, { p_mission_id: missionId, p_reason: reason || undefined });
  if (error) throw error;
}
