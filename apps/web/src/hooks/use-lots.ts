'use client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '@/lib/api-client';
import type { Lot, CreateLotInput, UpdateLotInput } from '@farmagest/shared';

interface PaginatedLots {
  data: Lot[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export function useItemLots(itemId: string) {
  return useQuery({
    queryKey: ['lots', itemId],
    queryFn: async () => {
      const res = await apiClient.get<PaginatedLots>(`/items/${itemId}/lots`);
      return res.data;
    },
    enabled: !!itemId,
  });
}

export function useCreateLot() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (data: CreateLotInput) => {
      const res = await apiClient.post<Lot>(`/items/${data.itemId}/lots`, data);
      return res.data;
    },
    onSuccess: (_, vars) => qc.invalidateQueries({ queryKey: ['lots', vars.itemId] }),
  });
}

export function useUpdateLot(id: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (data: UpdateLotInput) => {
      const res = await apiClient.patch<Lot>(`/lots/${id}`, data);
      return res.data;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['lots'] }),
  });
}
