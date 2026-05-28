'use client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '@/lib/api-client';
import type {
  Movement,
  FefoSuggestion,
  EntryPurchaseInput,
  ExitSupplyInput,
  AdjustmentInput,
  DisposalInput,
  ReversalInput,
} from '@farmagest/shared';

interface MovementsFilter {
  itemId?: string;
  lotId?: string;
  sectorId?: string;
  unitId?: string;
  type?: string;
  dateFrom?: string;
  dateTo?: string;
  page?: number;
  limit?: number;
}

interface PaginatedMovements {
  data: Movement[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export function useMovements(filter: MovementsFilter = {}) {
  return useQuery({
    queryKey: ['movements', filter],
    queryFn: async () => {
      const res = await apiClient.get<PaginatedMovements>('/movements', { params: filter });
      return res.data;
    },
  });
}

export function useItemMovements(itemId: string, filter: Omit<MovementsFilter, 'itemId'> = {}) {
  return useQuery({
    queryKey: ['movements', { itemId, ...filter }],
    queryFn: async () => {
      const res = await apiClient.get<PaginatedMovements>('/movements', {
        params: { itemId, ...filter },
      });
      return res.data;
    },
    enabled: !!itemId,
  });
}

export function useFefoSuggestion(itemId: string, quantity: number) {
  return useQuery({
    queryKey: ['fefo', itemId, quantity],
    queryFn: async () => {
      const res = await apiClient.get<FefoSuggestion>(`/movements/fefo-suggestion/${itemId}`, {
        params: { quantity },
      });
      return res.data;
    },
    enabled: !!itemId && quantity > 0,
  });
}

export function useEntryPurchase() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (data: EntryPurchaseInput) => {
      const res = await apiClient.post<Movement>('/movements/entry-purchase', data);
      return res.data;
    },
    onSuccess: (_data, variables) => {
      qc.invalidateQueries({ queryKey: ['movements'] });
      qc.invalidateQueries({ queryKey: ['lots'] });
      qc.invalidateQueries({ queryKey: ['items', variables.itemId] });
    },
  });
}

export function useExitSupply() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (data: ExitSupplyInput) => {
      const res = await apiClient.post<Movement[]>('/movements/exit-supply', data);
      return res.data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['movements'] });
      qc.invalidateQueries({ queryKey: ['lots'] });
    },
  });
}

export function useAdjustment() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (data: AdjustmentInput) => {
      const res = await apiClient.post<Movement>('/movements/adjustment', data);
      return res.data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['movements'] });
      qc.invalidateQueries({ queryKey: ['lots'] });
    },
  });
}

export function useDisposal() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (data: DisposalInput) => {
      const res = await apiClient.post<Movement>('/movements/disposal', data);
      return res.data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['movements'] });
      qc.invalidateQueries({ queryKey: ['lots'] });
    },
  });
}

export function useReversal(movementId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (data: ReversalInput) => {
      const res = await apiClient.post<Movement>(`/movements/${movementId}/reversal`, data);
      return res.data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['movements'] });
      qc.invalidateQueries({ queryKey: ['lots'] });
    },
  });
}
