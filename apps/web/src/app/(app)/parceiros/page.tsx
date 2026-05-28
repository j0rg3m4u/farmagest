'use client';
import Link from 'next/link';
import { useState } from 'react';
import { useAuthStore } from '@/stores/auth-store';
import { canManageExternalPartners, canDeleteExternalPartners } from '@/lib/permissions';
import { useExternalPartners, useDeleteExternalPartner } from '@/hooks/use-external-partners';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Plus, Search, Pencil, Trash2 } from 'lucide-react';

export default function ParceirosPage() {
  const user = useAuthStore((s) => s.user);
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const canManage = canManageExternalPartners(user);
  const canDelete = canDeleteExternalPartners(user);

  const { data, isLoading } = useExternalPartners({ search: search || undefined, page });
  const deleteMutation = useDeleteExternalPartner();

  function handleDelete(id: string, name: string) {
    if (!confirm(`Excluir "${name}"? Esta ação não pode ser desfeita.`)) return;
    deleteMutation.mutate(id);
  }

  return (
    <div className="p-6 space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-slate-900">Municípios Parceiros</h1>
          <p className="text-slate-500 text-sm">Municípios para trocas inter-municipais</p>
        </div>
        {canManage && (
          <Link href="/parceiros/novo">
            <Button size="sm" className="gap-1.5 bg-pmdc-blue hover:bg-pmdc-blue-dark text-white">
              <Plus size={16} /> Novo Município
            </Button>
          </Link>
        )}
      </div>

      <div className="relative max-w-sm">
        <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
        <Input
          placeholder="Buscar por nome ou responsável..."
          value={search}
          onChange={(e) => { setSearch(e.target.value); setPage(1); }}
          className="pl-9"
        />
      </div>

      <div className="bg-white rounded-lg border overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow className="bg-slate-50">
              <TableHead>Nome</TableHead>
              <TableHead>CNPJ</TableHead>
              <TableHead>Responsável</TableHead>
              <TableHead>Contato</TableHead>
              <TableHead>Status</TableHead>
              {(canManage || canDelete) && <TableHead className="w-24" />}
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading && (
              <TableRow>
                <TableCell colSpan={6} className="text-center py-12 text-slate-400">
                  Carregando...
                </TableCell>
              </TableRow>
            )}
            {!isLoading && data?.data.length === 0 && (
              <TableRow>
                <TableCell colSpan={6} className="text-center py-12 text-slate-400">
                  Nenhum município encontrado.
                </TableCell>
              </TableRow>
            )}
            {data?.data.map((partner) => (
              <TableRow key={partner.id}>
                <TableCell className="font-medium">{partner.name}</TableCell>
                <TableCell className="font-mono text-sm text-slate-500">
                  {partner.cnpj || '—'}
                </TableCell>
                <TableCell>{partner.responsibleName || '—'}</TableCell>
                <TableCell className="text-sm text-slate-500">{partner.contact || '—'}</TableCell>
                <TableCell>
                  <Badge
                    className={
                      partner.active
                        ? 'bg-green-100 text-green-700 border-0 text-xs'
                        : 'bg-slate-100 text-slate-500 border-0 text-xs'
                    }
                  >
                    {partner.active ? 'Ativo' : 'Inativo'}
                  </Badge>
                </TableCell>
                {(canManage || canDelete) && (
                  <TableCell>
                    <div className="flex gap-1 justify-end">
                      {canManage && (
                        <Link href={`/parceiros/${partner.id}`}>
                          <Button size="sm" variant="ghost" className="h-8 w-8 p-0">
                            <Pencil size={14} />
                          </Button>
                        </Link>
                      )}
                      {canDelete && (
                        <Button
                          size="sm"
                          variant="ghost"
                          className="h-8 w-8 p-0 text-red-500 hover:text-red-700"
                          onClick={() => handleDelete(partner.id, partner.name)}
                          disabled={deleteMutation.isPending}
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

      {data && data.totalPages > 1 && (
        <div className="flex items-center justify-between text-sm text-slate-500">
          <span>{data.total} municípios</span>
          <div className="flex gap-2">
            <Button
              size="sm"
              variant="outline"
              disabled={page === 1}
              onClick={() => setPage((p) => p - 1)}
            >
              Anterior
            </Button>
            <span className="px-2 py-1">
              {page} / {data.totalPages}
            </span>
            <Button
              size="sm"
              variant="outline"
              disabled={page === data.totalPages}
              onClick={() => setPage((p) => p + 1)}
            >
              Próxima
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
