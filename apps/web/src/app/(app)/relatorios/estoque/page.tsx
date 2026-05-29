'use client';
import { useState } from 'react';
import { ReportPage } from '@/components/reports/ReportPage';
import { ReportTable } from '@/components/reports/ReportTable';
import { ReportChart } from '@/components/reports/ReportChart';
import { useStockPositionReport, type ReportFilters } from '@/hooks/use-reports';

const SITUACAO_COLORS: Record<string, string> = {
  Zerado: 'text-red-600',
  Crítico: 'text-orange-500',
  Normal: 'text-green-700',
  Excesso: 'text-blue-600',
};

export default function EstoquePage() {
  const [filters, setFilters] = useState<ReportFilters>({});
  const { data, isLoading } = useStockPositionReport(filters);

  return (
    <ReportPage
      title="R08 — Posição de Estoque"
      description="Visão atual do estoque com situação, lotes ativos, saldo e valor financeiro."
      apiPath="/reports/stock-position"
      pdfFilename="r08-estoque.pdf"
      excelFilename="r08-estoque.xlsx"
      filters={filters}
      onFiltersChange={setFilters}
      showPeriodPicker={false}
      isLoading={isLoading}
    >
      {data && (
        <div className="space-y-4">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {[
              { label: 'Total de itens', value: data.meta.totalItems, color: 'text-slate-800' },
              { label: 'Zerados', value: data.meta.zerados, color: SITUACAO_COLORS['Zerado'] },
              { label: 'Críticos', value: data.meta.criticos, color: SITUACAO_COLORS['Crítico'] },
              { label: 'Em excesso', value: data.meta.excesso, color: SITUACAO_COLORS['Excesso'] },
            ].map((kpi) => (
              <div key={kpi.label} className="bg-white border border-slate-200 rounded-lg p-3">
                <p className="text-xs text-slate-500">{kpi.label}</p>
                <p className={`text-xl font-bold ${kpi.color}`}>{kpi.value}</p>
              </div>
            ))}
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="bg-white border border-slate-200 rounded-lg p-3">
              <p className="text-xs text-slate-500">Valor total em estoque</p>
              <p className="text-2xl font-bold text-slate-800">
                {data.meta.totalValorEstoque.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
              </p>
              {data.meta.semValor > 0 && (
                <p className="text-xs text-orange-500 mt-1">{data.meta.semValor} item(ns) sem valor unitário cadastrado</p>
              )}
            </div>

            {data.chart?.length > 0 && (
              <div className="bg-white border border-slate-200 rounded-lg p-4">
                <p className="text-xs font-semibold text-slate-600 mb-2">Distribuição por situação</p>
                <ReportChart
                  type="pie"
                  data={data.chart}
                  xKey="name"
                  series={[{ key: 'value', label: 'Itens' }]}
                  height={150}
                />
              </div>
            )}
          </div>

          <div className="bg-white border border-slate-200 rounded-lg p-4">
            <ReportTable rows={data.rows} maxRows={300} />
          </div>
        </div>
      )}
    </ReportPage>
  );
}
