import { useId, useState } from 'react';
import { Camera } from 'lucide-react';
import { useAuth } from '@/auth/AuthProvider';
import { Avatar } from '@/components/ui/Avatar';
import { useToast } from '@/components/ui/Toast';
import { Spinner } from '@/components/ui/Spinner';
import { errorMessage } from '@/lib/errors';
import { publicImageUrl, removeFiles, uploadImage } from '@/lib/storage';
import { updateMyProfile } from '@/services/account';

export function AvatarUploader({ required }: { required?: boolean }) {
  const { user, profile, refreshProfile } = useAuth();
  const inputId = useId();
  const toast = useToast();
  const [pending, setPending] = useState(false);
  if (!user || !profile) return null;

  async function onFile(file: File | undefined) {
    if (!file || !user || !profile) return;
    setPending(true);
    try {
      const previous = profile.avatar_path;
      const path = await uploadImage('avatars', user.id, file, 512);
      await updateMyProfile(user.id, { avatar_path: path });
      if (previous) await removeFiles('avatars', [previous]).catch(() => undefined);
      await refreshProfile();
      toast.show('Photo de profil mise à jour.');
    } catch (e) {
      toast.show(errorMessage(e), 'error');
    } finally {
      setPending(false);
    }
  }

  return (
    <div className="flex items-center gap-4">
      <div className="relative">
        <Avatar src={publicImageUrl('avatars', profile.avatar_path)} name={profile.username} size="xl" />
        {pending && <span className="absolute inset-0 flex items-center justify-center rounded-full bg-white/70"><Spinner /></span>}
      </div>
      <div>
        <label htmlFor={inputId} className="inline-flex min-h-11 cursor-pointer items-center gap-2 rounded-xl border border-line bg-white px-4 font-semibold text-navy hover:bg-surface focus-within:ring-3 focus-within:ring-brand/40">
          <Camera className="size-5" aria-hidden />
          {profile.avatar_path ? 'Changer la photo' : 'Ajouter une photo'}
          <input id={inputId} type="file" accept="image/jpeg,image/png" className="sr-only" disabled={pending}
            onChange={(e) => { void onFile(e.target.files?.[0]); e.target.value = ''; }} />
        </label>
        <p className="mt-1 text-sm text-muted">JPG ou PNG, 5 Mo max.{required && !profile.avatar_path ? ' Obligatoire pour publier votre fiche.' : ''}</p>
      </div>
    </div>
  );
}
