import { z } from 'zod';

export const usernameSchema = z
  .string()
  .trim()
  .toLowerCase()
  .min(3, 'Au moins 3 caractères.')
  .max(24, '24 caractères maximum.')
  .regex(/^[a-z0-9][a-z0-9_.-]*$/, 'Lettres minuscules, chiffres, point, tiret ou tiret bas uniquement (pas d\'espace ni d\'accent).');

export const passwordSchema = z
  .string()
  .min(8, 'Au moins 8 caractères.')
  .max(72, '72 caractères maximum.')
  .regex(/[A-Za-z]/, 'Ajoutez au moins une lettre.')
  .regex(/[0-9]/, 'Ajoutez au moins un chiffre.');

export const emailSchema = z.string().trim().toLowerCase().email('Adresse e-mail invalide.');

export const signupSchema = z
  .object({
    email: emailSchema,
    username: usernameSchema,
    password: passwordSchema,
    passwordConfirm: z.string(),
    accountType: z.enum(['client', 'provider'], { message: 'Choisissez un type de compte.' }),
    adult: z.boolean().refine((v) => v, 'Vous devez avoir 18 ans ou plus pour vous inscrire.'),
    terms: z.boolean().refine((v) => v, 'Vous devez accepter les conditions d\'utilisation.'),
  })
  .refine((v) => v.password === v.passwordConfirm, { path: ['passwordConfirm'], message: 'Les mots de passe ne correspondent pas.' });

export type SignupValues = z.infer<typeof signupSchema>;

export const loginSchema = z.object({
  email: emailSchema,
  password: z.string().min(1, 'Saisissez votre mot de passe.'),
});
export type LoginValues = z.infer<typeof loginSchema>;

export const newPasswordSchema = z
  .object({ password: passwordSchema, passwordConfirm: z.string() })
  .refine((v) => v.password === v.passwordConfirm, { path: ['passwordConfirm'], message: 'Les mots de passe ne correspondent pas.' });
export type NewPasswordValues = z.infer<typeof newPasswordSchema>;
