'use client';
import Link from 'next/link';
import { useState } from 'react';
import { useAuthStore } from '@/stores/auth-store';
import { canManageExchanges } from '@/lib/permissions';
import { useExchanges } from '@/hooks/use-exchanges';
import { useExternalPartners } from '@/hooks/use-external-partners';
import { EXCHANGE_STATUS_LABELS, ExchangeStatus } from '@farmagest/shared';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Plus, Eye } from 'lucide-react';

const STATUS_COLORS: Record<string, string> = {
  DRAFT: 'bg-slate-100 text-slate-600 border-0 text-xs',
  PENDING: 'bg-yellow-100 text-yellow-700 border-0 text-xs',
  APPROVED: 'bg-blue-100 text-blue-700 border-0 text-xs',
  REJECTED: 'bg-red-100 text-red-700 border-0 text-xs',
  READY: 'bg-indigo-100 text-indigo-700 border-0 text-xs',
  EXECUTED: 'bg-orange-100 text-orange-700 border-0 text-xs',
  COMPLETED: 'bg-green-100 text-green-700 border-0 text-xs',
  CANCELLED: 'bg-slate-100 text-slate-400 border-0 text-xs',
};

const R = (v: number) =>
  v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

export default function TrocasPage() {
  const user = useAuthStore((s) => s.user);
  const canManage = canManageExchanges(user);
  const [statusFilter, setStatusFilter] = useState('');
  const [partnerFilter, setPartnerFilter] = useState('');
  const [page, setPage] = useState(1);

  const { data, isLoading } = useExchanges({
    status: statusFilter || undefined,
    partnerId: partnerFilter || undefined,
    page: String(page),
  });
  const { data: partners } = useExternalPartners({ active: 'true', limit: 100 });

  return (
    <div className="p-6 space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-slate-900">Trocas Inter-Municipais</h1>
          <p className="text-slate-500 text-sm">Histórico de trocas com municípios parceiros</p>
        </div>
        {canManage && (
          <Link href="/trocas/novo">
            <Button size="sm" className="gap-1.5 bg-pmdc-blue hover:bg-pmdc-blue-dark text-white">
              <Plus size={16} /> Nova Troca
            </Button>
          </Link>
        )}
      </div>

      {/* Filtros */}
      <div className="flex gap-3 flex-wrap">
        <select
          value={statusFilter}
          onChange={(e) => { setStatusFilter(e.target.value); setPage(1); }}
          className="border rounded-md px-3 py-1.5 text-sm text-slate-700 bg-white"
        >
          <option value="">Todos os status</option>
          {Object.values(ExchangeStatus).map((s) => (
            <option key={s} value={s}>{EXCHANGE_STATUS_LABELS[s]}</option>
          ))}
        </select>
        <select
          value={partnerFilter}
          onChange={(e) => { setPartnerFilter(e.target.value); setPage(1); }}
          className="border rounded-md px-3 py-1.5 text-sm text-slate-700 bg-white"
        >
          <option value="">Todos os municípios</option>
          {partners?.data.map((p) => (
            <option key={p.id} value={p.id}>{p.name}</option>
          ))}
        </select>
      </div>

      <div className="bg-white rounded-lg border overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow className="bg-slate-50">
              <TableHead>Código</TableHead>
              <TableHead>Data</TableHead>
              <TableHead>Parceiro</TableHead>
              <TableHead className="text-right">Saída</TableHead>
              <TableHead className="text-right">Entrada</TableHead>
              <TableHead className="text-right">Dif. %</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="w-12" />
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading && (
              <TableRow>
                <TableCell colSpan={8} className="text-center py-12 text-slate-400">
                  Carregando...
                </TableCell>
              </TableRow>
            )}
            {!isLoading && data?.data.length === 0 && (
              <TableRow>
                <TableCell colSpan={8} className="text-center py-12 text-slate-400">
                  Nenhuma troca encontrada.
                </TableCell>
              </TableRow>
            )}
            {data?.data.map((ex) => (
              <TableRow key={ex.id}>
                <TableCell className="font-mono font-medium text-sm">{ex.code}</TableCell>
                <TableCell className="text-sm text-slate-500">
                  {new Date(ex.date).toLocaleDateString('pt-BR')}
                </TableCell>
                <TableCell>{ex.partner?.name ?? '—'}</TableCell>
                <TableCell className="text-right font-mono text-sm">{R(ex.totalOutput)}</TableCell>
                <TableCell className="text-right font-mono text-sm">{R(ex.totalInput)}</TableCell>
                <TableCell className="text-right text-sm">
                  <span className={ex.isBalanced ? 'text-green-600' : 'text-red-500'}>
                    {ex.differencePct}%
                  </span>
                </TableCell>
                <TableCell>
                  <Badge className={STATUS_COLORS[ex.status] ?? STATUS_COLORS.DRAFT}>
                    {EXCHANGE_STATUS_LABELS[ex.status as ExchangeStatus] ?? ex.status}
                  </Badge>
                </TableCell>
                <TableCell>
                  <Link href={`/trocas/${ex.id}`}>
                    <Button size="sm" variant="ghost" className="h-8 w-8 p-0">
                      <Eye size={14} />
                    </Button>
                  </Link>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      {data && data.totalPages > 1 && (
        <div className="flex items-center justify-between text-sm text-slate-500">
          <span>{data.total} trocas</span>
          <div className="flex gap-2">
            <Button size="sm" variant="outline" disabled={page === 1} onClick={() => setPage((p) => p - 1)}>
              Anterior
            </Button>
            <span className="px-2 py-1">{page} / {data.totalPages}</span>
            <Button size="sm" variant="outline" disabled={page === data.totalPages} onClick={() => setPage((p) => p + 1)}>
              Próxima
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
