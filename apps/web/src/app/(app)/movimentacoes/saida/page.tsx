'use client';
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { exitSupplySchema, type ExitSupplyInput } from '@farmagest/shared';
import { useExitSupply, useFefoSuggestion } from '@/hooks/use-movements';
import { useItems } from '@/hooks/use-items';
import { useItemLots } from '@/hooks/use-lots';
import { useUnits } from '@/hooks/use-units';
import { PageHeader } from '@/components/shared/PageHeader';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { ArrowLeft, Info } from 'lucide-react';

export default function SaidaPage() {
  const router = useRouter();
  const exitSupply = useExitSupply();

  const [selectedItemId, setSelectedItemId] = useState('');
  const [itemSearch, setItemSearch] = useState('');
  const [quantity, setQuantity] = useState(0);

  const { data: itemsData } = useItems({ search: itemSearch || undefined, limit: 20 } as any);
  const { data: lotsData } = useItemLots(selectedItemId);
  const { data: unitsData } = useUnits({ active: 'true', limit: 100 });
  const { data: fefo } = useFefoSuggestion(selectedItemId, quantity);

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    formState: { errors },
  } = useForm<ExitSupplyInput>({
    resolver: zodResolver(exitSupplySchema),
  });

  const watchedQuantity = watch('quantity');

  async function onSubmit(data: ExitSupplyInput) {
    try {
      await exitSupply.mutateAsync(data);
      toast.success('Saída registrada com sucesso');
      router.push('/movimentacoes');
    } catch (err: any) {
      toast.error(err.response?.data?.message ?? 'Erro ao registrar saída');
    }
  }

  const activeLots = lotsData?.data.filter((l) => l.active && Number(l.currentBalance) > 0) ?? [];

  return (
    <div className="p-6 max-w-2xl">
      <PageHeader title="Nova Saída — Abastecimento" />

      <Button
        variant="ghost"
        size="sm"
        className="mb-6 gap-1.5 text-slate-500"
        onClick={() => router.back()}
      >
        <ArrowLeft size={16} /> Voltar
      </Button>

      <form onSubmit={handleSubmit(onSubmit)} className="bg-white rounded-lg border p-6 space-y-5">
        {/* Item */}
        <div className="space-y-1.5">
          <Label>Item</Label>
          <Input
            placeholder="Buscar item por descrição ou código…"
            value={itemSearch}
            onChange={(e) => setItemSearch(e.target.value)}
          />
          {itemsData?.data.length ? (
            <div className="border rounded-md divide-y max-h-48 overflow-y-auto">
              {itemsData.data.map((item) => (
                <button
                  key={item.id}
                  type="button"
                  className={[
                    'w-full text-left px-3 py-2 text-sm hover:bg-slate-50',
                    selectedItemId === item.id ? 'bg-pmdc-blue/5 font-medium' : '',
                  ].join(' ')}
                  onClick={() => {
                    setSelectedItemId(item.id);
                    setValue('itemId', item.id);
                    setItemSearch(item.description);
                    setValue('lotId', undefined);
                  }}
                >
                  <span className="font-mono text-xs text-slate-400 mr-2">{item.code}</span>
                  {item.description}
                </button>
              ))}
            </div>
          ) : null}
          {errors.itemId && <p className="text-xs text-red-600">{errors.itemId.message}</p>}
        </div>

        {/* Unidade destino */}
        <div className="space-y-1.5">
          <Label>Unidade de destino</Label>
          <Select onValueChange={(v) => { if (v) setValue('unitId', v as string); }}>
            <SelectTrigger>
              <SelectValue placeholder="Selecione a unidade…" />
            </SelectTrigger>
            <SelectContent>
              {unitsData?.data.map((unit) => (
                <SelectItem key={unit.id} value={unit.id}>{unit.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          {errors.unitId && <p className="text-xs text-red-600">{errors.unitId.message}</p>}
        </div>

        {/* Quantidade */}
        <div className="space-y-1.5">
          <Label>Quantidade</Label>
          <Input
            type="number"
            step="0.001"
            min="0"
            placeholder="0"
            {...register('quantity', {
              valueAsNumber: true,
              onChange: (e) => setQuantity(parseFloat(e.target.value) || 0),
            })}
          />
          {errors.quantity && <p className="text-xs text-red-600">{errors.quantity.message}</p>}
        </div>

        {/* Sugestão FEFO */}
        {fefo && selectedItemId && quantity > 0 && (
          <div className={[
            'rounded-lg p-4 text-sm space-y-2',
            fefo.fullyAllocated ? 'bg-green-50 border border-green-200' : 'bg-red-50 border border-red-200',
          ].join(' ')}>
            <div className="flex items-center gap-2 font-medium">
              <Info size={14} />
              Sugestão FEFO — {fefo.fullyAllocated ? 'Saldo suficiente' : `Saldo insuficiente (faltam ${fefo.shortBy})`}
            </div>
            {fefo.allocation.map((alloc) => (
              <div key={alloc.lotId} className="text-xs text-slate-600 ml-4">
                Lote {alloc.lotNumber} — val. {new Date(alloc.expirationDate).toLocaleDateString('pt-BR')}:
                {' '}<strong>{alloc.quantity}</strong> un. (disponível: {alloc.available})
              </div>
            ))}
          </div>
        )}

        {/* Override de lote (opcional) */}
        {selectedItemId && activeLots.length > 0 && (
          <div className="space-y-1.5">
            <Label>
              Lote específico{' '}
              <span className="text-slate-400 text-xs">(opcional — deixe em branco para FEFO automático)</span>
            </Label>
            <Select onValueChange={(v) => setValue('lotId', !v || v === 'auto' ? undefined : v as string)}>
              <SelectTrigger>
                <SelectValue placeholder="FEFO automático" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="auto">FEFO automático</SelectItem>
                {activeLots.map((lot) => (
                  <SelectItem key={lot.id} value={lot.id}>
                    {lot.lotNumber} — val. {new Date(lot.expirationDate).toLocaleDateString('pt-BR')} (saldo: {lot.currentBalance})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        )}

        <div className="space-y-1.5">
          <Label>Observação <span className="text-slate-400 text-xs">(opcional)</span></Label>
          <Input placeholder="Observações…" {...register('reason')} />
        </div>

        <div className="flex justify-end gap-3 pt-2">
          <Button type="button" variant="outline" onClick={() => router.back()}>
            Cancelar
          </Button>
          <Button
            type="submit"
            className="bg-pmdc-blue hover:bg-pmdc-blue-dark text-white"
            disabled={exitSupply.isPending || (fefo ? !fefo.fullyAllocated : false)}
          >
            {exitSupply.isPending ? 'Registrando…' : 'Registrar Saída'}
          </Button>
        </div>
      </form>
    </div>
  );
}
