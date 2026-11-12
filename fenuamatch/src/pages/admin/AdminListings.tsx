import { useState } from 'react';
import { Link } from 'react-router';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Badge, Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Select } from '@/components/ui/Field';
import { PageLoader } from '@/components/ui/Spinner';
import { EmptyState, ErrorState } from '@/components/ui/States';
import { useToast } from '@/components/ui/Toast';
import { ListingStatusBadge } from '@/components/domain/StatusBadges';
import { errorMessage } from '@/lib/errors';
import { formatDate } from '@/lib/format';
import { LISTING_STATUS_LABELS } from '@/lib/labels';
import { supabase } from '@/lib/supabase';
import { adminSetHidden } from '@/services/moderation';
import type { Listing, ListingStatus } from '@/types/models';
import { ReasonDialog } from './ReasonDialog';

type Row = Listing & { client: { username: string } | null };

export default function AdminListings() {
  const [status, setStatus] = useState<'' | ListingStatus | 'hidden'>('');
  const [page, setPage] = useState(0);
  const qc = useQueryClient();
  const toast = useToast();
  const [pending, setPending] = useState<Row | null>(null);
  const q = useQuery({
    queryKey: ['admin', 'listings', status, page],
    queryFn: async () => {
      let query = supabase.from('listings').select('*, client:profiles!listings_client_id_fkey(username)', { count: 'exact' })
        .order('created_at', { ascending: false }).range(page * 25, page * 25 + 24);
      if (status === 'hidden') query = query.eq('is_hidden', true);
      else if (status) query = query.eq('status', status);
      const { data, error, count } = await query;
      if (error) throw error;
      return { rows: (data ?? []) as unknown as Row[], count: count ?? 0 };
    },
  });

  async function execute(reason: string) {
    if (!pending) return;
    try {
      await adminSetHidden('listing', pending.id, !pending.is_hidden, reason);
      toast.show(pending.is_hidden ? 'Annonce rétablie.' : 'Annonce masquée.');
      setPending(null);
      await qc.invalidateQueries({ queryKey: ['admin'] });
    } catch (e) {
      toast.show(errorMessage(e), 'error');
    }
  }

  return (
    <div>
      <div className="mb-4 max-w-xs">
        <label htmlFor="status" className="mb-1 block text-sm font-semibold text-navy">Statut</label>
        <Select id="status" value={status} onChange={(e) => { setPage(0); setStatus(e.target.value as typeof status); }}>
          <option value="">Tous</option>
          <option value="hidden">Masquées par modération</option>
          {(Object.keys(LISTING_STATUS_LABELS) as ListingStatus[]).map((s) => <option key={s} value={s}>{LISTING_STATUS_LABELS[s]}</option>)}
        </Select>
      </div>
      {q.isPending ? <PageLoader /> : q.isError ? <ErrorState error={q.error} /> : !q.data.rows.length ? <EmptyState title="Aucune annonce" /> : (
        <>
          <ul className="space-y-2">
            {q.data.rows.map((l) => (
              <li key={l.id}>
                <Card className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center">
                  <div className="min-w-0 flex-1">
                    <Link to={`/annonces/${l.id}`} className="font-semibold text-navy hover:underline">{l.title}</Link>
                    <div className="mt-1 flex flex-wrap gap-1.5">
                      <ListingStatusBadge listing={{ ...l, is_hidden: false }} />
                      {l.is_hidden && <Badge tone="warning">Masquée ({l.hidden_reason === 'auto_reports' ? 'signalements' : 'modération'})</Badge>}
                      {l.is_demo && <Badge tone="warning">Démo</Badge>}
                    </div>
                    <p className="mt-1 text-xs text-muted">@{l.client?.username ?? '—'} · créée le {formatDate(l.created_at)}</p>
                  </div>
                  <Button size="sm" variant={l.is_hidden ? 'secondary' : 'danger'} onClick={() => setPending(l)}>{l.is_hidden ? 'Restaurer' : 'Masquer'}</Button>
                </Card>
              </li>
            ))}
          </ul>
          <div className="mt-4 flex justify-between">
            <Button variant="secondary" size="sm" disabled={page === 0} onClick={() => setPage((p) => p - 1)}>Précédent</Button>
            <Button variant="secondary" size="sm" disabled={(page + 1) * 25 >= q.data.count} onClick={() => setPage((p) => p + 1)}>Suivant</Button>
          </div>
        </>
      )}
      <ReasonDialog open={Boolean(pending)} onClose={() => setPending(null)} onConfirm={execute} danger={!pending?.is_hidden}
        title={pending?.is_hidden ? 'Restaurer cette annonce ?' : 'Masquer cette annonce ?'}
        message={pending?.is_hidden ? 'Elle sera de nouveau visible.' : 'Elle ne sera plus visible des autres membres. Le propriétaire sera prévenu et pourra contester.'}
        confirmLabel={pending?.is_hidden ? 'Restaurer' : 'Masquer'} />
    </div>
  );
}
