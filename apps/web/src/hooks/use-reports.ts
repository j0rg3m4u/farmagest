'use client';
import { useQuery } from '@tanstack/react-query';
import { apiClient } from '@/lib/api-client';

export type ReportPreset = 'this_month' | 'last_month' | 'last_30_days' | 'last_60_days' | 'last_90_days' | 'this_year' | 'custom';

export interface ReportFilters {
  preset?: ReportPreset;
  dateFrom?: string;
  dateTo?: string;
  sectorId?: string;
  unitId?: string;
  itemId?: string;
  format?: 'json' | 'pdf' | 'excel';
  days?: string;
  userId?: string;
  action?: string;
  entity?: string;
}

async function fetchReport<T>(path: string, filters: ReportFilters): Promise<T> {
  const params: Record<string, string> = {};
  for (const [k, v] of Object.entries(filters)) {
    if (v !== undefined && v !== '') params[k] = String(v);
  }
  const res = await apiClient.get<T>(path, { params });
  return res.data;
}

export async function downloadReport(path: string, filters: ReportFilters, filename: string) {
  const params: Record<string, string> = {};
  for (const [k, v] of Object.entries(filters)) {
    if (v !== undefined && v !== '') params[k] = String(v);
  }
  const res = await apiClient.get(path, { params, responseType: 'blob' });
  const url = URL.createObjectURL(res.data as Blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

export function useMovementsReport(filters: ReportFilters) {
  return useQuery({
    queryKey: ['reports', 'movements', filters],
    queryFn: () => fetchReport<any>('/reports/movements', { ...filters, format: 'json' }),
    enabled: !!(filters.preset || (filters.dateFrom && filters.dateTo)),
  });
}

export function useConsumptionByItemReport(filters: ReportFilters) {
  return useQuery({
    queryKey: ['reports', 'consumption-item', filters],
    queryFn: () => fetchReport<any>('/reports/consumption/by-item', { ...filters, format: 'json' }),
    enabled: !!(filters.preset || (filters.dateFrom && filters.dateTo)),
  });
}

export function useConsumptionByUnitReport(filters: ReportFilters) {
  return useQuery({
    queryKey: ['reports', 'consumption-unit', filters],
    queryFn: () => fetchReport<any>('/reports/consumption/by-unit', { ...filters, format: 'json' }),
    enabled: !!(filters.preset || (filters.dateFrom && filters.dateTo)),
  });
}

export function useLossesReport(filters: ReportFilters) {
  return useQuery({
    queryKey: ['reports', 'losses', filters],
    queryFn: () => fetchReport<any>('/reports/losses', { ...filters, format: 'json' }),
    enabled: !!(filters.preset || (filters.dateFrom && filters.dateTo)),
  });
}

export function useExpirationReport(filters: ReportFilters) {
  return useQuery({
    queryKey: ['reports', 'expiration', filters],
    queryFn: () => fetchReport<any>('/reports/expiration', { ...filters, format: 'json' }),
    enabled: true,
  });
}

export function useExchangesReport(filters: ReportFilters) {
  return useQuery({
    queryKey: ['reports', 'exchanges', filters],
    queryFn: () => fetchReport<any>('/reports/exchanges', { ...filters, format: 'json' }),
    enabled: !!(filters.preset || (filters.dateFrom && filters.dateTo)),
  });
}

export function useGerasReport(filters: ReportFilters) {
  return useQuery({
    queryKey: ['reports', 'geras', filters],
    queryFn: () => fetchReport<any>('/reports/geras', { ...filters, format: 'json' }),
    enabled: !!(filters.preset || (filters.dateFrom && filters.dateTo)),
  });
}

export function useStockPositionReport(filters: ReportFilters) {
  return useQuery({
    queryKey: ['reports', 'stock-position', filters],
    queryFn: () => fetchReport<any>('/reports/stock-position', { ...filters, format: 'json' }),
    enabled: true,
  });
}

export function useExecutiveReport(filters: ReportFilters) {
  return useQuery({
    queryKey: ['reports', 'executive', filters],
    queryFn: () => fetchReport<any>('/reports/executive', { ...filters, format: 'json' }),
    enabled: !!(filters.preset || (filters.dateFrom && filters.dateTo)),
  });
}

export function useAuditReport(filters: ReportFilters) {
  return useQuery({
    queryKey: ['reports', 'audit', filters],
    queryFn: () => fetchReport<any>('/reports/audit', { ...filters, format: 'json' }),
    enabled: !!(filters.preset || (filters.dateFrom && filters.dateTo)),
  });
}
