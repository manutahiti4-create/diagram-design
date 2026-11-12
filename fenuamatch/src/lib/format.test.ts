import { describe, expect, it } from 'vitest';
import { formatDate, formatDateTime, formatPlainDate, formatSince, formatXpf, tahitiDayKey } from './format';
import { effectiveListingStatus } from './labels';
import { errorMessage } from './errors';
import { safeRedirect } from '@/auth/guards';
import { signupSchema } from '@/schemas/auth';
import { listingSchema } from '@/schemas/listing';

describe('formatage', () => {
  it('F CFP sans centimes, avec séparateur de milliers', () => {
    expect(formatXpf(15000)).toBe('15 000 F CFP');
    expect(formatXpf(1500.6)).toBe('1 501 F CFP');
    expect(formatXpf(null)).toBe('');
  });
  it('dates au format jj/mm/aaaa à l\'heure de Tahiti (UTC−10)', () => {
    // 12/11/2026 à 05:00 UTC = 11/11/2026 à 19:00 à Tahiti
    expect(formatDate('2026-11-12T05:00:00Z')).toBe('11/11/2026');
    expect(formatDateTime('2026-11-12T05:00:00Z')).toBe('11/11/2026 à 19:00');
    expect(tahitiDayKey('2026-11-12T05:00:00Z')).toBe('2026-11-11');
    expect(formatPlainDate('2026-12-24')).toBe('24/12/2026');
  });
  it('formatSince', () => {
    const now = new Date('2026-11-12T20:00:00Z');
    expect(formatSince('2026-11-12T19:00:00Z', now)).toBe('aujourd\'hui à 09:00');
    expect(formatSince('2026-11-11T19:00:00Z', now)).toBe('hier');
    expect(formatSince('2026-10-01T19:00:00Z', now)).toBe('le 01/10/2026');
  });
});

describe('règles', () => {
  it('une annonce publiée dont la date est dépassée s\'affiche « expirée »', () => {
    expect(effectiveListingStatus({ status: 'published', expires_at: '2000-01-01T00:00:00Z' })).toBe('expired');
    expect(effectiveListingStatus({ status: 'assigned', expires_at: '2000-01-01T00:00:00Z' })).toBe('assigned');
  });
  it('redirections internes uniquement', () => {
    expect(safeRedirect('/annonces/1')).toBe('/annonces/1');
    expect(safeRedirect('https://pirate.example')).toBe('/tableau-de-bord');
    expect(safeRedirect('//pirate.example')).toBe('/tableau-de-bord');
    expect(safeRedirect('/\\pirate.example')).toBe('/tableau-de-bord');
  });
  it('messages d\'erreur compréhensibles', () => {
    expect(errorMessage({ message: 'Invalid login credentials' })).toBe('Adresse e-mail ou mot de passe incorrect.');
    expect(errorMessage(new TypeError('Failed to fetch'))).toMatch(/Connexion impossible/);
    expect(errorMessage({ message: 'Cette annonce n\'accepte plus de nouvelles propositions.' })).toMatch(/n'accepte plus/);
  });
});

describe('validation des formulaires', () => {
  const base = { email: 'a@b.pf', username: 'manu.tahiti', password: 'motdepasse1', passwordConfirm: 'motdepasse1', accountType: 'client', adult: true, terms: true };
  it('inscription', () => {
    expect(signupSchema.safeParse(base).success).toBe(true);
    expect(signupSchema.safeParse({ ...base, password: 'court' }).success).toBe(false);
    expect(signupSchema.safeParse({ ...base, passwordConfirm: 'autre123' }).success).toBe(false);
    expect(signupSchema.safeParse({ ...base, username: 'Manu Tahiti' }).success).toBe(false);
    expect(signupSchema.safeParse({ ...base, adult: false }).success).toBe(false);
  });
  it('annonce : titre ≥ 5, description ≥ 10, une catégorie', () => {
    const ok = { title: 'Fuite évier', description: 'Petite fuite sous l\'évier', communeId: '3', categoryIds: [1], dateMode: 'flexible', budget: '' };
    expect(listingSchema.safeParse(ok).success).toBe(true);
    expect(listingSchema.safeParse({ ...ok, title: 'abc' }).success).toBe(false);
    expect(listingSchema.safeParse({ ...ok, categoryIds: [] }).success).toBe(false);
    expect(listingSchema.safeParse({ ...ok, budget: '1 500,50' }).success).toBe(false);
    expect(listingSchema.safeParse({ ...ok, dateMode: 'precise' }).success).toBe(false);
  });
});
