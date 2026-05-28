'use client';
import { useParams } from 'next/navigation';
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import {
  EXCHANGE_STATUS_LABELS,
  ExchangeStatus,
  addExchangeOutputSchema,
  addExchangeInputSchema,
  type AddExchangeOutputInput,
  type AddExchangeInputInput,
} from '@farmagest/shared';
import { useAuthStore } from '@/stores/auth-store';
import { canManageExchanges } from '@/lib/permissions';
import {
  useExchange,
  useMarkReady,
  useCancelExchange,
  useAddOutput,
  useRemoveOutput,
  useAddInput,
  useRemoveInput,
  useExecuteOutput,
  useExecuteInput,
  useExecuteAll,
} from '@/hooks/use-exchanges';
import { useItems } from '@/hooks/use-items';
import { useItemLots } from '@/hooks/use-lots';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { ArrowLeft, Plus, Trash2, CheckCircle2, Play, FileDown } from 'lucide-react';
import { apiClient } from '@/lib/api-client';
import Link from 'next/link';
import type { ExchangeOutputItem, ExchangeInputItem } from '@/types/exchange';

const R = (v: number | string) =>
  Number(v).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

const STATUS_COLORS: Record<string, string> = {
  DRAFT: 'bg-slate-100 text-slate-600',
  PENDING: 'bg-yellow-100 text-yellow-700',
  APPROVED: 'bg-blue-100 text-blue-700',
  REJECTED: 'bg-red-100 text-red-700',
  READY: 'bg-indigo-100 text-indigo-700',
  EXECUTED: 'bg-orange-100 text-orange-700',
  COMPLETED: 'bg-green-100 text-green-700',
  CANCELLED: 'bg-slate-100 text-slate-400',
};

function AddOutputModal({
  exchangeId,
  sectorId,
  open,
  onClose,
}: {
  exchangeId: string;
  sectorId: string;
  open: boolean;
  onClose: () => void;
}) {
  const [itemSearch, setItemSearch] = useState('');
  const [selectedItemId, setSelectedItemId] = useState('');
  const { data: items } = useItems({ search: itemSearch || undefined, sectorId, limit: 20 });
  const { data: lots } = useItemLots(selectedItemId);
  const addOutput = useAddOutput(exchangeId);

  const {
    register,
    handleSubmit,
    reset,
    setValue,
    formState: { errors },
  } = useForm<AddExchangeOutputInput>({
    resolver: zodResolver(addExchangeOutputSchema),
  });

  async function onSubmit(data: AddExchangeOutputInput) {
    await addOutput.mutateAsync(data);
    reset();
    setSelectedItemId('');
    onClose();
  }

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Adicionar Item de Saída</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div className="space-y-2">
            <Label>Item (busca)</Label>
            <Input
              placeholder="Nome ou código..."
              value={itemSearch}
              onChange={(e) => setItemSearch(e.target.value)}
            />
            {items && items.data.length > 0 && (
              <div className="border rounded-md divide-y max-h-40 overflow-y-auto">
                {items.data.map((item) => (
                  <button
                    key={item.id}
                    type="button"
                    className={`w-full text-left px-3 py-2 text-sm hover:bg-slate-50 ${selectedItemId === item.id ? 'bg-blue-50' : ''}`}
                    onClick={() => {
                      setSelectedItemId(item.id);
                      setValue('itemId', item.id);
                      setItemSearch(item.description);
                    }}
                  >
                    <span className="font-mono text-xs text-slate-400 mr-2">{item.code}</span>
                    {item.description}
                    {item.unitValue && (
                      <span className="ml-2 text-xs text-slate-500">{R(item.unitValue)}</span>
                    )}
                  </button>
                ))}
              </div>
            )}
            <input type="hidden" {...register('itemId')} />
            {errors.itemId && <p className="text-xs text-red-500">{errors.itemId.message}</p>}
          </div>

          {selectedItemId && (
            <div className="space-y-2">
              <Label htmlFor="lotId">Lote</Label>
              <select
                id="lotId"
                {...register('lotId')}
                className="w-full border rounded-md px-3 py-2 text-sm bg-white"
              >
                <option value="">Selecione o lote...</option>
                {lots?.data?.map((lot: { id: string; lotNumber: string; currentBalance: string; expirationDate: string }) => (
                  <option key={lot.id} value={lot.id}>
                    {lot.lotNumber} — saldo: {Number(lot.currentBalance)} — val: {new Date(lot.expirationDate).toLocaleDateString('pt-BR')}
                  </option>
                ))}
              </select>
              {errors.lotId && <p className="text-xs text-red-500">{errors.lotId.message}</p>}
            </div>
          )}

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label htmlFor="quantity">Quantidade</Label>
              <Input
                id="quantity"
                type="number"
                step="0.001"
                {...register('quantity', { valueAsNumber: true })}
              />
              {errors.quantity && <p className="text-xs text-red-500">{errors.quantity.message}</p>}
            </div>
            <div className="space-y-2">
              <Label htmlFor="unitValue">Valor unitário (R$)</Label>
              <Input
                id="unitValue"
                type="number"
                step="0.01"
                placeholder="Automático"
                {...register('unitValue', { valueAsNumber: true })}
              />
            </div>
          </div>

          {addOutput.error && (
            <p className="text-xs text-red-500">
              {(addOutput.error as { response?: { data?: { message?: string } } })?.response?.data?.message ?? 'Erro ao adicionar'}
            </p>
          )}

          <div className="flex justify-end gap-2">
            <Button type="button" variant="outline" onClick={onClose}>Cancelar</Button>
            <Button
              type="submit"
              disabled={addOutput.isPending}
              className="bg-pmdc-blue hover:bg-pmdc-blue-dark text-white"
            >
              {addOutput.isPending ? 'Adicionando...' : 'Adicionar'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function AddInputModal({
  exchangeId,
  open,
  onClose,
}: {
  exchangeId: string;
  open: boolean;
  onClose: () => void;
}) {
  const [itemSearch, setItemSearch] = useState('');
  const [selectedItemId, setSelectedItemId] = useState('');
  const { data: items } = useItems({ search: itemSearch || undefined, limit: 20 });
  const addInput = useAddInput(exchangeId);

  const {
    register,
    handleSubmit,
    reset,
    setValue,
    formState: { errors },
  } = useForm<AddExchangeInputInput>({
    resolver: zodResolver(addExchangeInputSchema),
  });

  async function onSubmit(data: AddExchangeInputInput) {
    const payload: AddExchangeInputInput = {
      ...data,
      declaredExpiration: data.declaredExpiration
        ? new Date(data.declaredExpiration as string).toISOString()
        : undefined,
    };
    await addInput.mutateAsync(payload);
    reset();
    setSelectedItemId('');
    onClose();
  }

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Adicionar Item de Entrada</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div className="space-y-2">
            <Label>Item (busca)</Label>
            <Input
              placeholder="Nome ou código..."
              value={itemSearch}
              onChange={(e) => setItemSearch(e.target.value)}
            />
            {items && items.data.length > 0 && (
              <div className="border rounded-md divide-y max-h-40 overflow-y-auto">
                {items.data.map((item) => (
                  <button
                    key={item.id}
                    type="button"
                    className={`w-full text-left px-3 py-2 text-sm hover:bg-slate-50 ${selectedItemId === item.id ? 'bg-blue-50' : ''}`}
                    onClick={() => {
                      setSelectedItemId(item.id);
                      setValue('itemId', item.id);
                      setItemSearch(item.description);
                    }}
                  >
                    <span className="font-mono text-xs text-slate-400 mr-2">{item.code}</span>
                    {item.description}
                  </button>
                ))}
              </div>
            )}
            <input type="hidden" {...register('itemId')} />
            {errors.itemId && <p className="text-xs text-red-500">{errors.itemId.message}</p>}
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label htmlFor="declaredLotNumber">Nº do Lote</Label>
              <Input id="declaredLotNumber" {...register('declaredLotNumber')} placeholder="LT-2026-0001" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="declaredExpiration">Validade</Label>
              <Input id="declaredExpiration" type="date" {...register('declaredExpiration')} />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label htmlFor="in-quantity">Quantidade</Label>
              <Input
                id="in-quantity"
                type="number"
                step="0.001"
                {...register('quantity', { valueAsNumber: true })}
              />
              {errors.quantity && <p className="text-xs text-red-500">{errors.quantity.message}</p>}
            </div>
            <div className="space-y-2">
              <Label htmlFor="in-unitValue">Valor unitário (R$) *</Label>
              <Input
                id="in-unitValue"
                type="number"
                step="0.01"
                {...register('unitValue', { valueAsNumber: true })}
              />
              {errors.unitValue && <p className="text-xs text-red-500">{errors.unitValue.message}</p>}
            </div>
          </div>

          {addInput.error && (
            <p className="text-xs text-red-500">
              {(addInput.error as { response?: { data?: { message?: string } } })?.response?.data?.message ?? 'Erro ao adicionar'}
            </p>
          )}

          <div className="flex justify-end gap-2">
            <Button type="button" variant="outline" onClick={onClose}>Cancelar</Button>
            <Button
              type="submit"
              disabled={addInput.isPending}
              className="bg-pmdc-blue hover:bg-pmdc-blue-dark text-white"
            >
              {addInput.isPending ? 'Adicionando...' : 'Adicionar'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function OutputRow({ output, canEdit, canExecute, exchangeId }: {
  output: ExchangeOutputItem;
  canEdit: boolean;
  canExecute: boolean;
  exchangeId: string;
}) {
  const removeOutput = useRemoveOutput(exchangeId);
  const executeOutput = useExecuteOutput(exchangeId);

  return (
    <div className={`p-3 rounded border ${output.executedAt ? 'bg-green-50 border-green-200' : 'bg-white'}`}>
      <div className="flex items-start justify-between gap-2">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            {output.executedAt && <CheckCircle2 size={14} className="text-green-500 shrink-0" />}
            <span className="text-sm font-medium truncate">{output.item.description}</span>
          </div>
          <div className="text-xs text-slate-500 mt-0.5">
            <span className="font-mono">{output.item.code}</span>
            {' · '}Lote: {output.lot.lotNumber}
            {output.executedAt && (
              <span className="ml-1 text-green-600">
                · Executado {new Date(output.executedAt).toLocaleDateString('pt-BR')}
              </span>
            )}
          </div>
          <div className="text-xs mt-1">
            {Number(output.quantity)} × {R(output.unitValue)} ={' '}
            <span className="font-medium">{R(output.subtotal)}</span>
          </div>
        </div>
        {!output.executedAt && (
          <div className="flex gap-1 shrink-0">
            {canExecute && (
              <Button
                size="sm"
                variant="ghost"
                className="h-7 px-2 text-xs text-green-600 hover:text-green-800"
                onClick={() => executeOutput.mutate(output.id)}
                disabled={executeOutput.isPending}
              >
                <Play size={12} className="mr-1" /> Executar
              </Button>
            )}
            {canEdit && (
              <Button
                size="sm"
                variant="ghost"
                className="h-7 w-7 p-0 text-red-400 hover:text-red-600"
                onClick={() => removeOutput.mutate(output.id)}
                disabled={removeOutput.isPending}
              >
                <Trash2 size={12} />
              </Button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

function InputRow({ input, canEdit, canExecute, exchangeId }: {
  input: ExchangeInputItem;
  canEdit: boolean;
  canExecute: boolean;
  exchangeId: string;
}) {
  const removeInput = useRemoveInput(exchangeId);
  const executeInput = useExecuteInput(exchangeId);

  return (
    <div className={`p-3 rounded border ${input.executedAt ? 'bg-green-50 border-green-200' : 'bg-white'}`}>
      <div className="flex items-start justify-between gap-2">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            {input.executedAt && <CheckCircle2 size={14} className="text-green-500 shrink-0" />}
            <span className="text-sm font-medium truncate">{input.item.description}</span>
          </div>
          <div className="text-xs text-slate-500 mt-0.5">
            <span className="font-mono">{input.item.code}</span>
            {input.declaredLotNumber && ` · Lote: ${input.declaredLotNumber}`}
            {input.lot && !input.declaredLotNumber && ` · Lote: ${input.lot.lotNumber}`}
            {input.executedAt && (
              <span className="ml-1 text-green-600">
                · Executado {new Date(input.executedAt).toLocaleDateString('pt-BR')}
              </span>
            )}
          </div>
          <div className="text-xs mt-1">
            {Number(input.quantity)} × {R(input.unitValue)} ={' '}
            <span className="font-medium">{R(input.subtotal)}</span>
          </div>
        </div>
        {!input.executedAt && (
          <div className="flex gap-1 shrink-0">
            {canExecute && (
              <Button
                size="sm"
                variant="ghost"
                className="h-7 px-2 text-xs text-green-600 hover:text-green-800"
                onClick={() => executeInput.mutate(input.id)}
                disabled={executeInput.isPending}
              >
                <Play size={12} className="mr-1" /> Executar
              </Button>
            )}
            {canEdit && (
              <Button
                size="sm"
                variant="ghost"
                className="h-7 w-7 p-0 text-red-400 hover:text-red-600"
                onClick={() => removeInput.mutate(input.id)}
                disabled={removeInput.isPending}
              >
                <Trash2 size={12} />
              </Button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

export default function TrocaDetailPage() {
  const { id } = useParams<{ id: string }>();
  const user = useAuthStore((s) => s.user);
  const canManage = canManageExchanges(user);

  const { data: exchange, isLoading } = useExchange(id);
  const markReady = useMarkReady(id);
  const cancelExchange = useCancelExchange(id);
  const executeAll = useExecuteAll(id);

  const [showAddOutput, setShowAddOutput] = useState(false);
  const [showAddInput, setShowAddInput] = useState(false);

  if (isLoading) return <div className="p-6 text-slate-400">Carregando...</div>;
  if (!exchange) return <div className="p-6 text-slate-500">Troca não encontrada.</div>;

  const canDownloadPdf = [
    ExchangeStatus.READY,
    ExchangeStatus.EXECUTED,
    ExchangeStatus.COMPLETED,
    ExchangeStatus.APPROVED,
  ].includes(exchange.status as ExchangeStatus);

  async function handleDownloadPdf() {
    const res = await apiClient.get(`/exchanges/${id}/pdf`, { responseType: 'blob' });
    const url = URL.createObjectURL(new Blob([res.data], { type: 'application/pdf' }));
    const a = document.createElement('a');
    a.href = url;
    a.download = `${exchange?.code ?? id}-acordo.pdf`;
    a.click();
    URL.revokeObjectURL(url);
  }

  const isDraft = exchange.status === ExchangeStatus.DRAFT;
  const isReady = exchange.status === ExchangeStatus.READY;
  const isExecuting = exchange.status === ExchangeStatus.EXECUTED || exchange.status === ExchangeStatus.APPROVED;
  const isEditable = isDraft || isReady;
  const canExecute = isReady || isExecuting;
  const isCancellable = [ExchangeStatus.DRAFT, ExchangeStatus.READY, ExchangeStatus.PENDING, ExchangeStatus.APPROVED].includes(exchange.status as ExchangeStatus);

  const totalOutput = exchange.outputs.reduce((s, o) => s + Number(o.subtotal), 0);
  const totalInput = exchange.inputs.reduce((s, i) => s + Number(i.subtotal), 0);
  const pendingCount = [...exchange.outputs, ...exchange.inputs].filter((r) => !r.executedAt).length;

  function handleCancel() {
    const reason = prompt('Motivo do cancelamento (mín. 5 caracteres):');
    if (!reason || reason.length < 5) return;
    cancelExchange.mutate(reason);
  }

  return (
    <div className="p-6 space-y-5">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Link href="/trocas">
          <Button size="sm" variant="ghost" className="gap-1.5">
            <ArrowLeft size={16} /> Voltar
          </Button>
        </Link>
        <div className="flex-1">
          <div className="flex items-center gap-3 flex-wrap">
            <h1 className="text-2xl font-semibold text-slate-900 font-mono">{exchange.code}</h1>
            <Badge className={`${STATUS_COLORS[exchange.status] ?? STATUS_COLORS.DRAFT} border-0 text-xs`}>
              {EXCHANGE_STATUS_LABELS[exchange.status as ExchangeStatus] ?? exchange.status}
            </Badge>
            {canDownloadPdf && (
              <Button
                size="sm"
                variant="outline"
                className="gap-1.5 text-xs"
                onClick={handleDownloadPdf}
              >
                <FileDown size={14} /> Baixar Acordo (PDF)
              </Button>
            )}
          </div>
          <p className="text-slate-500 text-sm">
            {exchange.partner?.name} · {exchange.sector?.name} · {new Date(exchange.date).toLocaleDateString('pt-BR')}
          </p>
        </div>
      </div>

      {/* Justificativa */}
      <div className="bg-slate-50 rounded-lg p-4 text-sm text-slate-600">
        <span className="font-medium text-slate-700">Justificativa: </span>
        {exchange.justification}
      </div>

      {/* Colunas saídas / entradas */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        {/* Saídas */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-semibold text-slate-700 uppercase tracking-wide">
              Enviando (saídas)
            </h2>
            {canManage && isEditable && (
              <Button
                size="sm"
                variant="outline"
                className="gap-1 h-7 text-xs"
                onClick={() => setShowAddOutput(true)}
              >
                <Plus size={12} /> Adicionar
              </Button>
            )}
          </div>

          {exchange.outputs.length === 0 ? (
            <div className="text-center py-8 text-slate-400 text-sm border-2 border-dashed rounded-lg">
              Nenhuma saída adicionada
            </div>
          ) : (
            <div className="space-y-2">
              {exchange.outputs.map((output) => (
                <OutputRow
                  key={output.id}
                  output={output}
                  canEdit={canManage && isEditable}
                  canExecute={canManage && canExecute}
                  exchangeId={id}
                />
              ))}
            </div>
          )}

          {exchange.outputs.length > 0 && (
            <div className="text-right text-sm font-semibold text-slate-700 pt-1 border-t">
              Total saída: {R(totalOutput)}
            </div>
          )}
        </div>

        {/* Entradas */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-semibold text-slate-700 uppercase tracking-wide">
              Recebendo (entradas)
            </h2>
            {canManage && isEditable && (
              <Button
                size="sm"
                variant="outline"
                className="gap-1 h-7 text-xs"
                onClick={() => setShowAddInput(true)}
              >
                <Plus size={12} /> Adicionar
              </Button>
            )}
          </div>

          {exchange.inputs.length === 0 ? (
            <div className="text-center py-8 text-slate-400 text-sm border-2 border-dashed rounded-lg">
              Nenhuma entrada adicionada
            </div>
          ) : (
            <div className="space-y-2">
              {exchange.inputs.map((input) => (
                <InputRow
                  key={input.id}
                  input={input}
                  canEdit={canManage && isEditable}
                  canExecute={canManage && canExecute}
                  exchangeId={id}
                />
              ))}
            </div>
          )}

          {exchange.inputs.length > 0 && (
            <div className="text-right text-sm font-semibold text-slate-700 pt-1 border-t">
              Total entrada: {R(totalInput)}
            </div>
          )}
        </div>
      </div>

      {/* Painel de balanço + ações */}
      <div className="bg-white rounded-lg border p-5 space-y-4">
        <div className="flex items-center justify-between flex-wrap gap-4">
          <div className="space-y-1">
            <div className="text-sm font-medium text-slate-700">Balanço</div>
            <div className={`flex items-center gap-2 text-sm ${exchange.isBalanced ? 'text-green-600' : 'text-red-500'}`}>
              {exchange.isBalanced ? '✅' : '⚠️'}
              Diferença: {R(Math.abs(totalOutput - totalInput))} ({exchange.differencePct}%)
              {exchange.isBalanced
                ? ` — dentro da tolerância de ${exchange.tolerancePct}%`
                : ` — fora da tolerância de ${exchange.tolerancePct}%`}
            </div>
          </div>

          {canManage && (
            <div className="flex gap-2 flex-wrap">
              {isCancellable && (
                <Button
                  size="sm"
                  variant="outline"
                  className="text-red-500 hover:text-red-700 border-red-200"
                  onClick={handleCancel}
                  disabled={cancelExchange.isPending}
                >
                  Cancelar troca
                </Button>
              )}
              {isDraft && (
                <Button
                  size="sm"
                  disabled={
                    !exchange.isBalanced ||
                    exchange.outputs.length === 0 ||
                    exchange.inputs.length === 0 ||
                    markReady.isPending
                  }
                  onClick={() => markReady.mutate()}
                  className="bg-indigo-600 hover:bg-indigo-700 text-white"
                >
                  {markReady.isPending ? 'Aguarde...' : 'Marcar como pronta'}
                </Button>
              )}
              {(isReady || isExecuting) && pendingCount > 0 && (
                <Button
                  size="sm"
                  disabled={executeAll.isPending}
                  onClick={() => executeAll.mutate()}
                  className="bg-green-600 hover:bg-green-700 text-white gap-1.5"
                >
                  <Play size={14} />
                  {executeAll.isPending ? 'Executando...' : `Executar tudo (${pendingCount})`}
                </Button>
              )}
            </div>
          )}
        </div>

        {markReady.error && (
          <p className="text-xs text-red-500">
            {(markReady.error as { response?: { data?: { message?: string } } })?.response?.data?.message ?? 'Erro'}
          </p>
        )}
        {executeAll.error && (
          <p className="text-xs text-red-500">
            {(executeAll.error as { response?: { data?: { message?: string } } })?.response?.data?.message ?? 'Erro ao executar'}
          </p>
        )}
      </div>

      {/* Modals */}
      {showAddOutput && (
        <AddOutputModal
          exchangeId={id}
          sectorId={exchange.sectorId}
          open={showAddOutput}
          onClose={() => setShowAddOutput(false)}
        />
      )}
      {showAddInput && (
        <AddInputModal
          exchangeId={id}
          open={showAddInput}
          onClose={() => setShowAddInput(false)}
        />
      )}
    </div>
  );
}
