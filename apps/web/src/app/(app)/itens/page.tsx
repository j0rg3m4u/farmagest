'use client';
import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { useItems, useDeleteItem, useResetItems } from '@/hooks/use-items';
import { useAuthStore } from '@/stores/auth-store';
import { ITEM_CATEGORY_LABELS, ItemCategory } from '@farmagest/shared';
import { canCreateItems, canDeleteItems, hasGlobalView } from '@/lib/permissions';
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
import { Plus, Pencil, Trash2, AlertTriangle, Eraser } from 'lucide-react';
import { Pagination } from '@/components/shared/Pagination';

export default function ItensPage() {
  const router = useRouter();
  const user = useAuthStore((s) => s.user);
  const isGlobal = hasGlobalView(user);
  const canCreate = canCreateItems(user);
  const canDelete = canDeleteItems(user);

  const [search, setSearch] = useState('');
  const [category, setCategory] = useState('');
  const [controlled344, setControlled344] = useState('');
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [confirmReset, setConfirmReset] = useState(false);
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(50);

  const { data, isLoading } = useItems({
    search: search || undefined,
    category: category || undefined,
    controlled344: controlled344 || undefined,
    page,
    limit,
  });
  const deleteItem = useDeleteItem();
  const resetItems = useResetItems();

  async function handleReset() {
    try {
      const res = await resetItems.mutateAsync();
      toast.success(`${res.deleted} itens removidos com sucesso`);
    } catch (err: any) {
      toast.error(err.response?.data?.message ?? 'Erro ao limpar itens');
    } finally {
      setConfirmReset(false);
    }
  }

  async function handleDelete() {
    if (!deleteId) return;
    try {
      await deleteItem.mutateAsync(deleteId);
      toast.success('Item desativado com sucesso');
    } catch (err: any) {
      toast.error(err.response?.data?.message ?? 'Erro ao desativar item');
    } finally {
      setDeleteId(null);
    }
  }

  return (
    <div className="p-6">
      <PageHeader
        title="Itens"
        description={`${data?.total ?? 0} itens cadastrados`}
        action={
          <div className="flex gap-2">
            {isGlobal && (
              <Button
                size="sm"
                variant="outline"
                className="border-red-300 text-red-600 hover:bg-red-50 gap-1.5"
                onClick={() => setConfirmReset(true)}
              >
                <Eraser size={16} /> Limpar todos
              </Button>
            )}
            {canCreate && (
              <Link href="/itens/novo">
                <Button size="sm" className="bg-pmdc-blue hover:bg-pmdc-blue-dark text-white gap-1.5">
                  <Plus size={16} /> Novo Item
                </Button>
              </Link>
            )}
          </div>
        }
      />

      <div className="flex gap-3 mb-4 flex-wrap">
        <Input
          placeholder="Buscar por código, descrição ou fabricante…"
          value={search}
          onChange={(e) => { setSearch(e.target.value); setPage(1); }}
          className="max-w-xs"
        />
        <Select value={category} onValueChange={(v) => { setCategory(v ?? ''); setPage(1); }}>
          <SelectTrigger className="w-44">
            <SelectValue placeholder="Categoria" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="">Todas</SelectItem>
            {Object.entries(ITEM_CATEGORY_LABELS).map(([k, v]) => (
              <SelectItem key={k} value={k}>{v}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={controlled344} onValueChange={(v) => { setControlled344(v ?? ''); setPage(1); }}>
          <SelectTrigger className="w-40">
            <SelectValue placeholder="Portaria 344" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="">Todos</SelectItem>
            <SelectItem value="true">Controlados</SelectItem>
            <SelectItem value="false">Não controlados</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="rounded-lg border bg-white overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow className="bg-slate-50">
              <TableHead className="font-mono">Código</TableHead>
              <TableHead>Descrição</TableHead>
              <TableHead>Categoria</TableHead>
              <TableHead>Unidade</TableHead>
              <TableHead>Fabricante</TableHead>
              {isGlobal && <TableHead>Setor</TableHead>}
              <TableHead>Status</TableHead>
              {canDelete && <TableHead className="w-20" />}
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
                <TableCell colSpan={8}>
                  <EmptyState />
                </TableCell>
              </TableRow>
            )}
            {data?.data.map((item) => (
              <TableRow
                key={item.id}
                className="cursor-pointer hover:bg-slate-50"
                onClick={() => router.push(`/itens/${item.id}`)}
              >
                <TableCell className="font-mono text-sm font-medium text-slate-700">
                  <span className="flex items-center gap-1.5">
                    {item.code}
                    {item.controlled344 && (
                      <AlertTriangle size={13} className="text-amber-500" aria-label="Portaria 344/98" />
                    )}
                  </span>
                </TableCell>
                <TableCell className="max-w-xs">{item.description}</TableCell>
                <TableCell>
                  <Badge
                    className={
                      item.category === ItemCategory.MEDICATION
                        ? 'bg-blue-50 text-blue-700 border-blue-200'
                        : 'bg-teal-50 text-teal-700 border-teal-200'
                    }
                  >
                    {ITEM_CATEGORY_LABELS[item.category as ItemCategory]}
                  </Badge>
                </TableCell>
                <TableCell className="text-slate-500 text-sm">{item.unitOfMeasure}</TableCell>
                <TableCell className="text-slate-500">{item.manufacturer ?? '—'}</TableCell>
                {isGlobal && (
                  <TableCell>
                    <Badge variant="outline" className="font-mono text-xs">
                      {item.sector?.code}
                    </Badge>
                  </TableCell>
                )}
                <TableCell>
                  <Badge
                    className={
                      item.active
                        ? 'bg-status-success-bg text-status-success border-0'
                        : 'bg-slate-100 text-slate-500 border-0'
                    }
                  >
                    {item.active ? 'Ativo' : 'Inativo'}
                  </Badge>
                </TableCell>
                {canDelete && (
                  <TableCell onClick={(e) => e.stopPropagation()}>
                    <div className="flex gap-1">
                      <Button
                        size="icon"
                        variant="ghost"
                        className="h-7 w-7"
                        onClick={() => router.push(`/itens/${item.id}`)}
                      >
                        <Pencil size={14} />
                      </Button>
                      <Button
                        size="icon"
                        variant="ghost"
                        className="h-7 w-7 text-red-500 hover:text-red-700"
                        onClick={() => setDeleteId(item.id)}
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
        open={!!deleteId}
        onClose={() => setDeleteId(null)}
        onConfirm={handleDelete}
        title="Desativar item"
        description="O item será marcado como inativo. Esta ação não exclui os lotes associados."
        confirmLabel="Desativar"
        loading={deleteItem.isPending}
      />

      <ConfirmDialog
        open={confirmReset}
        onClose={() => setConfirmReset(false)}
        onConfirm={handleReset}
        title="Limpar todos os itens"
        description="Todos os itens serão removidos permanentemente e as sequências dos setores serão zeradas. Esta ação não pode ser desfeita."
        confirmLabel="Limpar tudo"
        loading={resetItems.isPending}
      />
    </div>
  );
}
