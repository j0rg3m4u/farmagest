'use client';
import { useState } from 'react';
import { ReportPage } from '@/components/reports/ReportPage';
import { ReportTable } from '@/components/reports/ReportTable';
import { ReportChart } from '@/components/reports/ReportChart';
import { useLossesReport, type ReportFilters } from '@/hooks/use-reports';

export default function PerdasPage() {
  const [filters, setFilters] = useState<ReportFilters>({ preset: 'this_month' });
  const { data, isLoading } = useLossesReport(filters);

  return (
    <ReportPage
      title="R04 — Perdas e Descartes"
      description="Itens descartados por validade com impacto financeiro total."
      apiPath="/reports/losses"
      pdfFilename="r04-perdas.pdf"
      excelFilename="r04-perdas.xlsx"
      filters={filters}
      onFiltersChange={setFilters}
      isLoading={isLoading}
    >
      {data && (
        <div className="space-y-4">
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            <div className="bg-white border border-slate-200 rounded-lg p-3">
              <p className="text-xs text-slate-500">Total de descartes</p>
              <p className="text-xl font-bold text-slate-800">{data.meta.totalLosses}</p>
            </div>
            <div className="bg-white border border-slate-200 rounded-lg p-3">
              <p className="text-xs text-slate-500">Qtd. total descartada</p>
              <p className="text-xl font-bold text-orange-600">{data.meta.totalQty.toLocaleString('pt-BR', { maximumFractionDigits: 1 })}</p>
            </div>
            <div className="bg-white border border-slate-200 rounded-lg p-3">
              <p className="text-xs text-slate-500">Valor perdido (R$)</p>
              <p className="text-xl font-bold text-red-600">{data.meta.totalValor.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</p>
            </div>
          </div>

          {data.chart?.length > 0 && (
            <div className="bg-white border border-slate-200 rounded-lg p-4">
              <p className="text-xs font-semibold text-slate-600 mb-3">Perdas por mês (R$)</p>
              <ReportChart
                type="bar"
                data={data.chart}
                xKey="month"
                series={[{ key: 'value', label: 'Perda (R$)', color: '#dc2626' }]}
                valueFormatter={(v) => v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
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
