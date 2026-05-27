'use client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '@/lib/api-client';
import type { Item, CreateItemInput, UpdateItemInput } from '@farmagest/shared';

interface ItemsFilter {
  search?: string;
  category?: string;
  controlled344?: string;
  active?: string;
  sectorId?: string;
  page?: number;
  limit?: number;
}

interface PaginatedItems {
  data: Item[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export function useItems(filter: ItemsFilter = {}) {
  return useQuery({
    queryKey: ['items', filter],
    queryFn: async () => {
      const res = await apiClient.get<PaginatedItems>('/items', { params: filter });
      return res.data;
    },
  });
}

export function useItem(id: string) {
  return useQuery({
    queryKey: ['items', id],
    queryFn: async () => {
      const res = await apiClient.get<Item>(`/items/${id}`);
      return res.data;
    },
    enabled: !!id,
  });
}

export function useCreateItem() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (data: CreateItemInput) => {
      const res = await apiClient.post<Item>('/items', data);
      return res.data;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['items'] }),
  });
}

export function useUpdateItem(id: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (data: UpdateItemInput) => {
      const res = await apiClient.patch<Item>(`/items/${id}`, data);
      return res.data;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['items'] }),
  });
}

export function useDeleteItem() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      await apiClient.delete(`/items/${id}`);
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['items'] }),
  });
}

export function useBatchUpdateItems() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (updates: Array<{ id: string } & Record<string, unknown>>) => {
      const res = await apiClient.patch<{ updated: number }>('/items/batch', { updates });
      return res.data;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['items'] }),
  });
}
