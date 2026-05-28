'use client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '@/lib/api-client';
import type {
  CreateExchangeInput,
  UpdateExchangeInput,
  AddExchangeOutputInput,
  AddExchangeInputInput,
  UpdateExchangeOutputInput,
  UpdateExchangeInputInput,
} from '@farmagest/shared';
import type { Exchange, BalanceResult, ExchangesListResponse } from '@/types/exchange';

export function useExchanges(filter: Record<string, string | undefined> = {}) {
  return useQuery({
    queryKey: ['exchanges', filter],
    queryFn: async () => {
      const res = await apiClient.get<ExchangesListResponse>('/exchanges', { params: filter });
      return res.data;
    },
  });
}

export function useExchange(id: string) {
  return useQuery({
    queryKey: ['exchanges', id],
    queryFn: async () => {
      const res = await apiClient.get<Exchange>(`/exchanges/${id}`);
      return res.data;
    },
    enabled: !!id,
  });
}

export function useCreateExchange() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (dto: CreateExchangeInput) => {
      const res = await apiClient.post<Exchange>('/exchanges', dto);
      return res.data;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['exchanges'] }),
  });
}

export function useUpdateExchange(id: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (dto: UpdateExchangeInput) => {
      const res = await apiClient.patch<Exchange>(`/exchanges/${id}`, dto);
      return res.data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['exchanges', id] });
      qc.invalidateQueries({ queryKey: ['exchanges'] });
    },
  });
}

export function useCheckBalance(id: string) {
  return useQuery({
    queryKey: ['exchanges', id, 'balance'],
    queryFn: async () => {
      const res = await apiClient.post<BalanceResult>(`/exchanges/${id}/check-balance`);
      return res.data;
    },
    enabled: !!id,
  });
}

export function useMarkReady(id: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async () => {
      const res = await apiClient.post<Exchange>(`/exchanges/${id}/mark-ready`);
      return res.data;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['exchanges', id] }),
  });
}

export function useCancelExchange(id: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (reason: string) => {
      const res = await apiClient.post<Exchange>(`/exchanges/${id}/cancel`, { reason });
      return res.data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['exchanges', id] });
      qc.invalidateQueries({ queryKey: ['exchanges'] });
    },
  });
}

export function useAddOutput(exchangeId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (dto: AddExchangeOutputInput) => {
      const res = await apiClient.post(`/exchanges/${exchangeId}/outputs`, dto);
      return res.data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['exchanges', exchangeId] });
      qc.invalidateQueries({ queryKey: ['exchanges', exchangeId, 'balance'] });
    },
  });
}

export function useUpdateOutput(exchangeId: string, outputId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (dto: UpdateExchangeOutputInput) => {
      const res = await apiClient.patch(`/exchanges/${exchangeId}/outputs/${outputId}`, dto);
      return res.data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['exchanges', exchangeId] });
      qc.invalidateQueries({ queryKey: ['exchanges', exchangeId, 'balance'] });
    },
  });
}

export function useRemoveOutput(exchangeId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (outputId: string) => {
      await apiClient.delete(`/exchanges/${exchangeId}/outputs/${outputId}`);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['exchanges', exchangeId] });
      qc.invalidateQueries({ queryKey: ['exchanges', exchangeId, 'balance'] });
    },
  });
}

export function useAddInput(exchangeId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (dto: AddExchangeInputInput) => {
      const res = await apiClient.post(`/exchanges/${exchangeId}/inputs`, dto);
      return res.data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['exchanges', exchangeId] });
      qc.invalidateQueries({ queryKey: ['exchanges', exchangeId, 'balance'] });
    },
  });
}

export function useUpdateInput(exchangeId: string, inputId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (dto: UpdateExchangeInputInput) => {
      const res = await apiClient.patch(`/exchanges/${exchangeId}/inputs/${inputId}`, dto);
      return res.data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['exchanges', exchangeId] });
      qc.invalidateQueries({ queryKey: ['exchanges', exchangeId, 'balance'] });
    },
  });
}

export function useRemoveInput(exchangeId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (inputId: string) => {
      await apiClient.delete(`/exchanges/${exchangeId}/inputs/${inputId}`);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['exchanges', exchangeId] });
      qc.invalidateQueries({ queryKey: ['exchanges', exchangeId, 'balance'] });
    },
  });
}

export function useExecuteOutput(exchangeId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (outputId: string) => {
      const res = await apiClient.post(`/exchanges/${exchangeId}/execute-output/${outputId}`);
      return res.data;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['exchanges', exchangeId] }),
  });
}

export function useExecuteInput(exchangeId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (inputId: string) => {
      const res = await apiClient.post(`/exchanges/${exchangeId}/execute-input/${inputId}`);
      return res.data;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['exchanges', exchangeId] }),
  });
}

export function useExecuteAll(exchangeId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async () => {
      const res = await apiClient.post(`/exchanges/${exchangeId}/execute-all`);
      return res.data;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['exchanges', exchangeId] }),
  });
}
