'use client';
import { useQuery } from '@tanstack/react-query';
import { apiClient } from '@/lib/api-client';

export interface AuditLog {
  id: string;
  userId: string | null;
  user: { id: string; name: string; email: string } | null;
  action: string;
  entity: string;
  entityId: string | null;
  sectorId: string | null;
  payload: unknown;
  createdAt: string;
}

interface AuditLogsResponse {
  data: AuditLog[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

interface AuditLogFilters {
  userId?: string;
  action?: string;
  entity?: string;
  entityId?: string;
  sectorId?: string;
  dateFrom?: string;
  dateTo?: string;
  page?: number;
  limit?: number;
}

export function useAuditLogs(filters: AuditLogFilters = {}) {
  return useQuery({
    queryKey: ['audit-logs', filters],
    queryFn: async () => {
      const res = await apiClient.get<AuditLogsResponse>('/audit-logs', { params: filters });
      return res.data;
    },
  });
}

export function useAuditLog(id: string) {
  return useQuery({
    queryKey: ['audit-logs', id],
    queryFn: async () => {
      const res = await apiClient.get<AuditLog>(`/audit-logs/${id}`);
      return res.data;
    },
    enabled: !!id,
  });
}

export function useAuditHistory(entity: string, entityId: string) {
  return useQuery({
    queryKey: ['audit-logs', 'history', entity, entityId],
    queryFn: async () => {
      const res = await apiClient.get<AuditLog[]>(`/audit-logs/history/${entity}/${entityId}`);
      return res.data;
    },
    enabled: !!entity && !!entityId,
  });
}

export function useAuditEntities() {
  return useQuery({
    queryKey: ['audit-logs', 'entities'],
    queryFn: async () => {
      const res = await apiClient.get<string[]>('/audit-logs/entities');
      return res.data;
    },
    staleTime: 5 * 60 * 1000,
  });
}

export function useAuditActions() {
  return useQuery({
    queryKey: ['audit-logs', 'actions'],
    queryFn: async () => {
      const res = await apiClient.get<string[]>('/audit-logs/actions');
      return res.data;
    },
    staleTime: 5 * 60 * 1000,
  });
}

export function useAuditStats() {
  return useQuery({
    queryKey: ['audit-logs', 'stats'],
    queryFn: async () => {
      const res = await apiClient.get('/audit-logs/stats');
      return res.data;
    },
  });
}
