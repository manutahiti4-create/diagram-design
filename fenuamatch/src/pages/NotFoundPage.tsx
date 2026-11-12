import { ButtonLink } from '@/components/ui/Button';
import { EmptyState } from '@/components/ui/States';
import { MapPinOff } from 'lucide-react';

export default function NotFoundPage() {
  return (
    <div className="py-10">
      <EmptyState
        icon={<MapPinOff className="size-7" aria-hidden />}
        title="Page introuvable (erreur 404)"
        message="Cette page n'existe pas ou a été déplacée."
        action={<ButtonLink to="/">Retour à l'accueil</ButtonLink>}
      />
    </div>
  );
}
