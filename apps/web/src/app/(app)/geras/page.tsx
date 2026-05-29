'use client';
import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { toast } from 'sonner';
import { useGeras, useCancelGera } from '@/hooks/use-geras';
import { useAuthStore } from '@/stores/auth-store';
import { canManageGeras, canDispatchGeras } from '@/lib/permissions';
import { GERA_STATUS_LABELS, GERA_TYPE_LABELS, GeraStatus, GeraType } from '@farmagest/shared';
import { PageHeader } from '@/components/shared/PageHeader';
import { EmptyState } from '@/components/shared/EmptyState';
import { ConfirmDialog } from '@/components/shared/ConfirmDialog';
import { Pagination } from '@/components/shared/Pagination';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table';
import { Plus, Upload, Eye } from 'lucide-react';

const STATUS_COLORS: Record<string, string> = {
  RECEIVED: 'bg-blue-50 text-blue-700 border-blue-200',
  TRIAGING: 'bg-yellow-50 text-yellow-700 border-yellow-200',
  COMPLETED: 'bg-purple-50 text-purple-700 border-purple-200',
  DISPATCHED: 'bg-green-50 text-green-700 border-green-200',
  CANCELLED: 'bg-slate-100 text-slate-500 border-slate-200',
};

export default function GerasPage() {
  const router = useRouter();
  const user = useAuthStore((s) => s.user);
  const canManage = canManageGeras(user);
  const canDispatch = canDispatchGeras(user);

  const [search, setSearch] = useState('');
  const [status, setStatus] = useState('');
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(20);
  const [cancelId, setCancelId] = useState<string | null>(null);

  const { data, isLoading } = useGeras({
    status: status || undefined,
    page: String(page),
    limit: String(limit),
  });

  const cancelMutation = useCancelGera(cancelId ?? '');

  async function handleCancel() {
    if (!cancelId) return;
    try {
      await cancelMutation.mutateAsync();
      toast.success('GERA cancelado');
    } catch (err: any) {
      toast.error(err.response?.data?.message ?? 'Erro ao cancelar');
    } finally {
      setCancelId(null);
    }
  }

  return (
    <div className="p-6">
      <PageHeader
        title="GERAs — Pedidos de Abastecimento"
        description={`${data?.total ?? 0} pedidos cadastrados`}
        action={
          canManage && (
            <div className="flex gap-2">
              <Link href="/geras/importar">
                <Button size="sm" variant="outline" className="gap-1.5">
                  <Upload size={16} /> Importar PDF
                </Button>
              </Link>
              <Link href="/geras/novo">
                <Button size="sm" className="bg-pmdc-blue hover:bg-pmdc-blue-dark text-white gap-1.5">
                  <Plus size={16} /> Registrar GERA
                </Button>
              </Link>
            </div>
          )
        }
      />

      <div className="flex gap-3 mb-4">
        <Select value={status} onValueChange={(v) => { setStatus(v ?? ''); setPage(1); }}>
          <SelectTrigger className="w-44">
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="">Todos</SelectItem>
            {Object.entries(GERA_STATUS_LABELS).map(([k, v]) => (
              <SelectItem key={k} value={k}>{v}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="rounded-lg border bg-white overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow className="bg-slate-50">
              <TableHead>Código</TableHead>
              <TableHead>Nº Pedido</TableHead>
              <TableHead>Unidade</TableHead>
              <TableHead>Tipo</TableHead>
              <TableHead>Data Pedido</TableHead>
              <TableHead>Itens</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="w-16" />
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading && (
              <TableRow>
                <TableCell colSpan={8} className="text-center py-8 text-slate-400">
                  Carregando…
                </TableCell>
              </TableRow>
            )}
            {!isLoading && !data?.data.length && (
              <TableRow>
                <TableCell colSpan={8}><EmptyState /></TableCell>
              </TableRow>
            )}
            {data?.data.map((gera) => (
              <TableRow
                key={gera.id}
                className="cursor-pointer hover:bg-slate-50"
                onClick={() => router.push(`/geras/${gera.id}`)}
              >
                <TableCell className="font-mono font-medium text-sm">{gera.code}</TableCell>
                <TableCell className="text-slate-500">{gera.externalNumber ?? '—'}</TableCell>
                <TableCell className="font-medium">{gera.unit?.name ?? '—'}</TableCell>
                <TableCell>
                  <Badge variant="outline">
                    {GERA_TYPE_LABELS[gera.type as GeraType]}
                  </Badge>
                </TableCell>
                <TableCell className="text-slate-500 text-sm">
                  {format(new Date(gera.requestedAt), 'dd/MM/yyyy', { locale: ptBR })}
                </TableCell>
                <TableCell className="text-slate-500 text-sm">
                  {gera._count?.items ?? 0}
                </TableCell>
                <TableCell>
                  <Badge className={`text-xs border ${STATUS_COLORS[gera.status] ?? ''}`}>
                    {GERA_STATUS_LABELS[gera.status as GeraStatus]}
                  </Badge>
                </TableCell>
                <TableCell onClick={(e) => e.stopPropagation()}>
                  <Button
                    size="icon"
                    variant="ghost"
                    className="h-7 w-7"
                    onClick={() => router.push(`/geras/${gera.id}`)}
                  >
                    <Eye size={14} />
                  </Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      {data && (
        <Pagination
          page={data.page}
          totalPages={data.totalPages}
          total={data.total}
          limit={data.limit}
          onPageChange={setPage}
          onLimitChange={(l) => { setLimit(l); setPage(1); }}
        />
      )}

      <ConfirmDialog
        open={!!cancelId}
        onClose={() => setCancelId(null)}
        onConfirm={handleCancel}
        title="Cancelar GERA"
        description="O GERA será marcado como cancelado. Esta ação não pode ser desfeita."
        confirmLabel="Cancelar GERA"
        loading={cancelMutation.isPending}
      />
    </div>
  );
}
