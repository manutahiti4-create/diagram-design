import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useQueryClient } from '@tanstack/react-query';
import { useAuth } from '@/auth/AuthProvider';
import { Button } from '@/components/ui/Button';
import { CardSection, Notice, PageHeader } from '@/components/ui/Card';
import { Checkbox, Field, Input, Select, Textarea } from '@/components/ui/Field';
import { PageLoader } from '@/components/ui/Spinner';
import { EmptyState, ErrorState } from '@/components/ui/States';
import { useToast } from '@/components/ui/Toast';
import { cn } from '@/components/ui/cn';
import { BackLink } from '@/components/domain/BackLink';
import { ChipMultiSelect } from '@/components/domain/CategoryChips';
import { ImagePicker, type PickedImage } from '@/components/domain/ImagePicker';
import { LIMITS } from '@/config/brand';
import { errorMessage } from '@/lib/errors';
import { tahitiDayKey } from '@/lib/format';
import { DATE_MODE_LABELS } from '@/lib/labels';
import { signedListingUrls, uploadImage } from '@/lib/storage';
import { listingSchema, type ListingFormValues, type ListingValues } from '@/schemas/listing';
import { confirmAdult, useMyPrivate } from '@/services/account';
import { addListingPhoto, createListing, removeListingPhoto, updateListing, useListing } from '@/services/listings';
import { useCategories, useCommunes } from '@/services/reference';
import type { DateMode } from '@/types/models';

const EDITABLE = ['draft', 'published', 'in_discussion', 'expired'];

export default function ListingFormPage() {
  const { id } = useParams();
  const isEdit = Boolean(id);
  const { user } = useAuth();
  const navigate = useNavigate();
  const qc = useQueryClient();
  const toast = useToast();
  const listingQuery = useListing(id);
  const privateQuery = useMyPrivate(user?.id);
  const { data: categories } = useCategories();
  const { data: communes } = useCommunes();
  const [images, setImages] = useState<PickedImage[]>([]);
  const [serverError, setServerError] = useState<string | null>(null);
  const [adultChecked, setAdultChecked] = useState(false);
  const [progress, setProgress] = useState<string | null>(null);

  const { register, handleSubmit, control, reset, watch, formState: { errors, isSubmitting } } = useForm<ListingFormValues, unknown, ListingValues>({
    resolver: zodResolver(listingSchema),
    defaultValues: { title: '', description: '', communeId: '' as unknown as number, categoryIds: [], budget: '', dateMode: 'flexible', desiredDate: '' },
  });

  const details = listingQuery.data;
  useEffect(() => {
    if (!details || !communes || !categories) return;
    const l = details.listing;
    reset({
      title: l.title, description: l.description, communeId: l.commune_id, categoryIds: details.categoryIds,
      budget: l.budget_xpf !== null ? String(l.budget_xpf) : '', dateMode: l.date_mode, desiredDate: l.desired_date ?? '',
    });
    void signedListingUrls(details.photos.map((p) => p.storage_path)).then((urls) => {
      setImages(details.photos.map((p) => ({ key: p.id, existingId: p.id, storagePath: p.storage_path, url: urls[p.storage_path] ?? '' })));
    }).catch(() => undefined);
  }, [details, reset, communes, categories]);

  if ((isEdit && listingQuery.isPending) || privateQuery.isPending) return <PageLoader />;
  if (isEdit && listingQuery.isError) return <ErrorState error={listingQuery.error} onRetry={() => void listingQuery.refetch()} />;
  if (isEdit && (!details || details.listing.client_id !== user?.id)) {
    return <EmptyState title="Annonce introuvable" message="Cette annonce n'existe pas ou ne vous appartient pas." />;
  }
  const listing = details?.listing;
  if (listing && (!EDITABLE.includes(listing.status) || (listing.status !== 'draft' && listing.edit_count >= LIMITS.listingEdits))) {
    return (
      <EmptyState title="Modification impossible"
        message={!EDITABLE.includes(listing.status)
          ? 'Une mission est engagée ou l\'annonce est clôturée : son contenu est verrouillé.'
          : `Vous avez utilisé les ${LIMITS.listingEdits} modifications autorisées pour cette annonce.`} />
    );
  }

  const isAdult = Boolean(privateQuery.data?.adult_confirmed_at);
  const dateMode = watch('dateMode');
  const editsLeft = listing && listing.status !== 'draft' ? LIMITS.listingEdits - listing.edit_count : null;

  async function syncPhotos(listingId: string) {
    const kept = new Set(images.filter((i) => i.existingId).map((i) => i.existingId));
    for (const old of details?.photos ?? []) {
      if (!kept.has(old.id)) await removeListingPhoto(old);
    }
    const fresh = images.filter((i) => i.file);
    let position = images.length - fresh.length;
    for (const [index, img] of fresh.entries()) {
      setProgress(`Envoi de la photo ${index + 1} sur ${fresh.length}…`);
      const path = await uploadImage('listing-photos', `${user!.id}/${listingId}`, img.file!);
      await addListingPhoto(listingId, path, position);
      position += 1;
    }
    setProgress(null);
  }

  async function submit(values: ListingValues, publish: boolean) {
    setServerError(null);
    try {
      if (!isAdult) {
        if (!adultChecked) {
          setServerError('Vous devez certifier avoir 18 ans ou plus pour publier une annonce.');
          return;
        }
        await confirmAdult();
        await privateQuery.refetch();
      }
      let listingId = id;
      if (isEdit) {
        await updateListing(id!, values);
      } else {
        listingId = await createListing(values, publish);
      }
      try {
        await syncPhotos(listingId!);
      } catch (photoError) {
        toast.show(`Annonce enregistrée, mais une photo n'a pas pu être envoyée : ${errorMessage(photoError)}`, 'error');
      }
      await qc.invalidateQueries({ queryKey: ['listings'] });
      await qc.invalidateQueries({ queryKey: ['listing', listingId] });
      toast.show(isEdit ? 'Annonce modifiée.' : publish ? 'Votre annonce est publiée pour 30 jours.' : 'Brouillon enregistré.');
      navigate(`/annonces/${listingId}`, { replace: true });
    } catch (e) {
      setProgress(null);
      setServerError(errorMessage(e));
    }
  }

  return (
    <div className="mx-auto max-w-2xl">
      <BackLink to={isEdit ? `/annonces/${id}` : '/annonces'} />
      <PageHeader title={isEdit ? 'Modifier l\'annonce' : 'Publier une annonce'}
        subtitle={isEdit ? undefined : 'Gratuit. Votre annonce reste en ligne 30 jours et peut être renouvelée.'} />
      {editsLeft !== null && (
        <Notice tone="warning" className="mb-4">
          Il vous reste {editsLeft} modification{editsLeft > 1 ? 's' : ''} possible{editsLeft > 1 ? 's' : ''}. Les prestataires ayant déjà répondu seront prévenus.
        </Notice>
      )}

      <form noValidate onSubmit={handleSubmit((v) => submit(v, true))} className="space-y-4">
        <CardSection>
          <div className="space-y-5">
            <Field label="Titre" required error={errors.title?.message} hint="Ex. : Recherche électricien pour installation de prises">
              {(p) => <Input {...p} maxLength={120} {...register('title')} />}
            </Field>
            <Field label="Décrivez votre besoin" required error={errors.description?.message}
              hint="Ce qu'il faut faire, la taille du chantier, les contraintes… N'indiquez pas votre adresse exacte.">
              {(p) => <Textarea {...p} rows={6} maxLength={4000} {...register('description')} />}
            </Field>
            <Field label="Commune" required error={errors.communeId?.message}>
              {(p) => (
                <Select {...p} {...register('communeId')}>
                  <option value="">Choisir…</option>
                  {communes?.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
                </Select>
              )}
            </Field>
            <Controller control={control} name="categoryIds" render={({ field }) => (
              <ChipMultiSelect label="Catégories (une ou plusieurs)" items={categories ?? []} value={field.value} onChange={field.onChange}
                error={errors.categoryIds?.message} />
            )} />
          </div>
        </CardSection>

        <CardSection title="Détails facultatifs">
          <div className="space-y-5">
            <Field label="Budget" optional error={errors.budget?.message} hint="En F CFP. Laissez vide si vous ne savez pas.">
              {(p) => (
                <div className="relative">
                  <Input {...p} inputMode="numeric" pattern="[0-9]*" className="pr-16" {...register('budget')} />
                  <span className="pointer-events-none absolute top-1/2 right-4 -translate-y-1/2 text-muted">F CFP</span>
                </div>
              )}
            </Field>
            <Controller control={control} name="dateMode" render={({ field }) => (
              <fieldset>
                <legend className="mb-1.5 text-sm font-semibold text-navy">Date souhaitée</legend>
                <div className="grid grid-cols-3 gap-2">
                  {(Object.keys(DATE_MODE_LABELS) as DateMode[]).map((m) => (
                    <label key={m} className={cn('flex min-h-12 cursor-pointer items-center justify-center rounded-xl border-2 px-2 text-center text-sm font-semibold',
                      field.value === m ? 'border-brand-strong bg-brand-50 text-brand-strong' : 'border-line bg-white')}>
                      <input type="radio" className="sr-only" checked={field.value === m} onChange={() => field.onChange(m)} />
                      {DATE_MODE_LABELS[m]}
                    </label>
                  ))}
                </div>
              </fieldset>
            )} />
            {dateMode === 'precise' && (
              <Field label="Date" required error={errors.desiredDate?.message}>
                {(p) => <Input {...p} type="date" min={tahitiDayKey()} {...register('desiredDate')} />}
              </Field>
            )}
            <div>
              <p className="mb-1.5 text-sm font-semibold text-navy">Photos <span className="font-normal text-muted">(facultatif, 3 maximum)</span></p>
              <ImagePicker images={images} onChange={setImages} max={LIMITS.listingPhotos} />
            </div>
          </div>
        </CardSection>

        {!isAdult && (
          <Checkbox label="Je certifie avoir 18 ans ou plus." checked={adultChecked} onChange={(e) => setAdultChecked(e.target.checked)} />
        )}
        {serverError && <Notice tone="danger">{serverError}</Notice>}
        {progress && <Notice tone="brand">{progress}</Notice>}

        <div className="grid gap-2 sm:flex sm:justify-end">
          {!isEdit && (
            <Button variant="secondary" loading={isSubmitting} onClick={handleSubmit((v) => submit(v, false))}>Enregistrer en brouillon</Button>
          )}
          <Button type="submit" size="lg" loading={isSubmitting}>{isEdit ? 'Enregistrer les modifications' : 'Publier l\'annonce'}</Button>
        </div>
      </form>
    </div>
  );
}
