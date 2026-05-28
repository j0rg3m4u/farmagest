'use client';
import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { useUnits, useDeleteUnit } from '@/hooks/use-units';
import { useAuthStore } from '@/stores/auth-store';
import { UNIT_TYPE_LABELS, UnitType } from '@farmagest/shared';
import { canManageUnits } from '@/lib/permissions';
import { PageHeader } from '@/components/shared/PageHeader';
import { EmptyState } from '@/components/shared/EmptyState';
import { ConfirmDialog } from '@/components/shared/ConfirmDialog';
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
import { Plus, Pencil, Trash2 } from 'lucide-react';

export default function UnidadesPage() {
  const router = useRouter();
  const user = useAuthStore((s) => s.user);
  const canManage = canManageUnits(user);

  const [search, setSearch] = useState('');
  const [type, setType] = useState('');
  const [deleteId, setDeleteId] = useState<string | null>(null);

  const { data, isLoading } = useUnits({ search: search || undefined, type: type || undefined });
  const deleteUnit = useDeleteUnit();

  async function handleDelete() {
    if (!deleteId) return;
    try {
      await deleteUnit.mutateAsync(deleteId);
      toast.success('Unidade desativada com sucesso');
    } catch (err: any) {
      toast.error(err.response?.data?.message ?? 'Erro ao excluir unidade');
    } finally {
      setDeleteId(null);
    }
  }

  return (
    <div className="p-6">
      <PageHeader
        title="Unidades de Saúde"
        description={`${data?.total ?? 0} unidades cadastradas`}
        action={
          canManage && (
            <Link href="/unidades/novo">
              <Button size="sm" className="bg-pmdc-blue hover:bg-pmdc-blue-dark text-white gap-1.5">
                <Plus size={16} /> Nova Unidade
              </Button>
            </Link>
          )
        }
      />

      {/* Filtros */}
      <div className="flex gap-3 mb-4">
        <Input
          placeholder="Buscar por nome…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="max-w-xs"
        />
        <Select value={type} onValueChange={(v) => setType(v ?? '')}>
          <SelectTrigger className="w-40">
            <SelectValue placeholder="Tipo" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="">Todos</SelectItem>
            {Object.entries(UNIT_TYPE_LABELS).map(([k, v]) => (
              <SelectItem key={k} value={k}>{v}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Tabela */}
      <div className="rounded-lg border bg-white overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow className="bg-slate-50">
              <TableHead>Nome</TableHead>
              <TableHead>Tipo</TableHead>
              <TableHead>Responsável</TableHead>
              <TableHead>Contato</TableHead>
              <TableHead>Status</TableHead>
              {canManage && <TableHead className="w-20" />}
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading && (
              <TableRow>
                <TableCell colSpan={6} className="text-center py-8 text-slate-400">
                  Carregando…
                </TableCell>
              </TableRow>
            )}
            {!isLoading && !data?.data.length && (
              <TableRow>
                <TableCell colSpan={6}>
                  <EmptyState />
                </TableCell>
              </TableRow>
            )}
            {data?.data.map((unit) => (
              <TableRow
                key={unit.id}
                className="cursor-pointer hover:bg-slate-50"
                onClick={() => router.push(`/unidades/${unit.id}`)}
              >
                <TableCell className="font-medium">{unit.name}</TableCell>
                <TableCell>
                  <Badge variant="outline">{UNIT_TYPE_LABELS[unit.type as UnitType]}</Badge>
                </TableCell>
                <TableCell>{unit.responsible}</TableCell>
                <TableCell className="text-slate-500">{unit.contact ?? '—'}</TableCell>
                <TableCell>
                  <Badge className={unit.active ? 'bg-status-success-bg text-status-success border-0' : 'bg-slate-100 text-slate-500 border-0'}>
                    {unit.active ? 'Ativa' : 'Inativa'}
                  </Badge>
                </TableCell>
                {canManage && (
                  <TableCell onClick={(e) => e.stopPropagation()}>
                    <div className="flex gap-1">
                      <Button
                        size="icon"
                        variant="ghost"
                        className="h-7 w-7"
                        onClick={() => router.push(`/unidades/${unit.id}`)}
                      >
                        <Pencil size={14} />
                      </Button>
                      <Button
                        size="icon"
                        variant="ghost"
                        className="h-7 w-7 text-red-500 hover:text-red-700"
                        onClick={() => setDeleteId(unit.id)}
                      >
                        <Trash2 size={14} />
                      </Button>
                    </div>
                  </TableCell>
                )}
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      <ConfirmDialog
        open={!!deleteId}
        onClose={() => setDeleteId(null)}
        onConfirm={handleDelete}
        title="Desativar unidade"
        description="A unidade será marcada como inativa. Certifique-se de que não há usuários ativos vinculados."
        confirmLabel="Desativar"
        loading={deleteUnit.isPending}
      />
    </div>
  );
}
