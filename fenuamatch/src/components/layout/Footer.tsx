import { Link } from 'react-router';
import { BRAND } from '@/config/brand';
import { cn } from '@/components/ui/cn';

export function Footer({ className }: { className?: string }) {
  return (
    <footer className={cn('border-t border-line bg-white', className)}>
      <div className="mx-auto flex max-w-6xl flex-col gap-3 px-4 py-6 text-sm text-muted sm:flex-row sm:items-center sm:justify-between">
        <p>© {new Date().getFullYear()} {BRAND.name} — {BRAND.slogan}</p>
        <nav aria-label="Informations légales" className="flex flex-wrap gap-x-4 gap-y-2">
          <Link to="/cgu" className="hover:text-navy hover:underline">Conditions d'utilisation</Link>
          <Link to="/confidentialite" className="hover:text-navy hover:underline">Confidentialité</Link>
          <Link to="/mentions-legales" className="hover:text-navy hover:underline">Mentions légales</Link>
          <Link to="/contact" className="hover:text-navy hover:underline">Contact et signalement</Link>
        </nav>
      </div>
    </footer>
  );
}
