'use client';
import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { useUsers, useDeleteUser } from '@/hooks/use-users';
import { useUnits } from '@/hooks/use-units';
import { useAuthStore } from '@/stores/auth-store';
import { USER_ROLE_LABELS, UserRole } from '@farmagest/shared';
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

export default function UsuariosPage() {
  const router = useRouter();
  const user = useAuthStore((s) => s.user);
  const canManageUsers = user?.role === 'COORDINATION' || user?.role === 'MANAGER';

  const [search, setSearch] = useState('');
  const [role, setRole] = useState('');
  const [deleteId, setDeleteId] = useState<string | null>(null);

  const { data, isLoading } = useUsers({ search: search || undefined, role: role || undefined });
  const { data: unitsData } = useUnits({ limit: 100 });
  const deleteUser = useDeleteUser();

  const unitMap = Object.fromEntries((unitsData?.data ?? []).map((u) => [u.id, u.name]));

  async function handleDelete() {
    if (!deleteId) return;
    try {
      await deleteUser.mutateAsync(deleteId);
      toast.success('Usuário desativado com sucesso');
    } catch (err: any) {
      toast.error(err.response?.data?.message ?? 'Erro ao excluir usuário');
    } finally {
      setDeleteId(null);
    }
  }

  return (
    <div className="p-6">
      <PageHeader
        title="Usuários"
        description={`${data?.total ?? 0} usuários cadastrados`}
        action={
          canManageUsers && (
            <Link href="/usuarios/novo">
              <Button size="sm" className="bg-pmdc-blue hover:bg-pmdc-blue-dark text-white gap-1.5">
                <Plus size={16} /> Novo Usuário
              </Button>
            </Link>
          )
        }
      />

      {/* Filtros */}
      <div className="flex gap-3 mb-4">
        <Input
          placeholder="Buscar por nome ou e-mail…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="max-w-xs"
        />
        <Select value={role} onValueChange={(v) => setRole(v ?? '')}>
          <SelectTrigger className="w-44">
            <SelectValue placeholder="Perfil" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="">Todos</SelectItem>
            {Object.entries(USER_ROLE_LABELS).map(([k, v]) => (
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
              <TableHead>E-mail</TableHead>
              <TableHead>Perfil</TableHead>
              <TableHead>Unidade</TableHead>
              <TableHead>Status</TableHead>
              {canManageUsers && <TableHead className="w-20" />}
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
            {data?.data.map((u) => (
              <TableRow
                key={u.id}
                className="cursor-pointer hover:bg-slate-50"
                onClick={() => router.push(`/usuarios/${u.id}`)}
              >
                <TableCell className="font-medium">{u.name}</TableCell>
                <TableCell className="text-slate-500 text-sm">{u.email}</TableCell>
                <TableCell>
                  <Badge variant="outline">{USER_ROLE_LABELS[u.role as UserRole]}</Badge>
                </TableCell>
                <TableCell className="text-slate-500 text-sm">
                  {u.unitId ? (unitMap[u.unitId] ?? u.unitId) : '—'}
                </TableCell>
                <TableCell>
                  <Badge className={u.active ? 'bg-status-success-bg text-status-success border-0' : 'bg-slate-100 text-slate-500 border-0'}>
                    {u.active ? 'Ativo' : 'Inativo'}
                  </Badge>
                </TableCell>
                {canManageUsers && (
                  <TableCell onClick={(e) => e.stopPropagation()}>
                    <div className="flex gap-1">
                      <Button
                        size="icon"
                        variant="ghost"
                        className="h-7 w-7"
                        onClick={() => router.push(`/usuarios/${u.id}`)}
                      >
                        <Pencil size={14} />
                      </Button>
                      {user?.id !== u.id && (
                        <Button
                          size="icon"
                          variant="ghost"
                          className="h-7 w-7 text-red-500 hover:text-red-700"
                          onClick={() => setDeleteId(u.id)}
                        >
                          <Trash2 size={14} />
                        </Button>
                      )}
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
        title="Desativar usuário"
        description="O usuário perderá acesso ao sistema. Esta ação pode ser revertida editando o usuário."
        confirmLabel="Desativar"
        loading={deleteUser.isPending}
      />
    </div>
  );
}
