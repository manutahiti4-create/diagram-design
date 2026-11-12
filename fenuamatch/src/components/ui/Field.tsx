import { forwardRef, useId, type InputHTMLAttributes, type ReactNode, type SelectHTMLAttributes, type TextareaHTMLAttributes } from 'react';
import { cn } from './cn';

const control =
  'block w-full rounded-xl border bg-white px-4 text-base text-ink placeholder:text-muted/70 transition-colors focus:border-brand focus:outline-none focus:ring-3 focus:ring-brand/25 disabled:bg-surface disabled:text-muted';

interface FieldProps {
  label: ReactNode;
  error?: string;
  hint?: ReactNode;
  required?: boolean;
  optional?: boolean;
  children: (props: { id: string; 'aria-invalid'?: boolean; 'aria-describedby'?: string }) => ReactNode;
  className?: string;
}

/** Libellé + champ + aide + message d'erreur relié au champ (accessibilité). */
export function Field({ label, error, hint, required, optional, children, className }: FieldProps) {
  const id = useId();
  const hintId = `${id}-hint`;
  const errorId = `${id}-error`;
  const describedBy = [hint ? hintId : null, error ? errorId : null].filter(Boolean).join(' ') || undefined;
  return (
    <div className={cn('space-y-1.5', className)}>
      <label htmlFor={id} className="block text-sm font-semibold text-navy">
        {label}
        {required && <span className="text-danger" aria-hidden> *</span>}
        {optional && <span className="font-normal text-muted"> (facultatif)</span>}
      </label>
      {children({ id, 'aria-invalid': error ? true : undefined, 'aria-describedby': describedBy })}
      {hint && !error && <p id={hintId} className="text-sm text-muted">{hint}</p>}
      {error && <p id={errorId} className="text-sm font-medium text-danger" role="alert">{error}</p>}
    </div>
  );
}

export const Input = forwardRef<HTMLInputElement, InputHTMLAttributes<HTMLInputElement>>(function Input({ className, ...rest }, ref) {
  return <input ref={ref} className={cn(control, 'min-h-12', rest['aria-invalid'] ? 'border-danger' : 'border-line', className)} {...rest} />;
});

export const Textarea = forwardRef<HTMLTextAreaElement, TextareaHTMLAttributes<HTMLTextAreaElement>>(function Textarea({ className, rows = 5, ...rest }, ref) {
  return <textarea ref={ref} rows={rows} className={cn(control, 'py-3 leading-relaxed', rest['aria-invalid'] ? 'border-danger' : 'border-line', className)} {...rest} />;
});

export const Select = forwardRef<HTMLSelectElement, SelectHTMLAttributes<HTMLSelectElement>>(function Select({ className, children, ...rest }, ref) {
  return (
    <select ref={ref} className={cn(control, 'min-h-12 appearance-none bg-[url("data:image/svg+xml,%3Csvg xmlns=%27http://www.w3.org/2000/svg%27 width=%2720%27 height=%2720%27 fill=%27none%27 stroke=%27%230F2A5A%27 stroke-width=%272%27%3E%3Cpath d=%27m5 8 5 5 5-5%27/%3E%3C/svg%3E")] bg-[position:right_0.75rem_center] bg-no-repeat pr-10', rest['aria-invalid'] ? 'border-danger' : 'border-line', className)} {...rest}>
      {children}
    </select>
  );
});

interface CheckboxProps extends InputHTMLAttributes<HTMLInputElement> {
  label: ReactNode;
  error?: string;
}

export const Checkbox = forwardRef<HTMLInputElement, CheckboxProps>(function Checkbox({ label, error, className, ...rest }, ref) {
  const id = useId();
  return (
    <div className={className}>
      <label htmlFor={id} className="flex cursor-pointer items-start gap-3 text-base">
        <input ref={ref} id={id} type="checkbox" className="mt-0.5 size-5 shrink-0 accent-[#00796f]" aria-invalid={error ? true : undefined}
          aria-describedby={error ? `${id}-error` : undefined} {...rest} />
        <span>{label}</span>
      </label>
      {error && <p id={`${id}-error`} className="mt-1 text-sm font-medium text-danger" role="alert">{error}</p>}
    </div>
  );
});
