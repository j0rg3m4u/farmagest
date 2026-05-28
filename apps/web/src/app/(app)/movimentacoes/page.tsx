'use client';
import { useState } from 'react';
import Link from 'next/link';
import { useMovements } from '@/hooks/use-movements';
import { useAuthStore } from '@/stores/auth-store';
import { MOVEMENT_TYPE_LABELS } from '@farmagest/shared';
import { PageHeader } from '@/components/shared/PageHeader';
import { EmptyState } from '@/components/shared/EmptyState';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { TrendingUp, TrendingDown, ArrowRightLeft } from 'lucide-react';

const ENTRY_TYPES = ['ENTRY_PURCHASE', 'ENTRY_EXCHANGE', 'ENTRY_ADJUSTMENT', 'ENTRY_RETURN'];

export default function MovimentacoesPage() {
  const user = useAuthStore((s) => s.user);
  const [typeFilter, setTypeFilter] = useState<string>('');
  const [page, setPage] = useState(1);

  const { data, isLoading } = useMovements({ type: typeFilter || undefined, page, limit: 30 });

  function movIcon(type: string) {
    if (ENTRY_TYPES.includes(type)) return <TrendingUp size={12} className="mr-1" />;
    return <TrendingDown size={12} className="mr-1" />;
  }

  function movClass(type: string) {
    return ENTRY_TYPES.includes(type)
      ? 'bg-green-50 text-green-700 border-0 text-xs'
      : 'bg-red-50 text-red-700 border-0 text-xs';
  }

  return (
    <div className="p-6">
      <PageHeader
        title="Movimentações"
        description={`${data?.total ?? 0} registros`}
        action={
          <Link href="/movimentacoes/saida">
            <Button size="sm" className="bg-pmdc-blue hover:bg-pmdc-blue-dark text-white gap-1.5">
              <ArrowRightLeft size={16} /> Nova Saída
            </Button>
          </Link>
        }
      />

      <div className="flex gap-3 mb-4">
        <Select value={typeFilter || 'all'} onValueChange={(v) => { setTypeFilter(!v || v === 'all' ? '' : v); setPage(1); }}>
          <SelectTrigger className="w-56">
            <SelectValue placeholder="Todos os tipos" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos os tipos</SelectItem>
            {Object.entries(MOVEMENT_TYPE_LABELS).map(([k, v]) => (
              <SelectItem key={k} value={k}>{v}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="rounded-lg border bg-white overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow className="bg-slate-50">
              <TableHead>Data</TableHead>
              <TableHead>Tipo</TableHead>
              <TableHead>Item</TableHead>
              <TableHead>Lote</TableHead>
              <TableHead className="text-right">Qtd</TableHead>
              <TableHead className="text-right">Saldo após</TableHead>
              <TableHead>Destino / Origem</TableHead>
              <TableHead>Registrado por</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading && (
              <TableRow>
                <TableCell colSpan={8} className="text-center py-8 text-slate-400">Carregando…</TableCell>
              </TableRow>
            )}
            {!isLoading && !data?.data.length && (
              <TableRow>
                <TableCell colSpan={8}><EmptyState /></TableCell>
              </TableRow>
            )}
            {data?.data.map((mov) => {
              const isEntry = ENTRY_TYPES.includes(mov.type);
              return (
                <TableRow key={mov.id}>
                  <TableCell className="text-xs text-slate-500 whitespace-nowrap">
                    {new Date(mov.createdAt).toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short' })}
                  </TableCell>
                  <TableCell>
                    <Badge className={movClass(mov.type)}>
                      {movIcon(mov.type)}
                      {MOVEMENT_TYPE_LABELS[mov.type as keyof typeof MOVEMENT_TYPE_LABELS] ?? mov.type}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <div className="text-sm font-medium">{mov.item?.description ?? '—'}</div>
                    <div className="text-xs text-slate-400 font-mono">{mov.item?.code}</div>
                  </TableCell>
                  <TableCell className="font-mono text-xs">{mov.lot?.lotNumber ?? '—'}</TableCell>
                  <TableCell className="text-right font-medium">
                    <span className={isEntry ? 'text-green-700' : 'text-red-700'}>
                      {isEntry ? '+' : '-'}{mov.quantity}
                    </span>
                  </TableCell>
                  <TableCell className="text-right text-slate-600">{mov.balanceAfter}</TableCell>
                  <TableCell className="text-xs text-slate-500">
                    {mov.unit?.name ?? mov.reason ?? '—'}
                  </TableCell>
                  <TableCell className="text-xs text-slate-500">{mov.createdBy?.name ?? '—'}</TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </div>

      {data && data.totalPages > 1 && (
        <div className="flex justify-end gap-2 mt-4">
          <Button variant="outline" size="sm" disabled={page === 1} onClick={() => setPage((p) => p - 1)}>
            Anterior
          </Button>
          <span className="text-sm text-slate-500 self-center">
            Página {page} de {data.totalPages}
          </span>
          <Button variant="outline" size="sm" disabled={page === data.totalPages} onClick={() => setPage((p) => p + 1)}>
            Próxima
          </Button>
        </div>
      )}
    </div>
  );
}
