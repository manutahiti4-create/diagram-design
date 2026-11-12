import { useState, type FormEvent } from 'react';
import { useNavigate } from 'react-router';
import { Search } from 'lucide-react';
import { cn } from '@/components/ui/cn';

export function SearchBar({ initial = '', className, large }: { initial?: string; className?: string; large?: boolean }) {
  const [value, setValue] = useState(initial);
  const navigate = useNavigate();
  function submit(e: FormEvent) {
    e.preventDefault();
    const q = value.trim();
    navigate(q ? `/rechercher?q=${encodeURIComponent(q)}` : '/rechercher');
  }
  return (
    <form role="search" onSubmit={submit} className={cn('flex w-full gap-2', className)}>
      <label htmlFor="recherche-principale" className="sr-only">Rechercher un métier ou un prestataire</label>
      <div className="relative flex-1">
        <Search className="pointer-events-none absolute top-1/2 left-4 size-5 -translate-y-1/2 text-muted" aria-hidden />
        <input id="recherche-principale" type="search" inputMode="search" enterKeyHint="search" autoComplete="off"
          value={value} onChange={(e) => setValue(e.target.value)} placeholder="Plombier, électricien, jardinier…"
          className={cn('w-full rounded-2xl border border-line bg-white pr-4 pl-12 text-base shadow-sm focus:border-brand focus:ring-3 focus:ring-brand/25 focus:outline-none',
            large ? 'min-h-14 text-lg' : 'min-h-12')} />
      </div>
      <button type="submit" className={cn('rounded-2xl bg-navy px-5 font-semibold text-white hover:bg-navy-700', large ? 'min-h-14' : 'min-h-12')}>
        Chercher
      </button>
    </form>
  );
}
