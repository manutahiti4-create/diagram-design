import { z } from 'zod';

export const listingSchema = z
  .object({
    title: z.string().trim().min(5, 'Au moins 5 caractères.').max(120, '120 caractères maximum.'),
    description: z.string().trim().min(10, 'Au moins 10 caractères.').max(4000, '4 000 caractères maximum.'),
    communeId: z.coerce.number({ message: 'Choisissez une commune.' }).int().positive('Choisissez une commune.'),
    categoryIds: z.array(z.number().int()).min(1, 'Choisissez au moins une catégorie.'),
    budget: z
      .string()
      .trim()
      .regex(/^\d{0,9}$/, 'Indiquez un montant en chiffres, sans espace ni centimes.')
      .optional(),
    dateMode: z.enum(['asap', 'precise', 'flexible']),
    desiredDate: z.string().optional(),
  })
  .refine((v) => v.dateMode !== 'precise' || Boolean(v.desiredDate), { path: ['desiredDate'], message: 'Choisissez une date.' });

export type ListingFormValues = z.input<typeof listingSchema>;
export type ListingValues = z.output<typeof listingSchema>;

export const proposalSchema = z.object({
  message: z.string().trim().min(1, 'Écrivez un message au client.').max(2000, '2 000 caractères maximum.'),
  price: z.string().trim().regex(/^\d{0,9}$/, 'Montant en chiffres uniquement (F CFP).').optional(),
});
export type ProposalValues = z.infer<typeof proposalSchema>;
