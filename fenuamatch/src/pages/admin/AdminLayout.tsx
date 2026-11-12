import { NavLink, Outlet } from 'react-router';
import { cn } from '@/components/ui/cn';

const TABS = [
  { to: '/admin', label: 'Vue d\'ensemble', end: true },
  { to: '/admin/signalements', label: 'Signalements' },
  { to: '/admin/comptes', label: 'Comptes' },
  { to: '/admin/annonces', label: 'Annonces' },
  { to: '/admin/metiers', label: 'Catégories et métiers' },
  { to: '/admin/journal', label: 'Journal' },
];

export default function AdminLayout() {
  return (
    <div>
      <h1 className="mb-3 text-2xl font-bold">Administration</h1>
      <nav aria-label="Administration" className="-mx-4 mb-5 overflow-x-auto px-4">
        <ul className="flex gap-1 rounded-xl bg-white p-1 ring-1 ring-line">
          {TABS.map((t) => (
            <li key={t.to}>
              <NavLink to={t.to} end={t.end}
                className={({ isActive }) => cn('block min-h-10 rounded-lg px-3 py-2 text-sm font-semibold whitespace-nowrap', isActive ? 'bg-navy text-white' : 'text-navy hover:bg-surface')}>
                {t.label}
              </NavLink>
            </li>
          ))}
        </ul>
      </nav>
      <Outlet />
    </div>
  );
}
