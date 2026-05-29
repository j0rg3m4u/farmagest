'use client';
import { use, useState } from 'react';
import { useRouter } from 'next/navigation';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { toast } from 'sonner';
import {
  useGera, useGeraItems, useTriageItem, useDispatchGera,
  useDispatchPreview, useMapExternalCode,
} from '@/hooks/use-geras';
import { useAuthStore } from '@/stores/auth-store';
import { useItems } from '@/hooks/use-items';
import { canTriageGeras, canDispatchGeras, hasGlobalView } from '@/lib/permissions';
import {
  GERA_STATUS_LABELS, GERA_TYPE_LABELS, GERA_ITEM_STATUS_LABELS,
  GeraStatus, GeraType, GeraItemStatus,
} from '@farmagest/shared';
import type { GeraItem } from '@/types/gera';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from '@/components/ui/dialog';
import { ArrowLeft, Check, X, AlertTriangle, Truck, Search, FileDown } from 'lucide-react';
import Link from 'next/link';

const STATUS_COLORS: Record<string, string> = {
  RECEIVED: 'bg-blue-50 text-blue-700',
  TRIAGING: 'bg-yellow-50 text-yellow-700',
  COMPLETED: 'bg-purple-50 text-purple-700',
  DISPATCHED: 'bg-green-50 text-green-700',
  CANCELLED: 'bg-slate-100 text-slate-500',
};

const ITEM_STATUS_COLORS: Record<string, string> = {
  PENDING: 'bg-slate-100 text-slate-600',
  APPROVED: 'bg-green-50 text-green-700',
  DENIED: 'bg-red-50 text-red-700',
};

interface DenyDialogState {
  open: boolean;
  itemId: string;
  reason: string;
}

interface MapDialogState {
  open: boolean;
  geraItemId: string;
  externalCode: string;
  itemSearch: string;
  selectedItemId: string;
}

export default function GeraDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const router = useRouter();
  const user = useAuthStore((s) => s.user);
  const canTriage = canTriageGeras(user);
  const canDispatch = canDispatchGeras(user);
  const isGlobal = hasGlobalView(user);

  const { data: gera, isLoading: geraLoading } = useGera(id);
  const { data: items, isLoading: itemsLoading } = useGeraItems(id);

  const [approvedAmounts, setApprovedAmounts] = useState<Record<string, string>>({});
  const [denyDialog, setDenyDialog] = useState<DenyDialogState>({
    open: false, itemId: '', reason: '',
  });
  const [mapDialog, setMapDialog] = useState<MapDialogState>({
    open: false, geraItemId: '', externalCode: '', itemSearch: '', selectedItemId: '',
  });
  const [showDispatchPreview, setShowDispatchPreview] = useState(false);

  const triageMutation = useTriageItem(id);
  const dispatchMutation = useDispatchGera(id);
  const mapMutation = useMapExternalCode();

  const canShowDispatch = ['COMPLETED', 'TRIAGING'].includes(gera?.status ?? '');
  const { data: previewData } = useDispatchPreview(id, showDispatchPreview && canShowDispatch);

  const { data: itemsSearch } = useItems({ search: mapDialog.itemSearch || undefined, limit: 20 });

  async function handleApprove(item: GeraItem) {
    const qty = parseFloat(approvedAmounts[item.id] ?? String(item.requested));
    if (!qty || qty <= 0) {
      toast.error('Informe a quantidade a enviar');
      return;
    }
    try {
      await triageMutation.mutateAsync({
        itemId: item.id,
        status: GeraItemStatus.APPROVED,
        approved: qty,
      });
      toast.success('Item atendido');
    } catch (err: any) {
      toast.error(err.response?.data?.message ?? 'Erro ao triar item');
    }
  }

  async function handleDeny() {
    if (!denyDialog.reason.trim()) {
      toast.error('Informe o motivo da negativa');
      return;
    }
    try {
      await triageMutation.mutateAsync({
        itemId: denyDialog.itemId,
        status: GeraItemStatus.DENIED,
        denialReason: denyDialog.reason,
      });
      toast.success('Item negado');
      setDenyDialog({ open: false, itemId: '', reason: '' });
    } catch (err: any) {
      toast.error(err.response?.data?.message ?? 'Erro ao negar item');
    }
  }

  async function handleDispatch() {
    try {
      await dispatchMutation.mutateAsync();
      toast.success('GERA despachado com sucesso!');
      setShowDispatchPreview(false);
    } catch (err: any) {
      toast.error(err.response?.data?.message ?? 'Erro ao despachar');
    }
  }

  async function handleMap() {
    if (!mapDialog.selectedItemId) {
      toast.error('Selecione um item');
      return;
    }
    try {
      await mapMutation.mutateAsync({
        externalCode: mapDialog.externalCode,
        itemId: mapDialog.selectedItemId,
      });
      toast.success('Código mapeado com sucesso');
      setMapDialog({ open: false, geraItemId: '', externalCode: '', itemSearch: '', selectedItemId: '' });
    } catch (err: any) {
      toast.error(err.response?.data?.message ?? 'Erro ao mapear');
    }
  }

  // Atender todos com saldo
  async function handleApproveAllWithStock() {
    const pending = (items ?? []).filter((i) => i.status === 'PENDING' && i.itemId && (i.currentStock ?? 0) > 0);
    for (const item of pending) {
      const stock = item.currentStock ?? 0;
      const requested = parseFloat(String(item.requested));
      const qty = Math.min(stock, requested);
      if (qty > 0) {
        await triageMutation.mutateAsync({
          itemId: item.id,
          status: GeraItemStatus.APPROVED,
          approved: qty,
        }).catch(() => {});
      }
    }
    toast.success('Itens com saldo atendidos');
  }

  // Negar todos sem saldo
  async function handleDenyAllNoStock() {
    const pending = (items ?? []).filter((i) => i.status === 'PENDING' && (!i.itemId || (i.currentStock ?? 0) <= 0));
    for (const item of pending) {
      await triageMutation.mutateAsync({
        itemId: item.id,
        status: GeraItemStatus.DENIED,
        denialReason: 'Sem estoque disponível',
      }).catch(() => {});
    }
    toast.success('Itens sem saldo negados');
  }

  if (geraLoading) {
    return <div className="p-6 text-slate-400">Carregando…</div>;
  }
  if (!gera) {
    return <div className="p-6 text-red-500">GERA não encontrado</div>;
  }

  const pendingCount = (items ?? []).filter((i) => i.status === 'PENDING').length;
  const approvedCount = (items ?? []).filter((i) => i.status === 'APPROVED').length;
  const deniedCount = (items ?? []).filter((i) => i.status === 'DENIED').length;

  // Agrupar por setor (para MANAGER que vê tudo)
  const grouped = isGlobal
    ? Object.entries(
        (items ?? []).reduce<Record<string, GeraItem[]>>((acc, item) => {
          const key = item.sector?.name ?? 'Sem setor';
          (acc[key] ??= []).push(item);
          return acc;
        }, {}),
      )
    : [['Meus itens', items ?? []]] as [string, GeraItem[]][];

  return (
    <div className="p-6 space-y-5">
      {/* Cabeçalho */}
      <div className="flex items-start gap-3">
        <Link href="/geras">
          <Button size="sm" variant="ghost" className="gap-1.5 mt-0.5">
            <ArrowLeft size={16} /> Voltar
          </Button>
        </Link>
        <div className="flex-1">
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-semibold text-slate-900">{gera.code}</h1>
            {gera.externalNumber && (
              <span className="text-slate-400 text-sm">Nº {gera.externalNumber}</span>
            )}
            <Badge className={`${STATUS_COLORS[gera.status] ?? ''} border-0`}>
              {GERA_STATUS_LABELS[gera.status as GeraStatus]}
            </Badge>
          </div>
          <div className="text-sm text-slate-500 mt-1 flex gap-4">
            <span>{gera.unit?.name}</span>
            <span>{GERA_TYPE_LABELS[gera.type as GeraType]}</span>
            <span>Pedido em: {format(new Date(gera.requestedAt), 'dd/MM/yyyy HH:mm', { locale: ptBR })}</span>
            {gera.deadline && (
              <span>Prazo: {format(new Date(gera.deadline), 'dd/MM/yyyy', { locale: ptBR })}</span>
            )}
          </div>
        </div>

        <div className="flex gap-2 shrink-0">
          {gera.status === 'DISPATCHED' && (
            <a
              href={`${process.env.NEXT_PUBLIC_API_URL}/geras/${id}/receipt`}
              target="_blank"
              rel="noreferrer"
            >
              <Button variant="outline" className="gap-1.5">
                <FileDown size={16} /> Comprovante
              </Button>
            </a>
          )}
          {canDispatch && canShowDispatch && gera.status !== 'DISPATCHED' && (
            <Button
              onClick={() => setShowDispatchPreview(true)}
              className="bg-green-600 hover:bg-green-700 text-white gap-1.5"
            >
              <Truck size={16} /> Despachar
            </Button>
          )}
        </div>
      </div>

      {/* Progresso de triagem */}
      <div className="flex gap-4 text-sm">
        <span className="text-slate-500">{pendingCount} pendentes</span>
        <span className="text-green-600">{approvedCount} atendidos</span>
        <span className="text-red-500">{deniedCount} negados</span>
        {canTriage && pendingCount > 0 && gera.status !== 'DISPATCHED' && (
          <div className="flex gap-2 ml-auto">
            <Button size="sm" variant="outline" onClick={handleApproveAllWithStock} className="text-green-700 border-green-300">
              <Check size={14} className="mr-1" /> Atender todos com saldo
            </Button>
            <Button size="sm" variant="outline" onClick={handleDenyAllNoStock} className="text-red-600 border-red-300">
              <X size={14} className="mr-1" /> Negar todos sem saldo
            </Button>
          </div>
        )}
      </div>

      {/* Tabela por grupo */}
      {grouped.map(([groupName, groupItems]) => (
        <div key={groupName} className="bg-white rounded-lg border overflow-hidden">
          {isGlobal && (
            <div className="px-4 py-2 bg-slate-50 border-b text-sm font-medium text-slate-600">
              {groupName}
            </div>
          )}
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-slate-50 border-b">
                <th className="text-left px-4 py-2.5 font-medium text-slate-600 w-20">Cód. Ext.</th>
                <th className="text-left px-4 py-2.5 font-medium text-slate-600">Item (FarmaGest)</th>
                <th className="text-right px-4 py-2.5 font-medium text-slate-600 w-24">Saldo Un.</th>
                <th className="text-right px-4 py-2.5 font-medium text-slate-600 w-24">Consumo</th>
                <th className="text-right px-4 py-2.5 font-medium text-slate-600 w-24">Solicitado</th>
                <th className="text-right px-4 py-2.5 font-medium text-slate-600 w-28">Estoque</th>
                <th className="text-center px-4 py-2.5 font-medium text-slate-600 w-32">Enviar</th>
                <th className="text-center px-4 py-2.5 font-medium text-slate-600 w-28">Status</th>
                {canTriage && gera.status !== 'DISPATCHED' && (
                  <th className="w-20" />
                )}
              </tr>
            </thead>
            <tbody className="divide-y">
              {(groupItems as GeraItem[]).map((item) => {
                const stock = item.currentStock ?? 0;
                const requested = parseFloat(String(item.requested));
                const lowStock = item.itemId && stock < requested;
                const defaultQty = String(item.approved ?? item.requested);

                return (
                  <tr
                    key={item.id}
                    className={lowStock ? 'bg-orange-50' : ''}
                  >
                    <td className="px-4 py-2.5 font-mono text-xs text-slate-500">
                      {item.externalCode ?? '—'}
                    </td>
                    <td className="px-4 py-2.5">
                      {item.item ? (
                        <div>
                          <span className="font-medium text-slate-800">{item.item.code}</span>
                          <span className="text-slate-500 ml-1">{item.item.description}</span>
                        </div>
                      ) : (
                        <div className="flex items-center gap-2">
                          <AlertTriangle size={14} className="text-yellow-500 shrink-0" />
                          <span className="text-slate-500 text-xs">{item.description}</span>
                          {canTriage && (
                            <Button
                              size="sm"
                              variant="outline"
                              className="h-6 px-2 text-xs gap-1"
                              onClick={() => setMapDialog({
                                open: true,
                                geraItemId: item.id,
                                externalCode: item.externalCode ?? '',
                                itemSearch: '',
                                selectedItemId: '',
                              })}
                            >
                              <Search size={10} /> Vincular
                            </Button>
                          )}
                        </div>
                      )}
                    </td>
                    <td className="px-4 py-2.5 text-right text-slate-500">
                      {item.declaredBalance ? parseFloat(String(item.declaredBalance)).toLocaleString('pt-BR') : '—'}
                    </td>
                    <td className="px-4 py-2.5 text-right text-slate-500">
                      {item.consumption ? parseFloat(String(item.consumption)).toLocaleString('pt-BR') : '—'}
                    </td>
                    <td className="px-4 py-2.5 text-right font-medium">
                      {parseFloat(String(item.requested)).toLocaleString('pt-BR')}
                    </td>
                    <td className={`px-4 py-2.5 text-right font-medium ${lowStock ? 'text-orange-600' : 'text-slate-700'}`}>
                      {item.itemId ? (
                        <>
                          {stock.toLocaleString('pt-BR')}
                          {lowStock && <AlertTriangle size={12} className="inline ml-1 text-orange-500" />}
                        </>
                      ) : '—'}
                    </td>
                    <td className="px-4 py-2.5">
                      {item.status === 'PENDING' && canTriage && gera.status !== 'DISPATCHED' ? (
                        <Input
                          type="number"
                          value={approvedAmounts[item.id] ?? defaultQty}
                          onChange={(e) => setApprovedAmounts((prev) => ({ ...prev, [item.id]: e.target.value }))}
                          className="h-7 text-sm text-right w-24"
                          min={0}
                          max={requested}
                        />
                      ) : (
                        <span className="text-center block text-slate-500">
                          {item.approved ? parseFloat(String(item.approved)).toLocaleString('pt-BR') : '—'}
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-2.5 text-center">
                      <Badge className={`text-xs border-0 ${ITEM_STATUS_COLORS[item.status] ?? ''}`}>
                        {GERA_ITEM_STATUS_LABELS[item.status as GeraItemStatus]}
                      </Badge>
                    </td>
                    {canTriage && gera.status !== 'DISPATCHED' && (
                      <td className="px-4 py-2.5">
                        {item.status === 'PENDING' && (
                          <div className="flex gap-1 justify-center">
                            <Button
                              size="icon"
                              variant="ghost"
                              className="h-7 w-7 text-green-600 hover:text-green-700"
                              onClick={() => handleApprove(item)}
                              disabled={triageMutation.isPending}
                            >
                              <Check size={14} />
                            </Button>
                            <Button
                              size="icon"
                              variant="ghost"
                              className="h-7 w-7 text-red-500 hover:text-red-700"
                              onClick={() => setDenyDialog({ open: true, itemId: item.id, reason: '' })}
                              disabled={triageMutation.isPending}
                            >
                              <X size={14} />
                            </Button>
                          </div>
                        )}
                        {item.status === 'DENIED' && item.denialReason && (
                          <span className="text-xs text-red-400" title={item.denialReason}>
                            {item.denialReason.slice(0, 20)}…
                          </span>
                        )}
                      </td>
                    )}
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      ))}

      {/* Modal de negativa */}
      <Dialog open={denyDialog.open} onOpenChange={(o) => !o && setDenyDialog({ open: false, itemId: '', reason: '' })}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Motivo da Negativa</DialogTitle>
          </DialogHeader>
          <div className="space-y-2">
            <Label>Descreva o motivo (mín. 5 caracteres)</Label>
            <Textarea
              value={denyDialog.reason}
              onChange={(e) => setDenyDialog((d) => ({ ...d, reason: e.target.value }))}
              rows={3}
              placeholder="Ex: Sem estoque disponível, aguardar próximo pedido..."
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDenyDialog({ open: false, itemId: '', reason: '' })}>
              Cancelar
            </Button>
            <Button
              className="bg-red-600 hover:bg-red-700 text-white"
              onClick={handleDeny}
              disabled={triageMutation.isPending}
            >
              Negar item
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Modal de despacho */}
      <Dialog open={showDispatchPreview} onOpenChange={setShowDispatchPreview}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Preview de Despacho</DialogTitle>
          </DialogHeader>
          {!previewData ? (
            <p className="text-slate-400 text-sm">Carregando preview…</p>
          ) : (
            <div className="space-y-3">
              {previewData.warnings.length > 0 && (
                <div className="bg-red-50 border border-red-200 rounded p-3 space-y-1">
                  {previewData.warnings.map((w, i) => (
                    <p key={i} className="text-sm text-red-700 flex gap-2">
                      <AlertTriangle size={14} className="shrink-0 mt-0.5" />
                      {w}
                    </p>
                  ))}
                </div>
              )}
              <p className="text-sm text-slate-600">
                {previewData.total} item(s) serão despachados.
                {previewData.canDispatch
                  ? ' Saldo suficiente para todos os itens.'
                  : ' Há itens com saldo insuficiente.'}
              </p>
              <div className="divide-y max-h-60 overflow-y-auto text-sm">
                {previewData.items.map((p) => (
                  <div key={p.geraItemId} className="py-2 flex items-center gap-2">
                    {p.warning
                      ? <AlertTriangle size={14} className="text-orange-500 shrink-0" />
                      : <Check size={14} className="text-green-500 shrink-0" />
                    }
                    <span className="flex-1">{p.item?.description ?? 'Item não mapeado'}</span>
                    {p.warning && <span className="text-xs text-orange-600">{p.warning}</span>}
                  </div>
                ))}
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowDispatchPreview(false)}>
              Cancelar
            </Button>
            <Button
              className="bg-green-600 hover:bg-green-700 text-white gap-1.5"
              onClick={handleDispatch}
              disabled={!previewData?.canDispatch || dispatchMutation.isPending}
            >
              <Truck size={14} />
              {dispatchMutation.isPending ? 'Despachando…' : 'Confirmar despacho'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Modal de mapeamento */}
      <Dialog open={mapDialog.open} onOpenChange={(o) => !o && setMapDialog({ open: false, geraItemId: '', externalCode: '', itemSearch: '', selectedItemId: '' })}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Vincular Código Externo</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <p className="text-sm text-slate-600">
              Código externo: <span className="font-mono font-medium">{mapDialog.externalCode}</span>
            </p>
            <div className="space-y-1">
              <Label>Buscar item no catálogo</Label>
              <Input
                placeholder="Digite nome ou código…"
                value={mapDialog.itemSearch}
                onChange={(e) => setMapDialog((d) => ({ ...d, itemSearch: e.target.value }))}
              />
            </div>
            {itemsSearch?.data && itemsSearch.data.length > 0 && (
              <div className="border rounded divide-y max-h-48 overflow-y-auto">
                {itemsSearch.data.map((item: any) => (
                  <button
                    key={item.id}
                    type="button"
                    className={`w-full text-left px-3 py-2 text-sm hover:bg-slate-50 flex items-center gap-2 ${mapDialog.selectedItemId === item.id ? 'bg-blue-50' : ''}`}
                    onClick={() => setMapDialog((d) => ({ ...d, selectedItemId: item.id }))}
                  >
                    <span className="font-mono text-xs text-slate-500 w-20 shrink-0">{item.code}</span>
                    <span className="truncate">{item.description}</span>
                    {mapDialog.selectedItemId === item.id && <Check size={14} className="ml-auto text-blue-600 shrink-0" />}
                  </button>
                ))}
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setMapDialog({ open: false, geraItemId: '', externalCode: '', itemSearch: '', selectedItemId: '' })}>
              Cancelar
            </Button>
            <Button
              onClick={handleMap}
              disabled={!mapDialog.selectedItemId || mapMutation.isPending}
              className="bg-pmdc-blue hover:bg-pmdc-blue-dark text-white"
            >
              Vincular
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
