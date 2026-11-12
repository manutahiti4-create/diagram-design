import type { ReactNode } from 'react';
import { Logo } from '@/components/ui/Logo';
import { Card } from '@/components/ui/Card';

export function AuthCard({ title, subtitle, children, footer }: { title: string; subtitle?: ReactNode; children: ReactNode; footer?: ReactNode }) {
  return (
    <div className="mx-auto max-w-md py-4 sm:py-8">
      <div className="mb-6 flex justify-center"><Logo withSlogan /></div>
      <Card className="p-5 sm:p-7">
        <h1 className="text-2xl font-bold">{title}</h1>
        {subtitle && <p className="mt-1 text-muted">{subtitle}</p>}
        <div className="mt-6">{children}</div>
      </Card>
      {footer && <div className="mt-5 text-center text-sm">{footer}</div>}
    </div>
  );
}

const KEY = 'fm:after-confirm';
export function rememberRedirect(path: string | null) {
  try {
    if (path) localStorage.setItem(KEY, path);
  } catch { /* stockage indisponible : sans conséquence */ }
}
export function consumeRedirect(): string | null {
  try {
    const v = localStorage.getItem(KEY);
    localStorage.removeItem(KEY);
    return v;
  } catch {
    return null;
  }
}
