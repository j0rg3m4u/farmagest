'use client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '@/lib/api-client';
import type {
  CreateGeraInput,
  UpdateGeraInput,
  AddGeraItemInput,
  TriageItemInput,
  MapExternalCodeInput,
} from '@farmagest/shared';
import type { Gera, GerasListResponse, DispatchPreview, ExternalCodeMapping } from '@/types/gera';

export function useGeras(filter: Record<string, string | undefined> = {}) {
  return useQuery({
    queryKey: ['geras', filter],
    queryFn: async () => {
      const res = await apiClient.get<GerasListResponse>('/geras', { params: filter });
      return res.data;
    },
  });
}

export function useGera(id: string) {
  return useQuery({
    queryKey: ['geras', id],
    queryFn: async () => {
      const res = await apiClient.get<Gera>(`/geras/${id}`);
      return res.data;
    },
    enabled: !!id,
  });
}

export function useGeraItems(geraId: string) {
  return useQuery({
    queryKey: ['geras', geraId, 'items'],
    queryFn: async () => {
      const res = await apiClient.get<import('@/types/gera').GeraItem[]>(`/geras/${geraId}/items`);
      return res.data;
    },
    enabled: !!geraId,
  });
}

export function useCreateGera() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (dto: CreateGeraInput) => {
      const res = await apiClient.post<Gera>('/geras', dto);
      return res.data;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['geras'] }),
  });
}

export function useUpdateGera(id: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (dto: UpdateGeraInput) => {
      const res = await apiClient.patch<Gera>(`/geras/${id}`, dto);
      return res.data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['geras', id] });
      qc.invalidateQueries({ queryKey: ['geras'] });
    },
  });
}

export function useCancelGera(id: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async () => {
      await apiClient.delete(`/geras/${id}`);
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['geras'] }),
  });
}

export function useAddGeraItem(geraId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (dto: AddGeraItemInput) => {
      const res = await apiClient.post(`/geras/${geraId}/items`, dto);
      return res.data;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['geras', geraId] }),
  });
}

export function useTriageItem(geraId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ itemId, ...dto }: TriageItemInput & { itemId: string }) => {
      const res = await apiClient.patch(`/geras/${geraId}/items/${itemId}/triage`, dto);
      return res.data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['geras', geraId, 'items'] });
      qc.invalidateQueries({ queryKey: ['geras', geraId] });
    },
  });
}

export function useDispatchPreview(geraId: string, enabled: boolean) {
  return useQuery({
    queryKey: ['geras', geraId, 'dispatch-preview'],
    queryFn: async () => {
      const res = await apiClient.get<DispatchPreview>(`/geras/${geraId}/dispatch-preview`);
      return res.data;
    },
    enabled: enabled && !!geraId,
  });
}

export function useDispatchGera(geraId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async () => {
      const res = await apiClient.post<Gera>(`/geras/${geraId}/dispatch`);
      return res.data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['geras', geraId] });
      qc.invalidateQueries({ queryKey: ['geras', geraId, 'items'] });
      qc.invalidateQueries({ queryKey: ['geras'] });
    },
  });
}

export function useMapExternalCode() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (dto: MapExternalCodeInput) => {
      const res = await apiClient.post('/geras/external-codes/map', dto);
      return res.data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['geras'] });
      qc.invalidateQueries({ queryKey: ['external-codes'] });
    },
  });
}

export function useExternalMappings() {
  return useQuery({
    queryKey: ['external-codes'],
    queryFn: async () => {
      const res = await apiClient.get<ExternalCodeMapping[]>('/geras/external-codes');
      return res.data;
    },
  });
}
