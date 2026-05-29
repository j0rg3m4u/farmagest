'use client';
import { useState } from 'react';
import { ReportPage } from '@/components/reports/ReportPage';
import { ReportTable } from '@/components/reports/ReportTable';
import { ReportChart } from '@/components/reports/ReportChart';
import { useExchangesReport, type ReportFilters } from '@/hooks/use-reports';

export default function TrocasPage() {
  const [filters, setFilters] = useState<ReportFilters>({ preset: 'this_month' });
  const { data, isLoading } = useExchangesReport(filters);

  return (
    <ReportPage
      title="R06 — Trocas Intermunicipais"
      description="Trocas executadas com municípios parceiros — valores enviados, recebidos e saldo."
      apiPath="/reports/exchanges"
      pdfFilename="r06-trocas.pdf"
      excelFilename="r06-trocas.xlsx"
      filters={filters}
      onFiltersChange={setFilters}
      isLoading={isLoading}
    >
      {data && (
        <div className="space-y-4">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div className="bg-white border border-slate-200 rounded-lg p-3">
              <p className="text-xs text-slate-500">Total de trocas</p>
              <p className="text-xl font-bold text-slate-800">{data.meta.totalExchanges}</p>
            </div>
            <div className="bg-white border border-slate-200 rounded-lg p-3">
              <p className="text-xs text-slate-500">Valor enviado (R$)</p>
              <p className="text-xl font-bold text-red-600">{data.meta.totalEnviado.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</p>
            </div>
            <div className="bg-white border border-slate-200 rounded-lg p-3">
              <p className="text-xs text-slate-500">Valor recebido (R$)</p>
              <p className="text-xl font-bold text-green-700">{data.meta.totalRecebido.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</p>
            </div>
            <div className="bg-white border border-slate-200 rounded-lg p-3">
              <p className="text-xs text-slate-500">Saldo (R$)</p>
              <p className={`text-xl font-bold ${(data.meta.totalRecebido - data.meta.totalEnviado) >= 0 ? 'text-green-700' : 'text-red-600'}`}>
                {(data.meta.totalRecebido - data.meta.totalEnviado).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
              </p>
            </div>
          </div>

          {data.chart?.length > 0 && (
            <div className="bg-white border border-slate-200 rounded-lg p-4">
              <p className="text-xs font-semibold text-slate-600 mb-3">Trocas por mês (R$)</p>
              <ReportChart
                type="bar"
                data={data.chart}
                xKey="month"
                series={[
                  { key: 'enviado', label: 'Enviado (R$)', color: '#dc2626' },
                  { key: 'recebido', label: 'Recebido (R$)', color: '#059669' },
                ]}
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
