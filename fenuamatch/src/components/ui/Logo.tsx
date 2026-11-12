import logoMark from '@/assets/logo-mark.svg';
import { BRAND } from '@/config/brand';
import { cn } from './cn';

export function LogoMark({ className }: { className?: string }) {
  return <img src={logoMark} alt="" aria-hidden className={cn('size-9', className)} width={36} height={36} />;
}

export function Logo({ className, withSlogan }: { className?: string; withSlogan?: boolean }) {
  return (
    <span className={cn('inline-flex items-center gap-2', className)}>
      <LogoMark />
      <span className="leading-none">
        <span className="font-display text-lg font-bold tracking-tight text-navy sm:text-xl">
          Fenua<span className="text-brand-strong">Match</span>
        </span>
        {withSlogan && <span className="mt-1 block text-xs text-muted">{BRAND.slogan}</span>}
      </span>
    </span>
  );
}
