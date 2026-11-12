import { lazy, type ReactNode } from 'react';
import { createBrowserRouter, RouterProvider } from 'react-router';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { AuthProvider } from '@/auth/AuthProvider';
import { GuestOnly, RequireAdmin, RequireAuth } from '@/auth/guards';
import { AppShell } from '@/components/layout/AppShell';
import { ToastProvider } from '@/components/ui/Toast';
import { RouteError } from '@/pages/RouteError';
import { env } from '@/config/env';
import { SetupRequired } from '@/pages/SetupRequired';
import HomePage from '@/pages/HomePage';

const LoginPage = lazy(() => import('@/pages/auth/LoginPage'));
const SignupPage = lazy(() => import('@/pages/auth/SignupPage'));
const CheckEmailPage = lazy(() => import('@/pages/auth/CheckEmailPage'));
const ConfirmPage = lazy(() => import('@/pages/auth/ConfirmPage'));
const ForgotPasswordPage = lazy(() => import('@/pages/auth/ForgotPasswordPage'));
const ResetPasswordPage = lazy(() => import('@/pages/auth/ResetPasswordPage'));
const SearchPage = lazy(() => import('@/pages/search/SearchPage'));
const ProviderPage = lazy(() => import('@/pages/providers/ProviderPage'));
const ProviderEditPage = lazy(() => import('@/pages/providers/ProviderEditPage'));
const ListingsPage = lazy(() => import('@/pages/listings/ListingsPage'));
const ListingDetailPage = lazy(() => import('@/pages/listings/ListingDetailPage'));
const ListingFormPage = lazy(() => import('@/pages/listings/ListingFormPage'));
const MyListingsPage = lazy(() => import('@/pages/listings/MyListingsPage'));
const MyProposalsPage = lazy(() => import('@/pages/listings/MyProposalsPage'));
const MessagesPage = lazy(() => import('@/pages/messages/MessagesPage'));
const ConversationPage = lazy(() => import('@/pages/messages/ConversationPage'));
const DashboardPage = lazy(() => import('@/pages/dashboard/DashboardPage'));
const NotificationsPage = lazy(() => import('@/pages/dashboard/NotificationsPage'));
const SettingsPage = lazy(() => import('@/pages/settings/SettingsPage'));
const ModerationPage = lazy(() => import('@/pages/settings/ModerationPage'));
const DeleteAccountPage = lazy(() => import('@/pages/settings/DeleteAccountPage'));
const AdminLayout = lazy(() => import('@/pages/admin/AdminLayout'));
const AdminDashboard = lazy(() => import('@/pages/admin/AdminDashboard'));
const AdminUsers = lazy(() => import('@/pages/admin/AdminUsers'));
const AdminListings = lazy(() => import('@/pages/admin/AdminListings'));
const AdminReports = lazy(() => import('@/pages/admin/AdminReports'));
const AdminCategories = lazy(() => import('@/pages/admin/AdminCategories'));
const AdminAudit = lazy(() => import('@/pages/admin/AdminAudit'));
const LegalPage = lazy(() => import('@/pages/legal/LegalPage'));
const NotFoundPage = lazy(() => import('@/pages/NotFoundPage'));

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 30_000,
      retry: (count, error) => count < 2 && !/JWT|permission|42501|PGRST/.test(String((error as { message?: string })?.message)),
      refetchOnWindowFocus: true,
    },
  },
});

const auth = (el: ReactNode, accountType?: 'client' | 'provider') => <RequireAuth accountType={accountType}>{el}</RequireAuth>;

const router = createBrowserRouter([
  {
    element: <AppShell />,
    errorElement: <RouteError />,
    children: [
      { index: true, element: <HomePage /> },
      { path: 'connexion', element: <GuestOnly><LoginPage /></GuestOnly> },
      { path: 'inscription', element: <GuestOnly><SignupPage /></GuestOnly> },
      { path: 'verifier-email', element: <CheckEmailPage /> },
      { path: 'auth/confirmer', element: <ConfirmPage /> },
      { path: 'mot-de-passe-oublie', element: <ForgotPasswordPage /> },
      { path: 'nouveau-mot-de-passe', element: <ResetPasswordPage /> },

      { path: 'rechercher', element: auth(<SearchPage />) },
      { path: 'prestataires/:id', element: auth(<ProviderPage />) },
      { path: 'ma-fiche', element: auth(<ProviderEditPage />, 'provider') },

      { path: 'annonces', element: auth(<ListingsPage />) },
      { path: 'annonces/nouvelle', element: auth(<ListingFormPage />, 'client') },
      { path: 'annonces/:id', element: auth(<ListingDetailPage />) },
      { path: 'annonces/:id/modifier', element: auth(<ListingFormPage />, 'client') },
      { path: 'mes-annonces', element: auth(<MyListingsPage />, 'client') },
      { path: 'mes-propositions', element: auth(<MyProposalsPage />, 'provider') },

      { path: 'messages', element: auth(<MessagesPage />) },
      { path: 'messages/:id', element: auth(<ConversationPage />) },

      { path: 'tableau-de-bord', element: auth(<DashboardPage />) },
      { path: 'notifications', element: auth(<NotificationsPage />) },
      { path: 'parametres', element: auth(<SettingsPage />) },
      { path: 'parametres/moderation', element: auth(<ModerationPage />) },
      { path: 'parametres/suppression', element: auth(<DeleteAccountPage />) },

      {
        path: 'admin',
        element: auth(<RequireAdmin><AdminLayout /></RequireAdmin>),
        children: [
          { index: true, element: <AdminDashboard /> },
          { path: 'comptes', element: <AdminUsers /> },
          { path: 'annonces', element: <AdminListings /> },
          { path: 'signalements', element: <AdminReports /> },
          { path: 'metiers', element: <AdminCategories /> },
          { path: 'journal', element: <AdminAudit /> },
        ],
      },

      { path: 'cgu', element: <LegalPage doc="cgu" /> },
      { path: 'confidentialite', element: <LegalPage doc="privacy" /> },
      { path: 'mentions-legales', element: <LegalPage doc="mentions" /> },
      { path: 'contact', element: <LegalPage doc="contact" /> },
      { path: '*', element: <NotFoundPage /> },
    ],
  },
]);

export function App() {
  if (!env.isConfigured) return <SetupRequired />;
  return (
    <QueryClientProvider client={queryClient}>
      <ToastProvider>
        <AuthProvider>
          <RouterProvider router={router} />
        </AuthProvider>
      </ToastProvider>
    </QueryClientProvider>
  );
}
