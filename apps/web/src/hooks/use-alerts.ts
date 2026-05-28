'use client';
import { useQuery } from '@tanstack/react-query';
import { apiClient } from '@/lib/api-client';

interface AlertSummary {
  zeroBalance: { count: number };
  expiringIn30: { count: number };
  expiringIn31to60: { count: number };
  expiringIn61to90: { count: number };
  movementsThisMonth: number;
}

interface ExpirationAlert {
  days: number;
  total: number;
  lots: Array<{
    id: string;
    lotNumber: string;
    expirationDate: string;
    currentBalance: string;
    item: { id: string; code: string; description: string; sector: { name: string } };
  }>;
}

interface CriticalAlert {
  total: number;
  items: Array<{
    id: string;
    code: string;
    description: string;
    unitOfMeasure: string;
    totalBalance: number;
    sector: { name: string };
  }>;
}

export function useAlertSummary() {
  return useQuery({
    queryKey: ['alerts', 'summary'],
    queryFn: async () => {
      const res = await apiClient.get<AlertSummary>('/alerts/summary');
      return res.data;
    },
    refetchInterval: 5 * 60 * 1000,
  });
}

export function useExpirationAlert(days: number) {
  return useQuery({
    queryKey: ['alerts', 'expiration', days],
    queryFn: async () => {
      const res = await apiClient.get<ExpirationAlert>('/alerts/expiration', { params: { days } });
      return res.data;
    },
  });
}

export function useCriticalAlert() {
  return useQuery({
    queryKey: ['alerts', 'critical'],
    queryFn: async () => {
      const res = await apiClient.get<CriticalAlert>('/alerts/critical');
      return res.data;
    },
  });
}
