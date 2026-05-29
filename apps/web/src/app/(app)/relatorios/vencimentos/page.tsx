'use client';
import { useState } from 'react';
import { ReportPage } from '@/components/reports/ReportPage';
import { ReportTable } from '@/components/reports/ReportTable';
import { ReportChart } from '@/components/reports/ReportChart';
import { useExpirationReport, type ReportFilters } from '@/hooks/use-reports';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';

export default function VencimentosPage() {
  const [filters, setFilters] = useState<ReportFilters>({ days: '30' });
  const { data, isLoading } = useExpirationReport(filters);

  return (
    <ReportPage
      title="R05 — Validades a Expirar"
      description="Lotes com vencimento próximo, agrupados por urgência e valor em risco."
      apiPath="/reports/expiration"
      pdfFilename="r05-validades.pdf"
      excelFilename="r05-validades.xlsx"
      filters={filters}
      onFiltersChange={setFilters}
      showPeriodPicker={false}
      isLoading={isLoading}
      extraFilters={
        <div className="flex items-center gap-3">
          <Label className="text-xs text-slate-600 whitespace-nowrap">Próximos</Label>
          <Select value={filters.days ?? '30'} onValueChange={(v) => setFilters({ ...filters, days: v ?? undefined })}>
            <SelectTrigger className="h-8 w-28 text-xs">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="30">30 dias</SelectItem>
              <SelectItem value="60">60 dias</SelectItem>
              <SelectItem value="90">90 dias</SelectItem>
            </SelectContent>
          </Select>
        </div>
      }
    >
      {data && (
        <div className="space-y-4">
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            <div className="bg-white border border-slate-200 rounded-lg p-3">
              <p className="text-xs text-slate-500">Lotes em risco</p>
              <p className="text-xl font-bold text-slate-800">{data.meta.totalLots}</p>
            </div>
            <div className="bg-white border border-red-200 rounded-lg p-3">
              <p className="text-xs text-red-500">Valor total em risco (R$)</p>
              <p className="text-xl font-bold text-red-600">{data.meta.totalRisco.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</p>
            </div>
            <div className="bg-white border border-slate-200 rounded-lg p-3">
              <p className="text-xs text-slate-500">Sem valor cadastrado</p>
              <p className="text-xl font-bold text-orange-500">{data.meta.semValor}</p>
            </div>
          </div>

          {data.chart?.length > 0 && (
            <div className="bg-white border border-slate-200 rounded-lg p-4">
              <p className="text-xs font-semibold text-slate-600 mb-3">Valor em risco por faixa de urgência (R$)</p>
              <ReportChart
                type="bar"
                data={data.chart}
                xKey="name"
                series={[{ key: 'value', label: 'Valor em risco (R$)', color: '#d97706' }]}
                valueFormatter={(v) => v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
              />
            </div>
          )}

          <div className="bg-white border border-slate-200 rounded-lg p-4">
            <ReportTable rows={data.rows} maxRows={200} />
          </div>
        </div>
      )}
    </ReportPage>
  );
}
