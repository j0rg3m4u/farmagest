'use client';
import { useState } from 'react';
import { ReportPage } from '@/components/reports/ReportPage';
import { ReportTable } from '@/components/reports/ReportTable';
import { ReportChart } from '@/components/reports/ReportChart';
import { useConsumptionByItemReport, type ReportFilters } from '@/hooks/use-reports';

export default function ConsumoItemPage() {
  const [filters, setFilters] = useState<ReportFilters>({ preset: 'this_month' });
  const { data, isLoading } = useConsumptionByItemReport(filters);

  return (
    <ReportPage
      title="R02 — Consumo por Item"
      description="Top itens mais consumidos com consumo médio diário e valor financeiro total."
      apiPath="/reports/consumption/by-item"
      pdfFilename="r02-consumo-por-item.pdf"
      excelFilename="r02-consumo-por-item.xlsx"
      filters={filters}
      onFiltersChange={setFilters}
      isLoading={isLoading}
    >
      {data && (
        <div className="space-y-4">
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            <div className="bg-white border border-slate-200 rounded-lg p-3">
              <p className="text-xs text-slate-500">Itens consumidos</p>
              <p className="text-xl font-bold text-slate-800">{data.meta.totalItems}</p>
            </div>
            <div className="bg-white border border-slate-200 rounded-lg p-3">
              <p className="text-xs text-slate-500">Qtd. total consumida</p>
              <p className="text-xl font-bold text-slate-800">{data.meta.totalQty.toLocaleString('pt-BR', { maximumFractionDigits: 1 })}</p>
            </div>
            <div className="bg-white border border-slate-200 rounded-lg p-3">
              <p className="text-xs text-slate-500">Valor total (R$)</p>
              <p className="text-xl font-bold text-slate-800">{data.meta.totalValor.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</p>
            </div>
          </div>

          {data.chart?.length > 0 && (
            <div className="bg-white border border-slate-200 rounded-lg p-4">
              <p className="text-xs font-semibold text-slate-600 mb-3">Top 20 itens por quantidade consumida</p>
              <ReportChart
                type="bar"
                data={data.chart}
                xKey="name"
                series={[{ key: 'qty', label: 'Qtd. consumida', color: '#1d4ed8' }]}
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
