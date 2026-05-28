'use client';
import { useState } from 'react';
import { useAuthStore } from '@/stores/auth-store';
import { canExportAudit } from '@/lib/permissions';
import { useAuditLogs, useAuditEntities, useAuditActions, type AuditLog } from '@/hooks/use-audit-logs';
import { useUsers } from '@/hooks/use-users';
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
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Download, Eye, ShieldCheck } from 'lucide-react';
import { apiClient } from '@/lib/api-client';

const ACTION_LABELS: Record<string, string> = {
  LOGIN: 'Login',
  LOGIN_FAILED: 'Login falhou',
  CREATE: 'Criação',
  UPDATE: 'Edição',
  DELETE: 'Exclusão',
  REVERSAL: 'Estorno',
  EXECUTE: 'Execução',
  MARK_READY: 'Marcar pronta',
  CANCEL: 'Cancelamento',
  APPROVE: 'Aprovação',
  REJECT: 'Rejeição',
};

const ACTION_COLORS: Record<string, string> = {
  LOGIN: 'bg-blue-100 text-blue-700',
  LOGIN_FAILED: 'bg-red-100 text-red-700',
  CREATE: 'bg-green-100 text-green-700',
  UPDATE: 'bg-yellow-100 text-yellow-700',
  DELETE: 'bg-red-100 text-red-700',
  REVERSAL: 'bg-orange-100 text-orange-700',
  EXECUTE: 'bg-indigo-100 text-indigo-700',
  MARK_READY: 'bg-indigo-100 text-indigo-700',
  CANCEL: 'bg-slate-100 text-slate-600',
  APPROVE: 'bg-green-100 text-green-700',
  REJECT: 'bg-red-100 text-red-700',
};

const ENTITY_LABELS: Record<string, string> = {
  Item: 'Item',
  Unit: 'Unidade',
  User: 'Usuário',
  Sector: 'Setor',
  Movement: 'Movimentação',
  Exchange: 'Troca',
  Lot: 'Lote',
  Auth: 'Autenticação',
  Partner: 'Parceiro',
};

function DetailModal({ log, onClose }: { log: AuditLog; onClose: () => void }) {
  const payload = log.payload as Record<string, unknown> | null;
  const before = payload?.before as Record<string, unknown> | undefined;
  const after = payload?.after as Record<string, unknown> | undefined;
  const changedFields = payload?.changedFields as Record<string, { from: unknown; to: unknown }> | undefined;

  return (
    <Dialog open onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <ShieldCheck size={16} className="text-slate-500" />
            Detalhe do Log
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4 text-sm">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <div className="text-xs text-slate-400 mb-0.5">Usuário</div>
              <div className="font-medium">{log.user?.name ?? '—'}</div>
              <div className="text-xs text-slate-500">{log.user?.email ?? '—'}</div>
            </div>
            <div>
              <div className="text-xs text-slate-400 mb-0.5">Data/Hora</div>
              <div>{new Date(log.createdAt).toLocaleString('pt-BR')}</div>
            </div>
            <div>
              <div className="text-xs text-slate-400 mb-0.5">Ação</div>
              <Badge className={`${ACTION_COLORS[log.action] ?? 'bg-slate-100 text-slate-600'} border-0 text-xs`}>
                {ACTION_LABELS[log.action] ?? log.action}
              </Badge>
            </div>
            <div>
              <div className="text-xs text-slate-400 mb-0.5">Entidade</div>
              <div>{ENTITY_LABELS[log.entity] ?? log.entity}{log.entityId ? <span className="text-slate-400 ml-1 font-mono text-xs">#{log.entityId.slice(-8)}</span> : ''}</div>
            </div>
          </div>

          {changedFields && Object.keys(changedFields).length > 0 && (
            <div>
              <div className="text-xs font-semibold text-slate-600 mb-2 uppercase tracking-wide">Campos alterados</div>
              <div className="border rounded-md overflow-hidden">
                <table className="w-full text-xs">
                  <thead className="bg-slate-50">
                    <tr>
                      <th className="px-3 py-2 text-left text-slate-500">Campo</th>
                      <th className="px-3 py-2 text-left text-slate-500">Antes</th>
                      <th className="px-3 py-2 text-left text-slate-500">Depois</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y">
                    {Object.entries(changedFields).map(([field, diff]) => (
                      <tr key={field}>
                        <td className="px-3 py-1.5 font-mono">{field}</td>
                        <td className="px-3 py-1.5 text-red-600">{String(diff.from ?? '—')}</td>
                        <td className="px-3 py-1.5 text-green-600">{String(diff.to ?? '—')}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          <div>
            <div className="text-xs font-semibold text-slate-600 mb-2 uppercase tracking-wide">Payload completo</div>
            <pre className="bg-slate-50 rounded-md p-3 text-xs overflow-x-auto text-slate-700 max-h-60">
              {JSON.stringify(log.payload, null, 2)}
            </pre>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

export default function AuditoriaPage() {
  const user = useAuthStore((s) => s.user);
  const canExport = canExportAudit(user);

  const today = new Date().toISOString().slice(0, 10);
  const sevenDaysAgo = new Date(Date.now() - 7 * 86400000).toISOString().slice(0, 10);

  const [dateFrom, setDateFrom] = useState(sevenDaysAgo);
  const [dateTo, setDateTo] = useState(today);
  const [actionFilter, setActionFilter] = useState('');
  const [entityFilter, setEntityFilter] = useState('');
  const [userFilter, setUserFilter] = useState('');
  const [page, setPage] = useState(1);
  const [selectedLog, setSelectedLog] = useState<AuditLog | null>(null);

  const { data, isLoading } = useAuditLogs({
    dateFrom: dateFrom || undefined,
    dateTo: dateTo || undefined,
    action: actionFilter || undefined,
    entity: entityFilter || undefined,
    userId: userFilter || undefined,
    page,
    limit: 50,
  });

  const { data: entities } = useAuditEntities();
  const { data: actions } = useAuditActions();
  const { data: users } = useUsers({ limit: 100 });

  async function handleExport(format: 'csv' | 'pdf') {
    const params = new URLSearchParams({
      format,
      ...(dateFrom && { dateFrom }),
      ...(dateTo && { dateTo }),
      ...(actionFilter && { action: actionFilter }),
      ...(entityFilter && { entity: entityFilter }),
    });
    const res = await apiClient.get(`/audit-logs/export?${params}`, { responseType: 'blob' });
    const mime = format === 'pdf' ? 'application/pdf' : 'text/csv';
    const ext = format;
    const url = URL.createObjectURL(new Blob([res.data], { type: mime }));
    const a = document.createElement('a');
    a.href = url;
    a.download = `auditoria.${ext}`;
    a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <div className="p-6 space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-slate-900">Auditoria</h1>
          <p className="text-slate-500 text-sm">Trilha completa de ações no sistema</p>
        </div>
        {canExport && (
          <div className="flex gap-2">
            <Button size="sm" variant="outline" className="gap-1.5" onClick={() => handleExport('csv')}>
              <Download size={14} /> CSV
            </Button>
            <Button size="sm" variant="outline" className="gap-1.5" onClick={() => handleExport('pdf')}>
              <Download size={14} /> PDF
            </Button>
          </div>
        )}
      </div>

      {/* Filtros */}
      <div className="flex gap-2 flex-wrap items-end">
        <div className="space-y-1">
          <label className="text-xs text-slate-500">De</label>
          <Input type="date" value={dateFrom} onChange={(e) => { setDateFrom(e.target.value); setPage(1); }} className="w-36 text-sm" />
        </div>
        <div className="space-y-1">
          <label className="text-xs text-slate-500">Até</label>
          <Input type="date" value={dateTo} onChange={(e) => { setDateTo(e.target.value); setPage(1); }} className="w-36 text-sm" />
        </div>
        <select
          value={actionFilter}
          onChange={(e) => { setActionFilter(e.target.value); setPage(1); }}
          className="border rounded-md px-3 py-2 text-sm text-slate-700 bg-white h-9"
        >
          <option value="">Todas as ações</option>
          {actions?.map((a) => (
            <option key={a} value={a}>{ACTION_LABELS[a] ?? a}</option>
          ))}
        </select>
        <select
          value={entityFilter}
          onChange={(e) => { setEntityFilter(e.target.value); setPage(1); }}
          className="border rounded-md px-3 py-2 text-sm text-slate-700 bg-white h-9"
        >
          <option value="">Todas as entidades</option>
          {entities?.map((e) => (
            <option key={e} value={e}>{ENTITY_LABELS[e] ?? e}</option>
          ))}
        </select>
        <select
          value={userFilter}
          onChange={(e) => { setUserFilter(e.target.value); setPage(1); }}
          className="border rounded-md px-3 py-2 text-sm text-slate-700 bg-white h-9"
        >
          <option value="">Todos os usuários</option>
          {users?.data?.map((u: { id: string; name: string }) => (
            <option key={u.id} value={u.id}>{u.name}</option>
          ))}
        </select>
        {(actionFilter || entityFilter || userFilter) && (
          <Button size="sm" variant="ghost" className="text-xs" onClick={() => { setActionFilter(''); setEntityFilter(''); setUserFilter(''); setPage(1); }}>
            Limpar
          </Button>
        )}
      </div>

      {/* Tabela */}
      <div className="bg-white rounded-lg border overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow className="bg-slate-50">
              <TableHead>Data/Hora</TableHead>
              <TableHead>Usuário</TableHead>
              <TableHead>Ação</TableHead>
              <TableHead>Entidade</TableHead>
              <TableHead className="w-10" />
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading && (
              <TableRow>
                <TableCell colSpan={5} className="text-center py-12 text-slate-400">Carregando...</TableCell>
              </TableRow>
            )}
            {!isLoading && data?.data.length === 0 && (
              <TableRow>
                <TableCell colSpan={5} className="text-center py-12 text-slate-400">Nenhum registro encontrado.</TableCell>
              </TableRow>
            )}
            {data?.data.map((log) => (
              <TableRow key={log.id} className="hover:bg-slate-50">
                <TableCell className="text-xs font-mono text-slate-500 whitespace-nowrap">
                  {new Date(log.createdAt).toLocaleString('pt-BR')}
                </TableCell>
                <TableCell>
                  <div className="text-sm">{log.user?.name ?? <span className="text-slate-400 italic">Sistema</span>}</div>
                  <div className="text-xs text-slate-400">{log.user?.email ?? ''}</div>
                </TableCell>
                <TableCell>
                  <Badge className={`${ACTION_COLORS[log.action] ?? 'bg-slate-100 text-slate-600'} border-0 text-xs`}>
                    {ACTION_LABELS[log.action] ?? log.action}
                  </Badge>
                </TableCell>
                <TableCell>
                  <span className="text-sm">{ENTITY_LABELS[log.entity] ?? log.entity}</span>
                  {log.entityId && (
                    <span className="text-xs font-mono text-slate-400 ml-1">#{log.entityId.slice(-8)}</span>
                  )}
                </TableCell>
                <TableCell>
                  <Button size="sm" variant="ghost" className="h-7 w-7 p-0" onClick={() => setSelectedLog(log)}>
                    <Eye size={13} />
                  </Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      {/* Paginação */}
      {data && data.totalPages > 1 && (
        <div className="flex items-center justify-between text-sm text-slate-500">
          <span>{data.total} registros</span>
          <div className="flex gap-2">
            <Button size="sm" variant="outline" disabled={page === 1} onClick={() => setPage((p) => p - 1)}>Anterior</Button>
            <span className="px-2 py-1">{page} / {data.totalPages}</span>
            <Button size="sm" variant="outline" disabled={page === data.totalPages} onClick={() => setPage((p) => p + 1)}>Próxima</Button>
          </div>
        </div>
      )}

      {selectedLog && <DetailModal log={selectedLog} onClose={() => setSelectedLog(null)} />}
    </div>
  );
}
