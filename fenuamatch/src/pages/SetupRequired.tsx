import { Logo } from '@/components/ui/Logo';

/** Affiché uniquement si les variables d'environnement Supabase ne sont pas définies. */
export function SetupRequired() {
  return (
    <div className="mx-auto max-w-xl px-4 py-16">
      <Logo />
      <h1 className="mt-8 text-2xl font-bold">Configuration requise</h1>
      <p className="mt-3">
        L'application n'est pas encore reliée à Supabase. Définissez <code>VITE_SUPABASE_URL</code> et{' '}
        <code>VITE_SUPABASE_PUBLISHABLE_KEY</code> (voir le fichier <code>.env.example</code> et le guide <code>docs/DEPLOIEMENT.md</code>).
      </p>
    </div>
  );
}
