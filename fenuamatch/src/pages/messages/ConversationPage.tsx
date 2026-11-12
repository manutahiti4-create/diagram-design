import { Fragment, useEffect, useRef, useState, type CSSProperties, type FormEvent, type KeyboardEvent } from 'react';
import { Link, useParams } from 'react-router';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { ChevronLeft, Info, SendHorizontal } from 'lucide-react';
import { useAuth } from '@/auth/AuthProvider';
import { Avatar } from '@/components/ui/Avatar';
import { Button } from '@/components/ui/Button';
import { PageLoader } from '@/components/ui/Spinner';
import { EmptyState, ErrorState } from '@/components/ui/States';
import { useToast } from '@/components/ui/Toast';
import { cn } from '@/components/ui/cn';
import { ReportButton } from '@/components/domain/ReportButton';
import { errorMessage } from '@/lib/errors';
import { formatDate, formatTime, tahitiDayKey } from '@/lib/format';
import { publicImageUrl } from '@/lib/storage';
import { supabase } from '@/lib/supabase';
import { markConversationRead, sendMessage, useConversationRealtime, useConversations, useMessages } from '@/services/messages';
import type { Message } from '@/types/models';

export default function ConversationPage() {
  const { id } = useParams();
  const { user } = useAuth();
  const qc = useQueryClient();
  const toast = useToast();
  const conversations = useConversations();
  const messages = useMessages(id);
  useConversationRealtime(id);
  const [draft, setDraft] = useState('');
  const [sending, setSending] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);
  const conv = conversations.data?.find((c) => c.id === id);

  // Vérifie l'accès même si la liste n'est pas encore chargée (RLS : null si non autorisé).
  const access = useQuery({
    queryKey: ['conversation', id, 'access'],
    enabled: Boolean(id),
    queryFn: async () => {
      const { data, error } = await supabase.from('conversations').select('id').eq('id', id!).maybeSingle();
      if (error) throw error;
      return Boolean(data);
    },
  });

  const ordered: Message[] = [...(messages.data?.pages.flat() ?? [])].reverse();
  const lastId = ordered[ordered.length - 1]?.id;

  useEffect(() => {
    if (!id || !lastId) return;
    bottomRef.current?.scrollIntoView({ block: 'end' });
    void markConversationRead(id).then(() => {
      void qc.invalidateQueries({ queryKey: ['conversations'] });
      void qc.invalidateQueries({ queryKey: ['notifications'] });
    });
  }, [id, lastId, qc]);

  if (access.isPending || messages.isPending) return <PageLoader />;
  if (access.isError) return <ErrorState error={access.error} onRetry={() => void access.refetch()} />;
  if (!access.data) return <EmptyState title="Conversation introuvable" message="Cette conversation n'existe pas ou ne vous concerne pas." />;
  if (messages.isError) return <ErrorState error={messages.error} onRetry={() => void messages.refetch()} />;

  const otherGone = conv ? !conv.other_user_id : false;

  async function submit(e?: FormEvent) {
    e?.preventDefault();
    const body = draft.trim();
    if (!body || !id) return;
    setSending(true);
    try {
      await sendMessage(id, body);
      setDraft('');
      await qc.invalidateQueries({ queryKey: ['messages', id] });
      await qc.invalidateQueries({ queryKey: ['conversations'] });
    } catch (err) {
      toast.show(errorMessage(err), 'error');
    } finally {
      setSending(false);
    }
  }

  function onKeyDown(e: KeyboardEvent<HTMLTextAreaElement>) {
    // Entrée envoie sur ordinateur ; sur mobile, le bouton Envoyer est utilisé.
    if (e.key === 'Enter' && !e.shiftKey && window.matchMedia('(pointer: fine)').matches) {
      e.preventDefault();
      void submit();
    }
  }

  let lastDay = '';
  return (
    <div className="mx-auto flex max-w-3xl flex-col" style={{ minHeight: 'calc(100dvh - 12rem)' }}>
      <div className="sticky top-16 z-10 -mx-4 mb-3 flex items-center gap-3 border-b border-line bg-surface/95 px-4 py-2 backdrop-blur">
        <Link to="/messages" className="-ml-2 rounded-lg p-2 text-navy hover:bg-white" aria-label="Retour aux conversations"><ChevronLeft className="size-6" aria-hidden /></Link>
        <Avatar src={publicImageUrl('avatars', conv?.other_avatar_path)} name={conv?.other_display_name} size="sm" />
        <div className="min-w-0 flex-1">
          {conv?.other_is_provider && conv.other_user_id ? (
            <Link to={`/prestataires/${conv.other_user_id}`} className="block truncate font-semibold text-navy hover:underline">{conv.other_display_name}</Link>
          ) : <p className="truncate font-semibold text-navy">{conv?.other_display_name ?? 'Compte supprimé'}</p>}
          {conv?.listing_id && <Link to={`/annonces/${conv.listing_id}`} className="block truncate text-xs font-medium text-brand-strong hover:underline">{conv.listing_title}</Link>}
        </div>
      </div>

      <div className="flex-1 space-y-2 pb-4" aria-live="polite">
        {messages.hasNextPage && (
          <div className="flex justify-center"><Button variant="ghost" size="sm" loading={messages.isFetchingNextPage} onClick={() => void messages.fetchNextPage()}>Messages précédents</Button></div>
        )}
        {ordered.length === 0 && (
          <p className="flex items-start gap-2 rounded-xl bg-white p-4 text-sm text-muted ring-1 ring-line">
            <Info className="mt-0.5 size-4 shrink-0" aria-hidden />
            Écrivez votre premier message. Pour votre sécurité, ne communiquez votre adresse exacte qu'une fois la mission confirmée.
          </p>
        )}
        {ordered.map((m) => {
          const day = tahitiDayKey(m.created_at);
          const showDay = day !== lastDay;
          lastDay = day;
          const mine = m.sender_id === user?.id;
          return (
            <Fragment key={m.id}>
              {showDay && <p className="py-2 text-center text-xs font-semibold text-muted">{day === tahitiDayKey() ? 'Aujourd\'hui' : formatDate(m.created_at)}</p>}
              {m.kind === 'system' ? (
                <div className="mx-auto max-w-[90%] rounded-xl bg-brand-50 px-4 py-3 text-sm whitespace-pre-line text-ink ring-1 ring-brand/20">
                  {m.body}
                  <span className="mt-1 block text-right text-xs text-muted">{formatTime(m.created_at)}</span>
                </div>
              ) : (
                <div className={cn('group flex items-end gap-1', mine ? 'justify-end' : 'justify-start')}>
                  <div className={cn('max-w-[80%] rounded-2xl px-4 py-2.5 shadow-sm', mine ? 'rounded-br-md bg-navy text-white' : 'rounded-bl-md bg-white text-ink ring-1 ring-line')}>
                    {!mine && <span className="sr-only">{m.sender_id ? conv?.other_display_name : 'Compte supprimé'} : </span>}
                    {m.is_hidden ? <em className="opacity-80">Message masqué en attente d'examen.</em>
                      : <p className="break-words whitespace-pre-line">{m.body}</p>}
                    <span className={cn('mt-1 block text-right text-[11px]', mine ? 'text-white/70' : 'text-muted')}>{formatTime(m.created_at)}</span>
                  </div>
                  {!mine && m.sender_id && !m.is_hidden && <ReportButton targetType="message" targetId={m.id} compact />}
                </div>
              )}
            </Fragment>
          );
        })}
        <div ref={bottomRef} />
      </div>

      {otherGone ? (
        <p className="rounded-xl bg-white p-4 text-center text-sm text-muted ring-1 ring-line">Ce compte a été supprimé : vous ne pouvez plus lui écrire.</p>
      ) : (
        <form onSubmit={(e) => void submit(e)} className="safe-bottom sticky bottom-16 -mx-4 flex items-end gap-2 border-t border-line bg-surface px-4 py-3 md:bottom-0">
          <label htmlFor="message" className="sr-only">Votre message</label>
          <textarea id="message" rows={1} maxLength={4000} value={draft} onChange={(e) => setDraft(e.target.value)} onKeyDown={onKeyDown}
            placeholder="Écrire un message…" enterKeyHint="send"
            className="max-h-40 min-h-12 flex-1 resize-none rounded-2xl border border-line bg-white px-4 py-3 text-base focus:border-brand focus:ring-3 focus:ring-brand/25 focus:outline-none"
            style={{ fieldSizing: 'content' } as CSSProperties} />
          <Button type="submit" variant="navy" className="size-12 shrink-0 rounded-full p-0!" loading={sending} disabled={!draft.trim()} aria-label="Envoyer">
            {!sending && <SendHorizontal className="size-5" aria-hidden />}
          </Button>
        </form>
      )}
    </div>
  );
}
