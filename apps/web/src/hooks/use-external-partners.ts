'use client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '@/lib/api-client';
import type { CreateExternalPartnerInput, UpdateExternalPartnerInput } from '@farmagest/shared';

interface ExternalPartner {
  id: string;
  name: string;
  cnpj: string | null;
  responsibleName: string | null;
  contact: string | null;
  notes: string | null;
  active: boolean;
  createdAt: string;
  updatedAt: string;
}

interface PartnersResponse {
  data: ExternalPartner[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

interface PartnersFilter {
  search?: string;
  active?: string;
  page?: number;
  limit?: number;
}

export function useExternalPartners(filter: PartnersFilter = {}) {
  return useQuery({
    queryKey: ['partners', filter],
    queryFn: async () => {
      const res = await apiClient.get<PartnersResponse>('/partners', { params: filter });
      return res.data;
    },
  });
}

export function useExternalPartner(id: string) {
  return useQuery({
    queryKey: ['partners', id],
    queryFn: async () => {
      const res = await apiClient.get<ExternalPartner>(`/partners/${id}`);
      return res.data;
    },
    enabled: !!id,
  });
}

export function useCreateExternalPartner() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (dto: CreateExternalPartnerInput) => {
      const res = await apiClient.post<ExternalPartner>('/partners', dto);
      return res.data;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['partners'] }),
  });
}

export function useUpdateExternalPartner(id: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (dto: UpdateExternalPartnerInput) => {
      const res = await apiClient.patch<ExternalPartner>(`/partners/${id}`, dto);
      return res.data;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['partners'] }),
  });
}

export function useDeleteExternalPartner() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      await apiClient.delete(`/partners/${id}`);
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['partners'] }),
  });
}
