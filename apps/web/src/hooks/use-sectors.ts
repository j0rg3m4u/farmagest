'use client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '@/lib/api-client';
import type { Sector, CreateSectorInput, UpdateSectorInput } from '@farmagest/shared';

interface SectorsFilter {
  active?: string;
  search?: string;
  page?: number;
  limit?: number;
}

interface PaginatedSectors {
  data: Sector[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export function useSectors(filter: SectorsFilter = {}) {
  return useQuery({
    queryKey: ['sectors', filter],
    queryFn: async () => {
      const res = await apiClient.get<PaginatedSectors>('/sectors', { params: filter });
      return res.data;
    },
  });
}

export function useSector(id: string) {
  return useQuery({
    queryKey: ['sectors', id],
    queryFn: async () => {
      const res = await apiClient.get<Sector>(`/sectors/${id}`);
      return res.data;
    },
    enabled: !!id,
  });
}

export function useCreateSector() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (data: CreateSectorInput) => {
      const res = await apiClient.post<Sector>('/sectors', data);
      return res.data;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['sectors'] }),
  });
}

export function useUpdateSector(id: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (data: UpdateSectorInput) => {
      const res = await apiClient.patch<Sector>(`/sectors/${id}`, data);
      return res.data;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['sectors'] }),
  });
}

export function useDeleteSector() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      await apiClient.delete(`/sectors/${id}`);
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['sectors'] }),
  });
}
