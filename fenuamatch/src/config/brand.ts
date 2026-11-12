/** Identité de marque — modifiable ici sans toucher au reste du code. */
export const BRAND = {
  name: 'FenuaMatch',
  slogan: 'Le bon talent, au bon endroit.',
  heroTitle: 'Trouvez le bon prestataire à Tahiti.',
  heroSubtitle:
    'Décrivez votre besoin ou cherchez un métier : FenuaMatch vous met en relation avec des prestataires de votre île, gratuitement.',
  contactEmail: 'À compléter avant publication',
  /** Version des conditions d'utilisation acceptées à l'inscription. */
  termsVersion: '2026-11',
} as const;

export const TIMEZONE = 'Pacific/Tahiti';
export const LOCALE = 'fr-FR';

export const LIMITS = {
  listingPhotos: 3,
  galleryPhotos: 10,
  maxUploadBytes: 5 * 1024 * 1024,
  listingEdits: 3,
  listingDurationDays: 30,
  usernameChangeDelayDays: 90,
} as const;

/** Exemples de recherches proposés sur l'accueil. */
export const SEARCH_EXAMPLES = [
  'Plombier', 'Électricien', 'Jardinier', 'Peintre', 'Climatisation', 'Ménage', 'Informatique', 'Maçonnerie',
] as const;
