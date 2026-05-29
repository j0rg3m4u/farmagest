'use client';
import { useState } from 'react';
import { ReportPage } from '@/components/reports/ReportPage';
import { ReportTable } from '@/components/reports/ReportTable';
import { ReportChart } from '@/components/reports/ReportChart';
import { useGerasReport, type ReportFilters } from '@/hooks/use-reports';

export default function GerasReportPage() {
  const [filters, setFilters] = useState<ReportFilters>({ preset: 'this_month' });
  const { data, isLoading } = useGerasReport(filters);

  return (
    <ReportPage
      title="R07 — Atendimento de GERAs"
      description="Taxa de atendimento de pedidos GERA por unidade e período."
      apiPath="/reports/geras"
      pdfFilename="r07-geras.pdf"
      excelFilename="r07-geras.xlsx"
      filters={filters}
      onFiltersChange={setFilters}
      isLoading={isLoading}
    >
      {data && (
        <div className="space-y-4">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div className="bg-white border border-slate-200 rounded-lg p-3">
              <p className="text-xs text-slate-500">GERAs no período</p>
              <p className="text-xl font-bold text-slate-800">{data.meta.totalGeras}</p>
            </div>
            <div className="bg-white border border-green-200 rounded-lg p-3">
              <p className="text-xs text-green-600">Taxa de atendimento</p>
              <p className="text-xl font-bold text-green-700">{data.meta.taxaGeral.toFixed(1)}%</p>
            </div>
          </div>

          {data.chart?.length > 0 && (
            <div className="bg-white border border-slate-200 rounded-lg p-4">
              <p className="text-xs font-semibold text-slate-600 mb-3">Distribuição de atendimento</p>
              <ReportChart
                type="pie"
                data={data.chart}
                xKey="name"
                series={[{ key: 'value', label: 'Itens' }]}
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
