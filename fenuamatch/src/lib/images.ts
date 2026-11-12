import { LIMITS } from '@/config/brand';

export class ImageError extends Error {}

/** Vérifie la signature réelle du fichier (on ne fait pas confiance au type annoncé par le navigateur). */
export async function detectImageType(file: Blob): Promise<'jpeg' | 'png' | 'webp' | null> {
  const head = new Uint8Array(await file.slice(0, 12).arrayBuffer());
  if (head[0] === 0xff && head[1] === 0xd8 && head[2] === 0xff) return 'jpeg';
  if (head[0] === 0x89 && head[1] === 0x50 && head[2] === 0x4e && head[3] === 0x47) return 'png';
  if (head[0] === 0x52 && head[1] === 0x49 && head[2] === 0x46 && head[3] === 0x46
      && head[8] === 0x57 && head[9] === 0x45 && head[10] === 0x42 && head[11] === 0x50) return 'webp';
  return null;
}

export async function validateImage(file: File): Promise<void> {
  if (file.size > LIMITS.maxUploadBytes) {
    throw new ImageError(`« ${file.name} » dépasse 5 Mo.`);
  }
  const type = await detectImageType(file);
  if (type !== 'jpeg' && type !== 'png') {
    throw new ImageError(`« ${file.name} » n'est pas une image JPG ou PNG valide.`);
  }
}

/**
 * Redimensionne et ré-encode l'image en JPEG.
 * Effets : fichier plus léger (connexions lentes) et suppression des métadonnées (EXIF, position GPS).
 */
export async function prepareImage(file: File, maxSide = 1600, quality = 0.82): Promise<Blob> {
  await validateImage(file);
  let bitmap: ImageBitmap;
  try {
    bitmap = await createImageBitmap(file, { imageOrientation: 'from-image' });
  } catch {
    throw new ImageError(`Impossible de lire l'image « ${file.name} ».`);
  }
  const scale = Math.min(1, maxSide / Math.max(bitmap.width, bitmap.height));
  const width = Math.max(1, Math.round(bitmap.width * scale));
  const height = Math.max(1, Math.round(bitmap.height * scale));
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new ImageError('Votre navigateur ne permet pas de préparer l\'image.');
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(0, 0, width, height);
  ctx.drawImage(bitmap, 0, 0, width, height);
  bitmap.close();
  const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, 'image/jpeg', quality));
  if (!blob) throw new ImageError('Impossible de préparer l\'image.');
  if (blob.size > LIMITS.maxUploadBytes) throw new ImageError('Image trop volumineuse après compression.');
  return blob;
}

export function newImageName(): string {
  return `${crypto.randomUUID()}.jpg`;
}
