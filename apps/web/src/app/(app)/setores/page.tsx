'use client';
import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { useSectors, useDeleteSector } from '@/hooks/use-sectors';
import { useAuthStore } from '@/stores/auth-store';
import { UserRole } from '@farmagest/shared';
import { PageHeader } from '@/components/shared/PageHeader';
import { EmptyState } from '@/components/shared/EmptyState';
import { ConfirmDialog } from '@/components/shared/ConfirmDialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Plus, Pencil, Trash2 } from 'lucide-react';

export default function SetoresPage() {
  const router = useRouter();
  const user = useAuthStore((s) => s.user);
  const canEdit = user?.role === UserRole.COORDINATION || user?.role === UserRole.MANAGER;

  const [search, setSearch] = useState('');
  const [deleteId, setDeleteId] = useState<string | null>(null);

  const { data, isLoading } = useSectors({ search: search || undefined });
  const deleteSector = useDeleteSector();

  async function handleDelete() {
    if (!deleteId) return;
    try {
      await deleteSector.mutateAsync(deleteId);
      toast.success('Setor desativado com sucesso');
    } catch (err: any) {
      toast.error(err.response?.data?.message ?? 'Erro ao excluir setor');
    } finally {
      setDeleteId(null);
    }
  }

  return (
    <div className="p-6">
      <PageHeader
        title="Setores"
        description={`${data?.total ?? 0} setores cadastrados`}
        action={
          canEdit && (
            <Link href="/setores/novo">
              <Button size="sm" className="bg-pmdc-blue hover:bg-pmdc-blue-dark text-white gap-1.5">
                <Plus size={16} /> Novo Setor
              </Button>
            </Link>
          )
        }
      />

      <div className="flex gap-3 mb-4">
        <Input
          placeholder="Buscar por nome ou código…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="max-w-xs"
        />
      </div>

      <div className="rounded-lg border bg-white overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow className="bg-slate-50">
              <TableHead>Nome</TableHead>
              <TableHead>Código</TableHead>
              <TableHead>Responsável</TableHead>
              <TableHead>Descrição</TableHead>
              <TableHead>Status</TableHead>
              {canEdit && <TableHead className="w-20" />}
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
            {data?.data.map((sector) => (
              <TableRow
                key={sector.id}
                className="cursor-pointer hover:bg-slate-50"
                onClick={() => router.push(`/setores/${sector.id}`)}
              >
                <TableCell className="font-medium">{sector.name}</TableCell>
                <TableCell>
                  <Badge variant="outline" className="font-mono text-xs">{sector.code}</Badge>
                </TableCell>
                <TableCell>{sector.responsible}</TableCell>
                <TableCell className="text-slate-500 max-w-xs truncate">
                  {sector.description ?? '—'}
                </TableCell>
                <TableCell>
                  <Badge
                    className={
                      sector.active
                        ? 'bg-status-success-bg text-status-success border-0'
                        : 'bg-slate-100 text-slate-500 border-0'
                    }
                  >
                    {sector.active ? 'Ativo' : 'Inativo'}
                  </Badge>
                </TableCell>
                {canEdit && (
                  <TableCell onClick={(e) => e.stopPropagation()}>
                    <div className="flex gap-1">
                      <Button
                        size="icon"
                        variant="ghost"
                        className="h-7 w-7"
                        onClick={() => router.push(`/setores/${sector.id}`)}
                      >
                        <Pencil size={14} />
                      </Button>
                      <Button
                        size="icon"
                        variant="ghost"
                        className="h-7 w-7 text-red-500 hover:text-red-700"
                        onClick={() => setDeleteId(sector.id)}
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
        title="Desativar setor"
        description="O setor será marcado como inativo. Certifique-se de que não há usuários ativos vinculados."
        confirmLabel="Desativar"
        loading={deleteSector.isPending}
      />
    </div>
  );
}
