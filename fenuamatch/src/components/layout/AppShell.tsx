import { Suspense } from 'react';
import { Link, NavLink, Outlet, ScrollRestoration, useLocation } from 'react-router';
import { Bell, LayoutDashboard, Megaphone, MessageCircle, Search, Settings, ShieldCheck } from 'lucide-react';
import { useAuth } from '@/auth/AuthProvider';
import { Logo } from '@/components/ui/Logo';
import { Avatar } from '@/components/ui/Avatar';
import { ButtonLink } from '@/components/ui/Button';
import { PageLoader } from '@/components/ui/Spinner';
import { cn } from '@/components/ui/cn';
import { publicImageUrl } from '@/lib/storage';
import { useUnreadMessages } from '@/services/messages';
import { useUnreadNotifications } from '@/services/notifications';
import { Footer } from './Footer';

const NAV = [
  { to: '/rechercher', label: 'Rechercher', icon: Search },
  { to: '/annonces', label: 'Annonces', icon: Megaphone },
  { to: '/messages', label: 'Messagerie', icon: MessageCircle },
  { to: '/tableau-de-bord', label: 'Tableau de bord', icon: LayoutDashboard },
] as const;

function CountBadge({ count, className }: { count: number; className?: string }) {
  if (!count) return null;
  return (
    <span className={cn('min-w-5 rounded-full bg-danger px-1.5 text-center text-[11px] leading-5 font-bold text-white', className)}>
      {count > 99 ? '99+' : count}
      <span className="sr-only"> non lus</span>
    </span>
  );
}

export function AppShell() {
  const { user, profile, isAdmin } = useAuth();
  const location = useLocation();
  const unreadMessages = useUnreadMessages(Boolean(user)).data ?? 0;
  const unreadNotifications = useUnreadNotifications(user?.id).data ?? 0;
  const inConversation = /^\/messages\/.+/.test(location.pathname);

  return (
    <div className="flex min-h-dvh flex-col">
      <a href="#contenu" className="sr-only focus:not-sr-only focus:fixed focus:top-2 focus:left-2 focus:z-50 focus:rounded-lg focus:bg-white focus:px-4 focus:py-2">
        Aller au contenu
      </a>
      <header className="safe-top sticky top-0 z-30 border-b border-line bg-white/95 backdrop-blur">
        <div className="mx-auto flex h-16 max-w-6xl items-center gap-2 px-4 sm:gap-3">
          <Link to="/" aria-label="FenuaMatch — accueil" className="shrink-0">
            <Logo />
          </Link>

          {user && (
            <nav className="ml-6 hidden items-center gap-1 md:flex" aria-label="Navigation principale">
              {NAV.map(({ to, label, icon: Icon }) => (
                <NavLink key={to} to={to}
                  className={({ isActive }) => cn('relative flex items-center gap-2 rounded-xl px-3 py-2 font-medium',
                    isActive ? 'bg-brand-50 text-brand-strong' : 'text-navy hover:bg-surface')}>
                  <Icon className="size-5" aria-hidden />
                  {label}
                  {to === '/messages' && <CountBadge count={unreadMessages} />}
                </NavLink>
              ))}
            </nav>
          )}

          <div className="ml-auto flex items-center gap-1">
            {user ? (
              <>
                {isAdmin && (
                  <Link to="/admin" className="hidden items-center gap-1 rounded-xl px-3 py-2 text-sm font-semibold text-navy hover:bg-surface sm:flex">
                    <ShieldCheck className="size-5" aria-hidden /> Admin
                  </Link>
                )}
                <Link to="/notifications" className="relative rounded-xl p-2.5 text-navy hover:bg-surface" aria-label={`Notifications${unreadNotifications ? ` (${unreadNotifications} non lues)` : ''}`}>
                  <Bell className="size-6" aria-hidden />
                  <CountBadge count={unreadNotifications} className="absolute -top-0.5 -right-0.5" />
                </Link>
                <Link to="/parametres" className="flex items-center gap-2 rounded-xl p-1.5 hover:bg-surface" aria-label="Mon compte et paramètres">
                  <Avatar src={publicImageUrl('avatars', profile?.avatar_path)} name={profile?.username} size="sm" />
                  <Settings className="hidden size-5 text-navy sm:block" aria-hidden />
                </Link>
              </>
            ) : (
              <>
                <ButtonLink to="/connexion" variant="ghost" size="sm">Connexion</ButtonLink>
                <ButtonLink to="/inscription" variant="primary" size="sm">Inscription</ButtonLink>
              </>
            )}
          </div>
        </div>
      </header>

      <main id="contenu" className={cn('mx-auto w-full max-w-6xl flex-1 px-4 pt-5', user ? 'pb-28 md:pb-12' : 'pb-12')}>
        <Suspense fallback={<PageLoader />}>
          <Outlet />
        </Suspense>
      </main>

      {!inConversation && <Footer className={user ? 'mb-16 md:mb-0' : undefined} />}

      {user && (
        <nav className="safe-bottom fixed inset-x-0 bottom-0 z-30 border-t border-line bg-white md:hidden" aria-label="Navigation principale">
          <ul className="grid grid-cols-4">
            {NAV.map(({ to, label, icon: Icon }) => (
              <li key={to}>
                <NavLink to={to}
                  className={({ isActive }) => cn('relative flex min-h-16 flex-col items-center justify-center gap-1 px-1 text-[11px] font-semibold',
                    isActive ? 'text-brand-strong' : 'text-muted')}>
                  {({ isActive }) => (
                    <>
                      <span className={cn('relative rounded-full px-4 py-1', isActive && 'bg-brand-50')}>
                        <Icon className="size-6" aria-hidden />
                        {to === '/messages' && <CountBadge count={unreadMessages} className="absolute -top-1 right-0" />}
                      </span>
                      <span className="truncate">{label}</span>
                    </>
                  )}
                </NavLink>
              </li>
            ))}
          </ul>
        </nav>
      )}
      <ScrollRestoration />
    </div>
  );
}
