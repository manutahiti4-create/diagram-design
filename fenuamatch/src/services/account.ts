import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import type { ProfilePrivate } from '@/types/models';

export function useMyPrivate(userId: string | undefined) {
  return useQuery({
    queryKey: ['me', 'private', userId],
    enabled: Boolean(userId),
    queryFn: async (): Promise<ProfilePrivate | null> => {
      const { data, error } = await supabase.from('profile_private').select('*').eq('user_id', userId!).maybeSingle();
      if (error) throw error;
      return data;
    },
  });
}

export async function confirmAdult() {
  const { error } = await supabase.rpc('confirm_adult');
  if (error) throw error;
}

export async function updateMyProfile(userId: string, patch: { avatar_path?: string | null; commune_id?: number | null }) {
  const { error } = await supabase.from('profiles').update(patch).eq('id', userId);
  if (error) throw error;
}

export async function updateMyPhone(userId: string, phone: string | null) {
  const { error } = await supabase.from('profile_private').update({ phone }).eq('user_id', userId);
  if (error) throw error;
}

export async function changeUsername(username: string) {
  const { error } = await supabase.rpc('change_username', { p_new_username: username });
  if (error) throw error;
}

export async function exportMyData(): Promise<unknown> {
  const { data, error } = await supabase.rpc('export_my_data');
  if (error) throw error;
  return data;
}

/** Supprime d'abord les fichiers de l'utilisateur, puis le compte (fonction serveur). */
export async function deleteMyAccount(userId: string, confirmUsername: string) {
  for (const bucket of ['avatars', 'provider-photos'] as const) {
    const { data } = await supabase.storage.from(bucket).list(userId, { limit: 100 });
    if (data?.length) await supabase.storage.from(bucket).remove(data.map((f) => `${userId}/${f.name}`));
  }
  const { data: listings } = await supabase.from('listing_photos').select('storage_path, listings!inner(client_id)').eq('listings.client_id', userId);
  if (listings?.length) await supabase.storage.from('listing-photos').remove(listings.map((l) => l.storage_path));
  const { error } = await supabase.rpc('delete_my_account', { p_confirm_username: confirmUsername });
  if (error) throw error;
  await supabase.auth.signOut({ scope: 'local' });
}
