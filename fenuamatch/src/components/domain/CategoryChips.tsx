import { Check } from 'lucide-react';
import { cn } from '@/components/ui/cn';

interface Item { id: number; name: string }

/** Sélection multiple sous forme de pastilles faciles à toucher. */
export function ChipMultiSelect({ items, value, onChange, label, error }: {
  items: Item[]; value: number[]; onChange: (ids: number[]) => void; label: string; error?: string;
}) {
  const toggle = (id: number) => onChange(value.includes(id) ? value.filter((v) => v !== id) : [...value, id]);
  return (
    <fieldset aria-describedby={error ? 'chips-error' : undefined}>
      <legend className="mb-1.5 text-sm font-semibold text-navy">{label}<span className="text-danger" aria-hidden> *</span></legend>
      <div className="flex flex-wrap gap-2">
        {items.map((item) => {
          const active = value.includes(item.id);
          return (
            <button key={item.id} type="button" onClick={() => toggle(item.id)} aria-pressed={active}
              className={cn('inline-flex min-h-10 items-center gap-1.5 rounded-full border px-3.5 text-sm font-medium transition-colors',
                active ? 'border-brand-strong bg-brand-50 text-brand-strong' : 'border-line bg-white text-ink hover:border-navy/30')}>
              {active && <Check className="size-4" aria-hidden />}
              {item.name}
            </button>
          );
        })}
      </div>
      {error && <p id="chips-error" className="mt-1.5 text-sm font-medium text-danger" role="alert">{error}</p>}
    </fieldset>
  );
}
