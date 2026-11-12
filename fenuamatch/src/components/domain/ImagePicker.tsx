import { useEffect, useId, useState } from 'react';
import { ImagePlus, X } from 'lucide-react';
import { validateImage, ImageError } from '@/lib/images';

export interface PickedImage {
  key: string;
  file?: File;          // nouvelle image, pas encore envoyée
  url: string;          // aperçu (local ou distant)
  existingId?: string;  // image déjà enregistrée
  storagePath?: string;
}

interface Props {
  images: PickedImage[];
  onChange: (images: PickedImage[]) => void;
  max: number;
  label?: string;
}

/** Choix de photos JPG/PNG (5 Mo max) avec aperçu et suppression avant publication. */
export function ImagePicker({ images, onChange, max, label = 'Ajouter des photos' }: Props) {
  const inputId = useId();
  const [error, setError] = useState<string | null>(null);

  useEffect(() => () => {
    images.forEach((img) => { if (img.file) URL.revokeObjectURL(img.url); });
  }, []);

  async function handleFiles(list: FileList | null) {
    setError(null);
    if (!list) return;
    const room = max - images.length;
    const files = Array.from(list).slice(0, Math.max(room, 0));
    if (list.length > room) setError(`Maximum ${max} photos.`);
    const accepted: PickedImage[] = [];
    for (const file of files) {
      try {
        await validateImage(file);
        accepted.push({ key: crypto.randomUUID(), file, url: URL.createObjectURL(file) });
      } catch (e) {
        setError(e instanceof ImageError ? e.message : 'Image refusée.');
      }
    }
    if (accepted.length) onChange([...images, ...accepted]);
  }

  function remove(key: string) {
    const img = images.find((i) => i.key === key);
    if (img?.file) URL.revokeObjectURL(img.url);
    onChange(images.filter((i) => i.key !== key));
  }

  return (
    <div>
      <div className="grid grid-cols-3 gap-2 sm:grid-cols-4">
        {images.map((img, index) => (
          <div key={img.key} className="relative aspect-square overflow-hidden rounded-xl border border-line bg-surface">
            <img src={img.url} alt={`Photo ${index + 1}`} className="size-full object-cover" />
            <button type="button" onClick={() => remove(img.key)}
              className="absolute top-1 right-1 rounded-full bg-navy/80 p-1.5 text-white hover:bg-navy" aria-label={`Retirer la photo ${index + 1}`}>
              <X className="size-4" aria-hidden />
            </button>
          </div>
        ))}
        {images.length < max && (
          <label htmlFor={inputId}
            className="flex aspect-square cursor-pointer flex-col items-center justify-center gap-1 rounded-xl border-2 border-dashed border-line bg-white p-2 text-center text-sm font-medium text-brand-strong hover:border-brand focus-within:ring-3 focus-within:ring-brand/40">
            <ImagePlus className="size-7" aria-hidden />
            <span>{label}</span>
            <input id={inputId} type="file" accept="image/jpeg,image/png" multiple className="sr-only"
              onChange={(e) => { void handleFiles(e.target.files); e.target.value = ''; }} />
          </label>
        )}
      </div>
      <p className="mt-2 text-sm text-muted">JPG ou PNG, 5 Mo maximum par photo ({images.length}/{max}).</p>
      {error && <p className="mt-1 text-sm font-medium text-danger" role="alert">{error}</p>}
    </div>
  );
}
