import { z } from 'zod';

const optionalText = (max: number) => z.string().trim().max(max, `${max} caractères maximum.`).optional();

export const providerSchema = z.object({
  publicName: z.string().trim().min(2, 'Au moins 2 caractères.').max(60, '60 caractères maximum.'),
  mainTradeId: z.coerce.number({ message: 'Choisissez votre métier principal.' }).int().positive('Choisissez votre métier principal.'),
  secondaryTradeIds: z.array(z.number().int()).max(10, '10 métiers secondaires maximum.'),
  communeId: z.coerce.number({ message: 'Choisissez une commune.' }).int().positive('Choisissez une commune.'),
  description: z.string().trim().min(1, 'Décrivez votre activité.').max(3000, '3 000 caractères maximum.'),
  availability: z.enum(['available', 'busy', 'unavailable']),
  phone: z
    .string()
    .trim()
    .regex(/^$|^[0-9+ .-]{6,20}$/, 'Numéro invalide (chiffres, espaces, + ou tirets).')
    .optional(),
  openingHours: optionalText(300),
  serviceArea: optionalText(300),
  extraInfo: optionalText(1000),
});
export type ProviderFormValues = z.input<typeof providerSchema>;
export type ProviderValues = z.output<typeof providerSchema>;
