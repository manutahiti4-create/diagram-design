import { useState } from 'react';
import { UserRound } from 'lucide-react';
import { cn } from './cn';

const sizes = { sm: 'size-9', md: 'size-12', lg: 'size-16', xl: 'size-24' } as const;

export function Avatar({ src, name, size = 'md', className }: { src?: string | null; name?: string | null; size?: keyof typeof sizes; className?: string }) {
  const [failed, setFailed] = useState(false);
  const initial = (name ?? '').trim().charAt(0).toUpperCase();
  if (src && !failed) {
    return (
      <img src={src} alt={name ? `Photo de ${name}` : ''} loading="lazy" decoding="async" onError={() => setFailed(true)}
        className={cn(sizes[size], 'shrink-0 rounded-full bg-surface object-cover ring-1 ring-line', className)} />
    );
  }
  return (
    <span className={cn(sizes[size], 'flex shrink-0 items-center justify-center rounded-full bg-brand-50 font-display font-semibold text-brand-strong ring-1 ring-line', className)} aria-hidden>
      {initial || <UserRound className="size-1/2" />}
    </span>
  );
}
