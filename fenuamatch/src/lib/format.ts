import { LOCALE, TIMEZONE } from '@/config/brand';

const xpf = new Intl.NumberFormat(LOCALE, { maximumFractionDigits: 0 });

/** 15000 → « 15 000 F CFP » (jamais de centimes). */
export function formatXpf(amount: number | null | undefined): string {
  if (amount === null || amount === undefined || Number.isNaN(amount)) return '';
  return `${xpf.format(Math.round(amount)).replace(/ | /g, ' ')} F CFP`;
}

const dateFmt = new Intl.DateTimeFormat(LOCALE, { timeZone: TIMEZONE, day: '2-digit', month: '2-digit', year: 'numeric' });
const timeFmt = new Intl.DateTimeFormat(LOCALE, { timeZone: TIMEZONE, hour: '2-digit', minute: '2-digit' });
const dayKeyFmt = new Intl.DateTimeFormat('en-CA', { timeZone: TIMEZONE, year: 'numeric', month: '2-digit', day: '2-digit' });

/** Date au format jj/mm/aaaa, heure de Tahiti. */
export function formatDate(value: string | Date | null | undefined): string {
  if (!value) return '';
  return dateFmt.format(new Date(value));
}

export function formatDateTime(value: string | Date | null | undefined): string {
  if (!value) return '';
  const d = new Date(value);
  return `${dateFmt.format(d)} à ${timeFmt.format(d)}`;
}

export function formatTime(value: string | Date): string {
  return timeFmt.format(new Date(value));
}

/** Clé AAAA-MM-JJ du jour à Tahiti (sert à regrouper ou comparer des dates). */
export function tahitiDayKey(value: string | Date = new Date()): string {
  return dayKeyFmt.format(new Date(value));
}

/** Date seule (colonne SQL "date", ex. 2026-12-24) → 24/12/2026, sans décalage de fuseau. */
export function formatPlainDate(value: string | null | undefined): string {
  if (!value) return '';
  const [y, m, d] = value.split('-');
  return `${d}/${m}/${y}`;
}

/** Affichage court et lisible pour les listes : « 14:32 », « hier », « 12/11/2026 ». */
export function formatRelative(value: string | Date | null | undefined, now: Date = new Date()): string {
  if (!value) return '';
  const d = new Date(value);
  const today = tahitiDayKey(now);
  const key = tahitiDayKey(d);
  if (key === today) return formatTime(d);
  const yesterday = tahitiDayKey(new Date(now.getTime() - 86_400_000));
  if (key === yesterday) return 'hier';
  return formatDate(d);
}

export function daysUntil(value: string | Date, now: Date = new Date()): number {
  return Math.ceil((new Date(value).getTime() - now.getTime()) / 86_400_000);
}

export function pluralize(count: number, singular: string, plural = `${singular}s`): string {
  return `${count} ${count > 1 ? plural : singular}`;
}

/** « aujourd'hui à 14:32 », « hier », « le 12/11/2026 » (à placer après un verbe : « Publiée … »). */
export function formatSince(value: string | Date | null | undefined, now: Date = new Date()): string {
  if (!value) return '';
  const d = new Date(value);
  if (tahitiDayKey(d) === tahitiDayKey(now)) return `aujourd'hui à ${formatTime(d)}`;
  if (tahitiDayKey(d) === tahitiDayKey(new Date(now.getTime() - 86_400_000))) return 'hier';
  return `le ${formatDate(d)}`;
}
