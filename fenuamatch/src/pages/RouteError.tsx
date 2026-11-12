import { isRouteErrorResponse, useRouteError } from 'react-router';
import { Logo } from '@/components/ui/Logo';
import { ButtonLink, Button } from '@/components/ui/Button';

export function RouteError() {
  const error = useRouteError();
  const chunkError = error instanceof Error && /dynamically imported module|Importing a module script failed|Failed to fetch/i.test(error.message);
  const notFound = isRouteErrorResponse(error) && error.status === 404;
  return (
    <div className="mx-auto max-w-lg px-4 py-16 text-center">
      <Logo className="justify-center" />
      <h1 className="mt-8 text-2xl font-bold">{notFound ? 'Page introuvable' : 'Un problème est survenu'}</h1>
      <p className="mt-3 text-muted">
        {chunkError
          ? 'Une nouvelle version de FenuaMatch est disponible ou la connexion a été interrompue. Rechargez la page.'
          : 'Désolé, cette page n\'a pas pu s\'afficher. Vous pouvez recharger la page ou revenir à l\'accueil.'}
      </p>
      <div className="mt-6 flex justify-center gap-3">
        <Button variant="secondary" onClick={() => window.location.reload()}>Recharger</Button>
        <ButtonLink to="/">Accueil</ButtonLink>
      </div>
    </div>
  );
}
