'use client';
import { useState } from 'react';
import { ReportPage } from '@/components/reports/ReportPage';
import { ReportTable } from '@/components/reports/ReportTable';
import { ReportChart } from '@/components/reports/ReportChart';
import { useConsumptionByUnitReport, type ReportFilters } from '@/hooks/use-reports';

export default function ConsumoUnidadePage() {
  const [filters, setFilters] = useState<ReportFilters>({ preset: 'this_month' });
  const { data, isLoading } = useConsumptionByUnitReport(filters);

  return (
    <ReportPage
      title="R03 — Consumo por Unidade"
      description="Volume de abastecimento por unidade de saúde no período selecionado."
      apiPath="/reports/consumption/by-unit"
      pdfFilename="r03-consumo-por-unidade.pdf"
      excelFilename="r03-consumo-por-unidade.xlsx"
      filters={filters}
      onFiltersChange={setFilters}
      isLoading={isLoading}
    >
      {data && (
        <div className="space-y-4">
          <div className="bg-white border border-slate-200 rounded-lg p-3">
            <p className="text-xs text-slate-500">Unidades atendidas</p>
            <p className="text-xl font-bold text-slate-800">{data.meta.totalUnits}</p>
          </div>

          {data.chart?.length > 0 && (
            <div className="bg-white border border-slate-200 rounded-lg p-4">
              <p className="text-xs font-semibold text-slate-600 mb-3">Top 20 unidades por quantidade consumida</p>
              <ReportChart
                type="bar"
                data={data.chart}
                xKey="name"
                series={[{ key: 'qty', label: 'Qtd. consumida', color: '#059669' }]}
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
