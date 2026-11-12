import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import type { Category, Commune, Trade } from '@/types/models';

const DAY = 24 * 60 * 60 * 1000;

export function useCommunes() {
  return useQuery({
    queryKey: ['ref', 'communes'],
    staleTime: DAY,
    queryFn: async (): Promise<Commune[]> => {
      const { data, error } = await supabase.from('communes').select('*').eq('is_active', true).order('name');
      if (error) throw error;
      return data;
    },
  });
}

export function useCategories(includeInactive = false) {
  return useQuery({
    queryKey: ['ref', 'categories', includeInactive],
    staleTime: includeInactive ? 0 : 60 * 60 * 1000,
    queryFn: async (): Promise<Category[]> => {
      let q = supabase.from('categories').select('*').order('sort_order').order('name');
      if (!includeInactive) q = q.eq('is_active', true);
      const { data, error } = await q;
      if (error) throw error;
      return data;
    },
  });
}

export function useTrades(includeInactive = false) {
  return useQuery({
    queryKey: ['ref', 'trades', includeInactive],
    staleTime: includeInactive ? 0 : 60 * 60 * 1000,
    queryFn: async (): Promise<Trade[]> => {
      let q = supabase.from('trades').select('*').order('sort_order').order('name');
      if (!includeInactive) q = q.eq('is_active', true);
      const { data, error } = await q;
      if (error) throw error;
      return data;
    },
  });
}

export function nameById<T extends { id: number; name: string }>(items: T[] | undefined, id: number | null | undefined) {
  if (!items || id === null || id === undefined) return '';
  return items.find((i) => i.id === id)?.name ?? '';
}
