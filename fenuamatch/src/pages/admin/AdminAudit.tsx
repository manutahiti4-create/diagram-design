import { Card } from '@/components/ui/Card';
import { PageLoader } from '@/components/ui/Spinner';
import { EmptyState, ErrorState } from '@/components/ui/States';
import { formatDateTime } from '@/lib/format';
import { useAuditLog } from '@/services/moderation';

export default function AdminAudit() {
  const q = useAuditLog();
  if (q.isPending) return <PageLoader />;
  if (q.isError) return <ErrorState error={q.error} />;
  if (!q.data.length) return <EmptyState title="Journal vide" />;
  return (
    <Card className="overflow-x-auto">
      <table className="w-full min-w-[640px] text-left text-sm">
        <thead className="bg-surface text-navy">
          <tr><th className="px-3 py-2">Date</th><th className="px-3 py-2">Action</th><th className="px-3 py-2">Élément</th><th className="px-3 py-2">Auteur</th><th className="px-3 py-2">Justification</th></tr>
        </thead>
        <tbody className="divide-y divide-line">
          {q.data.map((e) => (
            <tr key={e.id}>
              <td className="px-3 py-2 whitespace-nowrap">{formatDateTime(e.created_at)}</td>
              <td className="px-3 py-2 font-medium">{e.action}</td>
              <td className="px-3 py-2 text-muted">{e.target_type} {e.target_id?.slice(0, 8)}</td>
              <td className="px-3 py-2 text-muted">{e.admin_id ? e.admin_id.slice(0, 8) : 'système'}</td>
              <td className="px-3 py-2">{e.reason}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </Card>
  );
}
