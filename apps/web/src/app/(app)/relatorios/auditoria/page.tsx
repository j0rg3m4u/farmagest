'use client';
import { useState } from 'react';
import { ReportPage } from '@/components/reports/ReportPage';
import { ReportTable } from '@/components/reports/ReportTable';
import { ReportChart } from '@/components/reports/ReportChart';
import { useAuditReport, type ReportFilters } from '@/hooks/use-reports';
import { useAuthStore } from '@/stores/auth-store';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import { redirect } from 'next/navigation';

const ACTIONS = ['CREATE', 'UPDATE', 'DELETE', 'LOGIN', 'LOGOUT', 'EXPORT', 'IMPORT', 'DISPATCH', 'APPROVE', 'DENY', 'CANCEL'];
const ENTITIES = ['User', 'Item', 'Lot', 'Movement', 'Exchange', 'Gera', 'GeraItem', 'Unit', 'Sector'];

export default function AuditoriaPage() {
  const user = useAuthStore((s) => s.user);
  const [filters, setFilters] = useState<ReportFilters>({ preset: 'this_month' });
  const { data, isLoading } = useAuditReport(filters);

  if (user && user.role !== 'MANAGER') {
    redirect('/relatorios');
  }

  return (
    <ReportPage
      title="R10 — Trilha de Auditoria"
      description="Log completo de ações do sistema para prestação de contas ao Tribunal de Contas."
      apiPath="/reports/audit"
      pdfFilename="r10-auditoria.pdf"
      excelFilename="r10-auditoria.xlsx"
      filters={filters}
      onFiltersChange={setFilters}
      isLoading={isLoading}
      extraFilters={
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 mt-2">
          <div>
            <Label className="text-xs text-slate-500 mb-1 block">Ação</Label>
            <Select
              value={filters.action ?? ''}
              onValueChange={(v) => setFilters({ ...filters, action: v || undefined })}
            >
              <SelectTrigger className="h-8 text-xs">
                <SelectValue placeholder="Todas" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="">Todas</SelectItem>
                {ACTIONS.map((a) => <SelectItem key={a} value={a}>{a}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label className="text-xs text-slate-500 mb-1 block">Entidade</Label>
            <Select
              value={filters.entity ?? ''}
              onValueChange={(v) => setFilters({ ...filters, entity: v || undefined })}
            >
              <SelectTrigger className="h-8 text-xs">
                <SelectValue placeholder="Todas" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="">Todas</SelectItem>
                {ENTITIES.map((e) => <SelectItem key={e} value={e}>{e}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
        </div>
      }
    >
      {data && (
        <div className="space-y-4">
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            <div className="bg-white border border-slate-200 rounded-lg p-3">
              <p className="text-xs text-slate-500">Total de eventos</p>
              <p className="text-xl font-bold text-slate-800">{data.meta.total.toLocaleString('pt-BR')}</p>
              {data.meta.truncated && <p className="text-xs text-orange-500 mt-0.5">Limitado a 2000 — exporte para ver todos</p>}
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {data.chart?.length > 0 && (
              <div className="bg-white border border-slate-200 rounded-lg p-4">
                <p className="text-xs font-semibold text-slate-600 mb-3">Eventos por tipo de ação</p>
                <ReportChart
                  type="bar"
                  data={data.chart}
                  xKey="name"
                  series={[{ key: 'value', label: 'Eventos', color: '#7c3aed' }]}
                />
              </div>
            )}

            {data.topUsers?.length > 0 && (
              <div className="bg-white border border-slate-200 rounded-lg p-4">
                <p className="text-xs font-semibold text-slate-600 mb-3">Usuários mais ativos</p>
                <div className="divide-y divide-slate-100">
                  {data.topUsers.map((u: any, i: number) => (
                    <div key={i} className="flex items-center justify-between py-2">
                      <span className="text-sm text-slate-700">{u.name}</span>
                      <span className="text-sm font-semibold text-purple-700">{u.count} ações</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          <div className="bg-white border border-slate-200 rounded-lg p-4">
            <ReportTable rows={data.rows} excludeKeys={(k) => k === '_raw'} maxRows={200} />
          </div>
        </div>
      )}
    </ReportPage>
  );
}
