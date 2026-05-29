'use client';
import { useState } from 'react';
import { PeriodPicker } from '@/components/reports/PeriodPicker';
import { ReportChart } from '@/components/reports/ReportChart';
import { PageHeader } from '@/components/shared/PageHeader';
import { useExecutiveReport, type ReportFilters } from '@/hooks/use-reports';
import { useAuthStore } from '@/stores/auth-store';
import { redirect } from 'next/navigation';

function KpiCard({ label, value, sub }: { label: string; value: string; sub?: string }) {
  return (
    <div className="bg-white border border-slate-200 rounded-lg p-4">
      <p className="text-xs text-slate-500">{label}</p>
      <p className="text-xl font-bold text-slate-800 mt-0.5">{value}</p>
      {sub && <p className="text-xs text-slate-400 mt-0.5">{sub}</p>}
    </div>
  );
}

export default function ExecutivoPage() {
  const user = useAuthStore((s) => s.user);
  const [filters, setFilters] = useState<ReportFilters>({ preset: 'this_month' });
  const { data, isLoading } = useExecutiveReport(filters);

  if (user && user.role !== 'MANAGER') {
    redirect('/relatorios');
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="R09 — Painel Executivo"
        description="Visão consolidada de todos os setores para a gestão municipal."
      />

      <div className="bg-white border border-slate-200 rounded-lg p-4">
        <p className="text-xs font-medium text-slate-500 mb-2">Período</p>
        <PeriodPicker value={filters} onChange={setFilters} />
      </div>

      {isLoading && (
        <div className="flex items-center justify-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" />
        </div>
      )}

      {data && (
        <div className="space-y-6">
          {/* KPIs */}
          <div>
            <h2 className="text-sm font-semibold text-slate-700 mb-3">KPIs do Período</h2>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <KpiCard label="Total entradas" value={data.kpis.totalEntradasFmt} />
              <KpiCard label="Total saídas" value={data.kpis.totalSaidasFmt} />
              <KpiCard label="Perdas" value={data.kpis.totalPerdasFmt} />
              <KpiCard label="Trocas" value={data.kpis.totalTrocasFmt} />
            </div>
          </div>

          {/* Estoque crítico por setor */}
          <div>
            <h2 className="text-sm font-semibold text-slate-700 mb-3">Estoque Crítico por Setor</h2>
            <div className="bg-white border border-slate-200 rounded-lg divide-y divide-slate-100">
              {data.sectorCritical.map((s: any) => (
                <div key={s.setor} className="flex items-center justify-between px-4 py-3">
                  <span className="text-sm font-medium text-slate-700">{s.setor}</span>
                  <div className="flex gap-4 text-xs">
                    <span className="text-red-600 font-medium">{s.zerados} zerados</span>
                    <span className="text-orange-500 font-medium">{s.criticos} críticos</span>
                    <span className="text-slate-400">{s.total} total</span>
                  </div>
                </div>
              ))}
              {data.sectorCritical.length === 0 && (
                <p className="text-sm text-slate-500 px-4 py-3">Nenhum setor registrado.</p>
              )}
            </div>
          </div>

          {/* Validades em risco */}
          <div>
            <h2 className="text-sm font-semibold text-slate-700 mb-3">Validades em Risco</h2>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <KpiCard label="Vence em ≤30 dias" value={data.expirationRisk.risco30Fmt} sub="Crítico" />
              <KpiCard label="Vence em 31–60 dias" value={data.expirationRisk.risco60Fmt} sub="Atenção" />
              <KpiCard label="Vence em 61–90 dias" value={data.expirationRisk.risco90Fmt} sub="Alerta" />
            </div>
          </div>

          {/* Taxa de atendimento GERAs */}
          <div>
            <h2 className="text-sm font-semibold text-slate-700 mb-3">Taxa de Atendimento de GERAs</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="grid grid-cols-2 gap-3">
                <KpiCard label="Total de itens" value={String(data.geraAttendance.total)} />
                <KpiCard label="Taxa de atendimento" value={`${data.geraAttendance.taxaAtendimento}%`} />
                <KpiCard label="Integral" value={String(data.geraAttendance.atendidos)} />
                <KpiCard label="Parcial / Negado" value={`${data.geraAttendance.parciais} / ${data.geraAttendance.negados}`} />
              </div>
              {data.geraAttendance.chart?.length > 0 && (
                <div className="bg-white border border-slate-200 rounded-lg p-4">
                  <ReportChart
                    type="pie"
                    data={data.geraAttendance.chart}
                    xKey="name"
                    series={[{ key: 'value', label: 'Itens' }]}
                    height={160}
                  />
                </div>
              )}
            </div>
          </div>

          {/* Top 5 itens */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <h2 className="text-sm font-semibold text-slate-700 mb-3">Top 5 Itens mais Consumidos</h2>
              <div className="bg-white border border-slate-200 rounded-lg divide-y divide-slate-100">
                {data.topItems.map((item: any, i: number) => (
                  <div key={i} className="flex items-center justify-between px-4 py-2.5">
                    <div>
                      <span className="text-xs text-slate-400 mr-2">{item.codigo}</span>
                      <span className="text-sm text-slate-700">{item.item}</span>
                    </div>
                    <span className="text-sm font-semibold text-blue-700">
                      {item.quantidade.toLocaleString('pt-BR', { maximumFractionDigits: 1 })}
                    </span>
                  </div>
                ))}
                {data.topItems.length === 0 && <p className="text-sm text-slate-500 px-4 py-3">Sem dados.</p>}
              </div>
            </div>

            <div>
              <h2 className="text-sm font-semibold text-slate-700 mb-3">Top 5 Unidades por GERAs</h2>
              <div className="bg-white border border-slate-200 rounded-lg divide-y divide-slate-100">
                {data.topUnits.map((u: any, i: number) => (
                  <div key={i} className="flex items-center justify-between px-4 py-2.5">
                    <span className="text-sm text-slate-700">{u.unidade}</span>
                    <span className="text-sm font-semibold text-blue-700">{u.geras} GERAs</span>
                  </div>
                ))}
                {data.topUnits.length === 0 && <p className="text-sm text-slate-500 px-4 py-3">Sem dados.</p>}
              </div>
            </div>
          </div>

          {/* Evolução do estoque */}
          {data.stockEvolution?.length > 0 && (
            <div>
              <h2 className="text-sm font-semibold text-slate-700 mb-3">Evolução do Estoque (semanal, R$)</h2>
              <div className="bg-white border border-slate-200 rounded-lg p-4">
                <ReportChart
                  type="line"
                  data={data.stockEvolution}
                  xKey="week"
                  series={[{ key: 'delta', label: 'Δ Estoque (R$)', color: '#1d4ed8' }]}
                  valueFormatter={(v) => v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                />
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
