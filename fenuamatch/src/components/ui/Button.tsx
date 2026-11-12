import { forwardRef, type ButtonHTMLAttributes, type ReactNode } from 'react';
import { Link, type LinkProps } from 'react-router';
import { Loader2 } from 'lucide-react';
import { cn } from './cn';

type Variant = 'primary' | 'secondary' | 'navy' | 'ghost' | 'danger' | 'dangerGhost' | 'link';
type Size = 'sm' | 'md' | 'lg';

const base =
  'inline-flex items-center justify-center gap-2 rounded-xl font-semibold transition-colors select-none disabled:cursor-not-allowed disabled:opacity-60 focus-visible:outline-3';
const variants: Record<Variant, string> = {
  primary: 'bg-brand text-navy hover:bg-[#00a596] active:bg-[#009688] shadow-sm',
  navy: 'bg-navy text-white hover:bg-navy-700 shadow-sm',
  secondary: 'bg-white text-navy border border-line hover:border-navy/40 hover:bg-surface',
  ghost: 'bg-transparent text-navy hover:bg-navy/5',
  danger: 'bg-danger text-white hover:bg-[#a91f1f] shadow-sm',
  dangerGhost: 'bg-transparent text-danger hover:bg-danger-50',
  link: 'bg-transparent text-brand-strong underline-offset-4 hover:underline px-0! min-h-0!',
};
const sizes: Record<Size, string> = {
  sm: 'min-h-10 px-3 text-sm',
  md: 'min-h-12 px-4 text-base',
  lg: 'min-h-14 px-6 text-lg',
};

export function buttonClass(variant: Variant = 'primary', size: Size = 'md', extra?: string) {
  return cn(base, variants[variant], sizes[size], extra);
}

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  size?: Size;
  loading?: boolean;
  icon?: ReactNode;
  block?: boolean;
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(function Button(
  { variant = 'primary', size = 'md', loading, icon, block, className, children, disabled, type = 'button', ...rest },
  ref,
) {
  return (
    <button
      ref={ref}
      type={type}
      className={buttonClass(variant, size, cn(block && 'w-full', className))}
      disabled={disabled || loading}
      aria-busy={loading || undefined}
      {...rest}
    >
      {loading ? <Loader2 className="size-5 animate-spin" aria-hidden /> : icon}
      {children}
    </button>
  );
});

interface ButtonLinkProps extends LinkProps {
  variant?: Variant;
  size?: Size;
  icon?: ReactNode;
  block?: boolean;
}

export function ButtonLink({ variant = 'primary', size = 'md', icon, block, className, children, ...rest }: ButtonLinkProps) {
  return (
    <Link className={buttonClass(variant, size, cn(block && 'w-full', className as string))} {...rest}>
      {icon}
      {children}
    </Link>
  );
}
