import { useEffect } from 'react';
import { useInfiniteQuery, useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import type { ConversationSummary, Message } from '@/types/models';

export function useConversations(enabled = true) {
  return useQuery({
    queryKey: ['conversations'],
    enabled,
    // Actualisation régulière modérée (coûts maîtrisés) + temps réel quand une conversation est ouverte.
    refetchInterval: 30_000,
    queryFn: async (): Promise<ConversationSummary[]> => {
      const { data, error } = await supabase.rpc('my_conversations');
      if (error) throw error;
      return data ?? [];
    },
  });
}

export function useUnreadMessages(enabled: boolean) {
  return useQuery({
    queryKey: ['conversations', 'unread'],
    enabled,
    refetchInterval: 45_000,
    queryFn: async (): Promise<number> => {
      const { data, error } = await supabase.rpc('unread_messages_count');
      if (error) throw error;
      return Number(data ?? 0);
    },
  });
}

const PAGE = 40;

export function useMessages(conversationId: string | undefined) {
  return useInfiniteQuery({
    queryKey: ['messages', conversationId],
    enabled: Boolean(conversationId),
    initialPageParam: null as string | null,
    refetchInterval: 20_000,
    queryFn: async ({ pageParam }): Promise<Message[]> => {
      let q = supabase.from('messages').select('*').eq('conversation_id', conversationId!)
        .order('created_at', { ascending: false }).limit(PAGE);
      if (pageParam) q = q.lt('created_at', pageParam);
      const { data, error } = await q;
      if (error) throw error;
      return data ?? [];
    },
    getNextPageParam: (last) => (last.length === PAGE ? last[last.length - 1].created_at : undefined),
  });
}

/** Abonnement temps réel aux nouveaux messages d'une conversation (RLS appliquée par Supabase). */
export function useConversationRealtime(conversationId: string | undefined) {
  const qc = useQueryClient();
  useEffect(() => {
    if (!conversationId) return;
    const channel = supabase
      .channel(`conversation:${conversationId}`)
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'messages', filter: `conversation_id=eq.${conversationId}` },
        () => {
          void qc.invalidateQueries({ queryKey: ['messages', conversationId] });
          void qc.invalidateQueries({ queryKey: ['conversations'] });
        })
      .subscribe();
    return () => {
      void supabase.removeChannel(channel);
    };
  }, [conversationId, qc]);
}

export async function sendMessage(conversationId: string, body: string) {
  const { error } = await supabase.from('messages').insert({ conversation_id: conversationId, body });
  if (error) throw error;
}

export async function markConversationRead(conversationId: string) {
  await supabase.rpc('mark_conversation_read', { p_conversation_id: conversationId });
}

export async function startConversation(providerId: string): Promise<string> {
  const { data, error } = await supabase.rpc('start_conversation', { p_provider_id: providerId });
  if (error) throw error;
  return data;
}
