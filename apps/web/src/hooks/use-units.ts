'use client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '@/lib/api-client';
import type { Unit, CreateUnitInput, UpdateUnitInput } from '@farmagest/shared';

interface UnitsFilter {
  type?: string;
  active?: string;
  search?: string;
  page?: number;
  limit?: number;
}

interface PaginatedUnits {
  data: Unit[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export function useUnits(filter: UnitsFilter = {}) {
  return useQuery({
    queryKey: ['units', filter],
    queryFn: async () => {
      const res = await apiClient.get<PaginatedUnits>('/units', { params: filter });
      return res.data;
    },
  });
}

export function useUnit(id: string) {
  return useQuery({
    queryKey: ['units', id],
    queryFn: async () => {
      const res = await apiClient.get<Unit>(`/units/${id}`);
      return res.data;
    },
    enabled: !!id,
  });
}

export function useCreateUnit() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (data: CreateUnitInput) => {
      const res = await apiClient.post<Unit>('/units', data);
      return res.data;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['units'] }),
  });
}

export function useUpdateUnit(id: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (data: UpdateUnitInput) => {
      const res = await apiClient.patch<Unit>(`/units/${id}`, data);
      return res.data;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['units'] }),
  });
}

export function useDeleteUnit() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      await apiClient.delete(`/units/${id}`);
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['units'] }),
  });
}
