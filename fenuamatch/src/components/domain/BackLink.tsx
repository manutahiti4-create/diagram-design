import type { ReactNode } from 'react';
import { Link } from 'react-router';
import { ChevronLeft } from 'lucide-react';

export function BackLink({ to, children = 'Retour' }: { to: string; children?: ReactNode }) {
  return (
    <Link to={to} className="mb-3 inline-flex min-h-10 items-center gap-1 text-sm font-semibold text-brand-strong hover:underline">
      <ChevronLeft className="size-4" aria-hidden /> {children}
    </Link>
  );
}
