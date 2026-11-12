import { useState, type FormEvent } from 'react';
import { Link } from 'react-router';
import { useQueryClient } from '@tanstack/react-query';
import { Badge, Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Field';
import { PageLoader } from '@/components/ui/Spinner';
import { EmptyState, ErrorState } from '@/components/ui/States';
import { useToast } from '@/components/ui/Toast';
import { errorMessage } from '@/lib/errors';
import { formatDate } from '@/lib/format';
import { adminSetHidden, adminSetUserStatus, useAdminUsers } from '@/services/moderation';
import type { AdminUserRow } from '@/types/models';
import { ReasonDialog } from './ReasonDialog';

type Pending = { kind: 'suspend' | 'reactivate' | 'hide' | 'unhide'; user: AdminUserRow };

export default function AdminUsers() {
  const [search, setSearch] = useState('');
  const [applied, setApplied] = useState('');
  const [page, setPage] = useState(0);
  const q = useAdminUsers(applied, page);
  const qc = useQueryClient();
  const toast = useToast();
  const [pending, setPending] = useState<Pending | null>(null);
  const total = q.data?.[0]?.total_count ?? 0;

  function submit(e: FormEvent) {
    e.preventDefault();
    setPage(0);
    setApplied(search.trim());
  }

  async function execute(reason: string) {
    if (!pending) return;
    try {
      const { kind, user } = pending;
      if (kind === 'suspend' || kind === 'reactivate') await adminSetUserStatus(user.id, kind === 'suspend' ? 'suspended' : 'active', reason);
      else await adminSetHidden('profile', user.id, kind === 'hide', reason);
      toast.show('Action effectuée et journalisée.');
      setPending(null);
      await qc.invalidateQueries({ queryKey: ['admin'] });
    } catch (e) {
      toast.show(errorMessage(e), 'error');
    }
  }

  return (
    <div>
      <form onSubmit={submit} className="mb-4 flex gap-2">
        <label htmlFor="admin-search" className="sr-only">Rechercher un compte</label>
        <Input id="admin-search" type="search" placeholder="Nom d'utilisateur ou nom public" value={search} onChange={(e) => setSearch(e.target.value)} />
        <Button type="submit" variant="navy">Chercher</Button>
      </form>
      {q.isPending ? <PageLoader /> : q.isError ? <ErrorState error={q.error} /> : !q.data?.length ? <EmptyState title="Aucun compte" /> : (
        <>
          <p className="mb-2 text-sm text-muted">{total} compte(s)</p>
          <ul className="space-y-2">
            {q.data.map((u) => (
              <li key={u.id}>
                <Card className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center">
                  <div className="min-w-0 flex-1">
                    <p className="font-semibold text-navy">
                      {u.account_type === 'provider' && u.provider_name ? <Link to={`/prestataires/${u.id}`} className="hover:underline">{u.provider_name}</Link> : u.username}
                      <span className="ml-2 text-sm font-normal text-muted">@{u.username}</span>
                    </p>
                    <div className="mt-1 flex flex-wrap gap-1.5">
                      <Badge tone="brand">{u.account_type === 'provider' ? 'Prestataire' : 'Client'}</Badge>
                      {u.is_admin && <Badge tone="navy">Admin</Badge>}
                      {u.status === 'suspended' && <Badge tone="danger">Suspendu</Badge>}
                      {u.is_hidden && <Badge tone="warning">Profil masqué</Badge>}
                      {u.is_demo && <Badge tone="warning">Démo</Badge>}
                      {Number(u.open_reports) > 0 && <Badge tone="danger">{u.open_reports} signalement(s)</Badge>}
                    </div>
                    <p className="mt-1 text-xs text-muted">Inscrit le {formatDate(u.created_at)} · dernière activité le {formatDate(u.last_active_at)}</p>
                  </div>
                  {!u.is_admin && (
                    <div className="flex flex-wrap gap-2">
                      <Button size="sm" variant="secondary" onClick={() => setPending({ kind: u.is_hidden ? 'unhide' : 'hide', user: u })}>
                        {u.is_hidden ? 'Rétablir le profil' : 'Masquer le profil'}
                      </Button>
                      <Button size="sm" variant={u.status === 'suspended' ? 'secondary' : 'danger'}
                        onClick={() => setPending({ kind: u.status === 'suspended' ? 'reactivate' : 'suspend', user: u })}>
                        {u.status === 'suspended' ? 'Réactiver' : 'Suspendre'}
                      </Button>
                    </div>
                  )}
                </Card>
              </li>
            ))}
          </ul>
          <div className="mt-4 flex justify-between">
            <Button variant="secondary" size="sm" disabled={page === 0} onClick={() => setPage((p) => p - 1)}>Précédent</Button>
            <Button variant="secondary" size="sm" disabled={(page + 1) * 25 >= total} onClick={() => setPage((p) => p + 1)}>Suivant</Button>
          </div>
        </>
      )}
      <ReasonDialog open={Boolean(pending)} onClose={() => setPending(null)} onConfirm={execute}
        danger={pending?.kind === 'suspend' || pending?.kind === 'hide'}
        title={{ suspend: 'Suspendre ce compte ?', reactivate: 'Réactiver ce compte ?', hide: 'Masquer ce profil ?', unhide: 'Rétablir ce profil ?' }[pending?.kind ?? 'hide']}
        message={pending?.kind === 'suspend' ? `Le compte @${pending.user.username} ne pourra plus se connecter et ses contenus ne seront plus visibles.` : `Compte @${pending?.user.username ?? ''}.`}
        confirmLabel="Confirmer" />
    </div>
  );
}
