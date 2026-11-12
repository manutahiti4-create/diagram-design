import { supabase } from './supabase';
import { newImageName, prepareImage } from './images';

export type PublicBucket = 'avatars' | 'provider-photos';

export function publicImageUrl(bucket: PublicBucket, path: string | null | undefined): string | null {
  if (!path) return null;
  return supabase.storage.from(bucket).getPublicUrl(path).data.publicUrl;
}

export async function uploadImage(
  bucket: PublicBucket | 'listing-photos', folder: string, file: File, maxSide = 1600,
): Promise<string> {
  const blob = await prepareImage(file, maxSide);
  const path = `${folder}/${newImageName()}`;
  const { error } = await supabase.storage.from(bucket).upload(path, blob, {
    contentType: 'image/jpeg',
    cacheControl: '31536000',
    upsert: false,
  });
  if (error) throw error;
  return path;
}

export async function removeFiles(bucket: PublicBucket | 'listing-photos', paths: string[]): Promise<void> {
  if (paths.length === 0) return;
  const { error } = await supabase.storage.from(bucket).remove(paths);
  if (error) throw error;
}

/** URLs temporaires pour les photos d'annonces (stockage privé, réservé aux membres connectés). */
export async function signedListingUrls(paths: string[]): Promise<Record<string, string>> {
  if (paths.length === 0) return {};
  const { data, error } = await supabase.storage.from('listing-photos').createSignedUrls(paths, 60 * 60);
  if (error) throw error;
  const map: Record<string, string> = {};
  for (const item of data) {
    if (item.path && item.signedUrl) map[item.path] = item.signedUrl;
  }
  return map;
}
