'use client';
import { useState } from 'react';
import { ReportPage } from '@/components/reports/ReportPage';
import { ReportTable } from '@/components/reports/ReportTable';
import { ReportChart } from '@/components/reports/ReportChart';
import { useMovementsReport, type ReportFilters } from '@/hooks/use-reports';

export default function MovimentacoesPage() {
  const [filters, setFilters] = useState<ReportFilters>({ preset: 'this_month' });
  const { data, isLoading } = useMovementsReport(filters);

  return (
    <ReportPage
      title="R01 — Movimentações por Período"
      description="Todas as entradas e saídas do estoque no período selecionado."
      apiPath="/reports/movements"
      pdfFilename="r01-movimentacoes.pdf"
      excelFilename="r01-movimentacoes.xlsx"
      filters={filters}
      onFiltersChange={setFilters}
      isLoading={isLoading}
    >
      {data && (
        <div className="space-y-4">
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            <div className="bg-white border border-slate-200 rounded-lg p-3">
              <p className="text-xs text-slate-500">Total de registros</p>
              <p className="text-xl font-bold text-slate-800">{data.meta.totalMovements.toLocaleString('pt-BR')}</p>
            </div>
            <div className="bg-white border border-slate-200 rounded-lg p-3">
              <p className="text-xs text-slate-500">Total entradas (qtd)</p>
              <p className="text-xl font-bold text-green-700">{data.meta.totalEntradas.toLocaleString('pt-BR', { maximumFractionDigits: 1 })}</p>
            </div>
            <div className="bg-white border border-slate-200 rounded-lg p-3">
              <p className="text-xs text-slate-500">Total saídas (qtd)</p>
              <p className="text-xl font-bold text-red-600">{data.meta.totalSaidas.toLocaleString('pt-BR', { maximumFractionDigits: 1 })}</p>
            </div>
          </div>

          {data.chart?.length > 0 && (
            <div className="bg-white border border-slate-200 rounded-lg p-4">
              <p className="text-xs font-semibold text-slate-600 mb-3">Entradas × Saídas por dia</p>
              <ReportChart
                type="bar"
                data={data.chart}
                xKey="date"
                series={[
                  { key: 'entries', label: 'Entradas', color: '#059669' },
                  { key: 'exits', label: 'Saídas', color: '#dc2626' },
                ]}
              />
            </div>
          )}

          <div className="bg-white border border-slate-200 rounded-lg p-4">
            <ReportTable rows={data.rows} totals={data.totals} maxRows={200} />
          </div>
        </div>
      )}
    </ReportPage>
  );
}
