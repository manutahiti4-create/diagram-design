import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import type {
  AccountStatus, AdminStats, AdminUserRow, Appeal, AuditEntry, HiddenContent, ReportQueueItem, ReportReason, ReportStatus, ReportTarget,
} from '@/types/models';

export async function reportContent(targetType: ReportTarget, targetId: string, reason: ReportReason, details?: string) {
  const { error } = await supabase.rpc('report_content', {
    p_target_type: targetType, p_target_id: targetId, p_reason: reason, p_details: details || undefined,
  });
  if (error) throw error;
}

export function useMyHiddenContent(enabled: boolean) {
  return useQuery({
    queryKey: ['moderation', 'mine'],
    enabled,
    queryFn: async (): Promise<HiddenContent[]> => {
      const { data, error } = await supabase.rpc('my_hidden_content');
      if (error) throw error;
      return data ?? [];
    },
  });
}

export async function submitAppeal(targetType: ReportTarget, targetId: string, message: string) {
  const { error } = await supabase.rpc('submit_appeal', { p_target_type: targetType, p_target_id: targetId, p_message: message });
  if (error) throw error;
}

// --- Administration (droits vérifiés côté serveur) ---------------------------
export function useAdminStats() {
  return useQuery({
    queryKey: ['admin', 'stats'],
    queryFn: async (): Promise<AdminStats> => {
      const { data, error } = await supabase.rpc('admin_stats');
      if (error) throw error;
      return data as unknown as AdminStats;
    },
  });
}

export function useAdminUsers(search: string, page: number) {
  return useQuery({
    queryKey: ['admin', 'users', search, page],
    queryFn: async (): Promise<AdminUserRow[]> => {
      const { data, error } = await supabase.rpc('admin_list_users', { p_search: search || undefined, p_limit: 25, p_offset: page * 25 });
      if (error) throw error;
      return data ?? [];
    },
  });
}

export async function adminSetUserStatus(userId: string, status: AccountStatus, reason: string) {
  const { error } = await supabase.rpc('admin_set_user_status', { p_user_id: userId, p_status: status, p_reason: reason });
  if (error) throw error;
}

export async function adminSetHidden(targetType: ReportTarget, targetId: string, hidden: boolean, reason: string) {
  const { error } = await supabase.rpc('admin_set_content_hidden', {
    p_target_type: targetType, p_target_id: targetId, p_hidden: hidden, p_reason: reason,
  });
  if (error) throw error;
}

export function useReportQueue(status: ReportStatus) {
  return useQuery({
    queryKey: ['admin', 'reports', status],
    queryFn: async (): Promise<ReportQueueItem[]> => {
      const { data, error } = await supabase.rpc('admin_report_queue', { p_status: status });
      if (error) throw error;
      return data ?? [];
    },
  });
}

export async function adminResolveReports(targetType: ReportTarget, targetId: string, decision: 'upheld' | 'dismissed', note?: string) {
  const { error } = await supabase.rpc('admin_resolve_reports', {
    p_target_type: targetType, p_target_id: targetId, p_decision: decision, p_note: note || undefined,
  });
  if (error) throw error;
}

export function useAppeals() {
  return useQuery({
    queryKey: ['admin', 'appeals'],
    queryFn: async (): Promise<Appeal[]> => {
      const { data, error } = await supabase.from('moderation_appeals').select('*').eq('status', 'open').order('created_at');
      if (error) throw error;
      return data ?? [];
    },
  });
}

export async function adminResolveAppeal(id: string, accept: boolean, note?: string) {
  const { error } = await supabase.rpc('admin_resolve_appeal', { p_appeal_id: id, p_accept: accept, p_note: note || undefined });
  if (error) throw error;
}

export function useAuditLog() {
  return useQuery({
    queryKey: ['admin', 'audit'],
    queryFn: async (): Promise<AuditEntry[]> => {
      const { data, error } = await supabase.from('admin_audit_log').select('*').order('id', { ascending: false }).limit(200);
      if (error) throw error;
      return data ?? [];
    },
  });
}
