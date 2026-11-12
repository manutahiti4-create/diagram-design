import { useEffect, useId, useState } from 'react';
import { Link } from 'react-router';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useQueryClient } from '@tanstack/react-query';
import { Eye, ImagePlus, Trash2 } from 'lucide-react';
import { useAuth } from '@/auth/AuthProvider';
import { Button, ButtonLink } from '@/components/ui/Button';
import { CardSection, Notice, PageHeader } from '@/components/ui/Card';
import { Checkbox, Field, Input, Select, Textarea } from '@/components/ui/Field';
import { PageLoader, Spinner } from '@/components/ui/Spinner';
import { ErrorState } from '@/components/ui/States';
import { useToast } from '@/components/ui/Toast';
import { ConfirmDialog } from '@/components/ui/Dialog';
import { cn } from '@/components/ui/cn';
import { AvatarUploader } from '@/components/domain/AvatarUploader';
import { ChipMultiSelect } from '@/components/domain/CategoryChips';
import { LIMITS } from '@/config/brand';
import { errorMessage } from '@/lib/errors';
import { AVAILABILITY_LABELS } from '@/lib/labels';
import { publicImageUrl, uploadImage } from '@/lib/storage';
import { providerSchema, type ProviderFormValues, type ProviderValues } from '@/schemas/provider';
import { confirmAdult, useMyPrivate } from '@/services/account';
import {
  addGalleryPhoto, deleteGalleryPhoto, saveProviderProfile, setPublished, updateGalleryCaption, useProvider,
} from '@/services/providers';
import { useCategories, useCommunes, useTrades } from '@/services/reference';
import type { Availability, ProviderPhoto } from '@/types/models';

export default function ProviderEditPage() {
  const { user, profile, refreshProfile } = useAuth();
  const qc = useQueryClient();
  const toast = useToast();
  const providerQuery = useProvider(user?.id);
  const privateQuery = useMyPrivate(user?.id);
  const { data: categories } = useCategories();
  const { data: trades } = useTrades();
  const { data: communes } = useCommunes();
  const [serverError, setServerError] = useState<string | null>(null);
  const [adultChecked, setAdultChecked] = useState(false);

  const existing = providerQuery.data?.provider;
  const { register, handleSubmit, control, reset, watch, formState: { errors, isSubmitting } } = useForm<ProviderFormValues, unknown, ProviderValues>({
    resolver: zodResolver(providerSchema),
    defaultValues: {
      publicName: '', mainTradeId: '' as unknown as number, secondaryTradeIds: [], communeId: '' as unknown as number,
      description: '', availability: 'available', phone: '', openingHours: '', serviceArea: '', extraInfo: '',
    },
  });

  // On attend aussi les listes (métiers, communes) : sinon le navigateur perd la valeur sélectionnée.
  useEffect(() => {
    if (!providerQuery.data || !trades || !communes) return;
    const p = providerQuery.data.provider;
    reset({
      publicName: p.public_name, mainTradeId: p.main_trade_id, secondaryTradeIds: providerQuery.data.secondaryTradeIds,
      communeId: p.commune_id, description: p.description, availability: p.availability, phone: p.phone ?? '',
      openingHours: p.opening_hours ?? '', serviceArea: p.service_area ?? '', extraInfo: p.extra_info ?? '',
    });
  }, [providerQuery.data, reset, trades, communes]);

  if (providerQuery.isPending || privateQuery.isPending) return <PageLoader />;
  if (providerQuery.isError) return <ErrorState error={providerQuery.error} onRetry={() => void providerQuery.refetch()} />;
  if (!user || !profile) return null;

  const isAdult = Boolean(privateQuery.data?.adult_confirmed_at);
  const mainTradeId = Number(watch('mainTradeId'));

  async function save(values: ProviderValues, publish: boolean) {
    setServerError(null);
    try {
      if (!isAdult) {
        if (!adultChecked) {
          setServerError('Vous devez certifier avoir 18 ans ou plus pour proposer des prestations.');
          return;
        }
        await confirmAdult();
        await privateQuery.refetch();
      }
      if (publish && !profile?.avatar_path) {
        setServerError('Ajoutez une photo de profil avant de publier votre fiche.');
        return;
      }
      await saveProviderProfile(user!.id, values, publish, Boolean(existing));
      await qc.invalidateQueries({ queryKey: ['provider', user!.id] });
      await qc.invalidateQueries({ queryKey: ['providers'] });
      await refreshProfile();
      toast.show(publish ? 'Votre fiche est publiée.' : 'Fiche enregistrée (non publiée).');
    } catch (e) {
      setServerError(errorMessage(e));
    }
  }

  async function unpublish() {
    try {
      await setPublished(user!.id, false);
      await qc.invalidateQueries({ queryKey: ['provider', user!.id] });
      toast.show('Votre fiche n\'apparaît plus dans les recherches.');
    } catch (e) {
      toast.show(errorMessage(e), 'error');
    }
  }

  const tradesByCategory = (categories ?? []).map((c) => ({ category: c, trades: (trades ?? []).filter((t) => t.category_id === c.id) }))
    .filter((g) => g.trades.length);

  return (
    <div className="mx-auto max-w-3xl space-y-4">
      <PageHeader title={existing ? 'Ma fiche prestataire' : 'Créer ma fiche prestataire'}
        subtitle="Ces informations seront visibles par les membres de FenuaMatch."
        action={existing?.is_published ? <ButtonLink to={`/prestataires/${user.id}`} variant="secondary" size="sm" icon={<Eye className="size-4" aria-hidden />}>Voir ma fiche</ButtonLink> : undefined} />

      {existing && (
        <Notice tone={existing.is_published ? 'success' : 'warning'}>
          {existing.is_published ? 'Votre fiche est publiée et visible dans les recherches.' : 'Votre fiche n\'est pas publiée : elle n\'apparaît pas dans les recherches.'}
        </Notice>
      )}

      <CardSection title="Photo de profil">
        <AvatarUploader required />
      </CardSection>

      <form noValidate onSubmit={handleSubmit((v) => save(v, true))} className="space-y-4">
        <CardSection title="Mon activité">
          <div className="space-y-5">
            <Field label="Nom public" required error={errors.publicName?.message} hint="Votre nom, prénom ou nom commercial.">
              {(p) => <Input {...p} autoComplete="organization" {...register('publicName')} />}
            </Field>
            <Field label="Métier principal" required error={errors.mainTradeId?.message}>
              {(p) => (
                <Select {...p} {...register('mainTradeId')}>
                  <option value="">Choisir…</option>
                  {tradesByCategory.map(({ category, trades: list }) => (
                    <optgroup key={category.id} label={category.name}>
                      {list.map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}
                    </optgroup>
                  ))}
                </Select>
              )}
            </Field>
            <Controller control={control} name="secondaryTradeIds" render={({ field }) => (
              <details className="rounded-xl border border-line p-3" open={field.value.length > 0}>
                <summary className="cursor-pointer font-semibold text-navy">Autres métiers (facultatif){field.value.length ? ` — ${field.value.length} choisi(s)` : ''}</summary>
                <div className="mt-3">
                  <ChipMultiSelect label="Vous pouvez aussi être trouvé pour :" error={errors.secondaryTradeIds?.message}
                    items={(trades ?? []).filter((t) => t.id !== mainTradeId)} value={field.value} onChange={field.onChange} />
                </div>
              </details>
            )} />
            <Field label="Commune" required error={errors.communeId?.message}>
              {(p) => (
                <Select {...p} {...register('communeId')}>
                  <option value="">Choisir…</option>
                  {communes?.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
                </Select>
              )}
            </Field>
            <Field label="Description de votre activité" required error={errors.description?.message}
              hint="Ce que vous faites, votre expérience, votre façon de travailler.">
              {(p) => <Textarea {...p} rows={6} maxLength={3000} {...register('description')} />}
            </Field>
            <Controller control={control} name="availability" render={({ field }) => (
              <fieldset>
                <legend className="mb-1.5 text-sm font-semibold text-navy">Disponibilité</legend>
                <div className="grid grid-cols-3 gap-2">
                  {(Object.keys(AVAILABILITY_LABELS) as Availability[]).map((a) => (
                    <label key={a} className={cn('flex min-h-12 cursor-pointer items-center justify-center rounded-xl border-2 px-2 text-center text-sm font-semibold',
                      field.value === a ? 'border-brand-strong bg-brand-50 text-brand-strong' : 'border-line bg-white')}>
                      <input type="radio" className="sr-only" checked={field.value === a} onChange={() => field.onChange(a)} />
                      {AVAILABILITY_LABELS[a]}
                    </label>
                  ))}
                </div>
              </fieldset>
            )} />
          </div>
        </CardSection>

        <CardSection title="Informations facultatives">
          <div className="space-y-5">
            <Field label="Téléphone professionnel" optional error={errors.phone?.message} hint="Affiché sur votre fiche aux membres connectés. Laissez vide pour ne pas l'afficher.">
              {(p) => <Input {...p} type="tel" inputMode="tel" autoComplete="tel" {...register('phone')} />}
            </Field>
            <Field label="Horaires" optional error={errors.openingHours?.message}>
              {(p) => <Textarea {...p} rows={2} maxLength={300} placeholder="Ex. : du lundi au samedi, 7h–17h" {...register('openingHours')} />}
            </Field>
            <Field label="Zone d'intervention / déplacements" optional error={errors.serviceArea?.message}>
              {(p) => <Textarea {...p} rows={2} maxLength={300} placeholder="Ex. : tout Tahiti, côte ouest de préférence" {...register('serviceArea')} />}
            </Field>
            <Field label="Informations complémentaires" optional error={errors.extraInfo?.message}>
              {(p) => <Textarea {...p} rows={3} maxLength={1000} {...register('extraInfo')} />}
            </Field>
          </div>
        </CardSection>

        {!isAdult && (
          <Checkbox label="Je certifie avoir 18 ans ou plus (obligatoire pour proposer des prestations)." checked={adultChecked}
            onChange={(e) => setAdultChecked(e.target.checked)} />
        )}
        {serverError && <Notice tone="danger">{serverError}</Notice>}
        <div className="grid gap-2 sm:flex sm:justify-end">
          {existing?.is_published ? (
            <Button variant="secondary" onClick={() => void unpublish()}>Retirer ma fiche des résultats</Button>
          ) : (
            <Button variant="secondary" loading={isSubmitting} onClick={handleSubmit((v) => save(v, false))}>Enregistrer sans publier</Button>
          )}
          <Button type="submit" size="lg" loading={isSubmitting}>{existing?.is_published ? 'Enregistrer' : 'Enregistrer et publier'}</Button>
        </div>
      </form>

      {existing ? <GalleryManager photos={providerQuery.data?.photos ?? []} /> : (
        <Notice tone="neutral">Enregistrez votre fiche pour pouvoir ajouter des photos de vos réalisations.</Notice>
      )}
      <p className="text-center text-sm text-muted">
        Besoin d'aide ? Consultez les <Link to="/cgu" className="text-brand-strong underline">conditions d'utilisation</Link>.
      </p>
    </div>
  );
}

function GalleryManager({ photos }: { photos: ProviderPhoto[] }) {
  const { user } = useAuth();
  const qc = useQueryClient();
  const toast = useToast();
  const inputId = useId();
  const [uploading, setUploading] = useState(0);
  const [toDelete, setToDelete] = useState<ProviderPhoto | null>(null);
  const [deleting, setDeleting] = useState(false);
  const refresh = () => qc.invalidateQueries({ queryKey: ['provider', user?.id] });

  async function onFiles(files: FileList | null) {
    if (!files || !user) return;
    const room = LIMITS.galleryPhotos - photos.length;
    const list = Array.from(files).slice(0, room);
    if (files.length > room) toast.show(`Limite de ${LIMITS.galleryPhotos} photos : seules ${room} seront ajoutées.`, 'error');
    let position = photos.length;
    for (const file of list) {
      setUploading((n) => n + 1);
      try {
        const path = await uploadImage('provider-photos', user.id, file);
        await addGalleryPhoto(user.id, path, position);
        position += 1;
      } catch (e) {
        toast.show(errorMessage(e), 'error');
      } finally {
        setUploading((n) => n - 1);
      }
    }
    await refresh();
  }

  async function confirmDelete() {
    if (!toDelete) return;
    setDeleting(true);
    try {
      await deleteGalleryPhoto(toDelete);
      await refresh();
      toast.show('Photo supprimée.');
      setToDelete(null);
    } catch (e) {
      toast.show(errorMessage(e), 'error');
    } finally {
      setDeleting(false);
    }
  }

  return (
    <CardSection title={`Galerie de réalisations (${photos.length}/${LIMITS.galleryPhotos})`}>
      <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3">
        {photos.map((ph) => (
          <li key={ph.id} className="overflow-hidden rounded-xl border border-line bg-white">
            <img src={publicImageUrl('provider-photos', ph.storage_path) ?? ''} alt={ph.caption ?? 'Réalisation'} className="aspect-square w-full object-cover" loading="lazy" />
            <div className="space-y-2 p-2">
              <label className="sr-only" htmlFor={`cap-${ph.id}`}>Légende</label>
              <input id={`cap-${ph.id}`} defaultValue={ph.caption ?? ''} maxLength={140} placeholder="Légende (facultatif)"
                className="w-full rounded-lg border border-line px-2 py-1.5 text-sm"
                onBlur={(e) => {
                  if (e.target.value.trim() !== (ph.caption ?? '')) {
                    void updateGalleryCaption(ph.id, e.target.value).then(refresh).catch((err: unknown) => toast.show(errorMessage(err), 'error'));
                  }
                }} />
              <Button variant="dangerGhost" size="sm" block icon={<Trash2 className="size-4" aria-hidden />} onClick={() => setToDelete(ph)}>
                Supprimer
              </Button>
            </div>
          </li>
        ))}
        {photos.length < LIMITS.galleryPhotos && (
          <li>
            <label htmlFor={inputId} className="flex aspect-square cursor-pointer flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed border-line bg-white text-center font-semibold text-brand-strong hover:border-brand focus-within:ring-3 focus-within:ring-brand/40">
              {uploading ? <Spinner /> : <ImagePlus className="size-8" aria-hidden />}
              {uploading ? 'Envoi en cours…' : 'Ajouter des photos'}
              <input id={inputId} type="file" accept="image/jpeg,image/png" multiple className="sr-only" disabled={uploading > 0}
                onChange={(e) => { void onFiles(e.target.files); e.target.value = ''; }} />
            </label>
          </li>
        )}
      </ul>
      <ConfirmDialog open={Boolean(toDelete)} title="Supprimer cette photo ?" message="La photo sera définitivement retirée de votre galerie."
        confirmLabel="Supprimer" danger loading={deleting} onConfirm={() => void confirmDelete()} onClose={() => setToDelete(null)} />
    </CardSection>
  );
}
