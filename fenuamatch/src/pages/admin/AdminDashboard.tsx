import { Link } from 'react-router';
import { Card } from '@/components/ui/Card';
import { PageLoader } from '@/components/ui/Spinner';
import { ErrorState } from '@/components/ui/States';
import { useAdminStats } from '@/services/moderation';

export default function AdminDashboard() {
  const q = useAdminStats();
  if (q.isPending) return <PageLoader />;
  if (q.isError) return <ErrorState error={q.error} onRetry={() => void q.refetch()} />;
  const s = q.data;
  const items: Array<[string, number, string?]> = [
    ['Comptes', s.accounts, '/admin/comptes'],
    ['Clients', s.clients],
    ['Prestataires', s.providers],
    ['Fiches publiées', s.published_providers],
    ['Annonces publiées (total)', s.listings, '/admin/annonces'],
    ['Annonces actives', s.active_listings],
    ['Missions confirmées', s.confirmed_missions],
    ['Signalements en attente', s.open_reports, '/admin/signalements'],
    ['Contestations en attente', s.open_appeals, '/admin/signalements'],
    ['Comptes suspendus', s.suspended_accounts],
  ];
  return (
    <div>
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
        {items.map(([label, value, to]) => {
          const inner = <><span className="font-display text-3xl font-bold text-navy">{value}</span><span className="text-sm text-muted">{label}</span></>;
          return (
            <Card key={label} className="p-4">
              {to ? <Link to={to} className="flex flex-col hover:underline">{inner}</Link> : <div className="flex flex-col">{inner}</div>}
            </Card>
          );
        })}
      </div>
      <p className="mt-4 text-sm text-muted">Chiffres calculés en direct depuis la base de données. Les indicateurs commerciaux (Premium, mises en avant) arriveront avec la V2.</p>
    </div>
  );
}
