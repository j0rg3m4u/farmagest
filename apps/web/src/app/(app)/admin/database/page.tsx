'use client';

import { useQuery } from '@tanstack/react-query';
import { RefreshCcw } from 'lucide-react';
import { apiClient } from '@/lib/api-client';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';

interface DbStatus {
  users: number;
  items: number;
  lots: number;
  movements: number;
  geras: number;
  exchanges: number;
  auditLogs: number;
  uptimeSeconds: number;
  nodeVersion: string;
  environment: string;
}

function fmtUptime(seconds: number): string {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = seconds % 60;
  return `${h}h ${m}m ${s}s`;
}

export default function AdminDatabasePage() {
  const { data, isLoading, refetch, isFetching } = useQuery<DbStatus>({
    queryKey: ['admin', 'database-status'],
    queryFn: () => apiClient.get('/admin/database-status').then((r) => r.data),
    refetchInterval: 30_000,
  });

  const rows: { label: string; value: string | number }[] = data
    ? [
        { label: 'Usuários', value: data.users },
        { label: 'Itens', value: data.items },
        { label: 'Lotes', value: data.lots },
        { label: 'Movimentações', value: data.movements },
        { label: 'GERAs', value: data.geras },
        { label: 'Trocas', value: data.exchanges },
        { label: 'Logs de auditoria', value: data.auditLogs },
        { label: 'Uptime', value: fmtUptime(data.uptimeSeconds) },
        { label: 'Node.js', value: data.nodeVersion },
        { label: 'Ambiente', value: data.environment },
      ]
    : [];

  return (
    <div className="p-6 max-w-xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-xl font-semibold text-gray-900">Status do Banco</h1>
        <Button variant="outline" size="sm" onClick={() => refetch()} disabled={isFetching}>
          <RefreshCcw size={14} className={`mr-2 ${isFetching ? 'animate-spin' : ''}`} />
          Atualizar
        </Button>
      </div>

      {isLoading ? (
        <p className="text-sm text-gray-500">Carregando…</p>
      ) : (
        <Card className="divide-y">
          {rows.map((row) => (
            <div key={row.label} className="flex items-center justify-between px-5 py-3 text-sm">
              <span className="text-gray-600">{row.label}</span>
              <span className="font-medium text-gray-900 tabular-nums">{row.value}</span>
            </div>
          ))}
        </Card>
      )}
    </div>
  );
}
