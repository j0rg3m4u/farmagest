'use client';
import { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { toast } from 'sonner';
import { entryPurchaseSchema, type EntryPurchaseInput } from '@farmagest/shared';
import { useEntryPurchase } from '@/hooks/use-movements';
import { useItemLots } from '@/hooks/use-lots';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

interface Props {
  open: boolean;
  onClose: () => void;
  itemId: string;
  itemDescription: string;
}

export function EntryPurchaseDialog({ open, onClose, itemId, itemDescription }: Props) {
  const { data: lotsData } = useItemLots(itemId);
  const entryPurchase = useEntryPurchase();

  const {
    register,
    handleSubmit,
    setValue,
    reset,
    formState: { errors },
  } = useForm<EntryPurchaseInput>({
    resolver: zodResolver(entryPurchaseSchema),
    defaultValues: { itemId },
  });

  useEffect(() => {
    if (open) reset({ itemId });
  }, [open, itemId, reset]);

  async function onSubmit(data: EntryPurchaseInput) {
    try {
      await entryPurchase.mutateAsync(data);
      toast.success('Entrada registrada com sucesso');
      onClose();
    } catch (err: any) {
      toast.error(err.response?.data?.message ?? 'Erro ao registrar entrada');
    }
  }

  const activeLots = lotsData?.data.filter((l) => l.active) ?? [];

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Nova Entrada — Compra</DialogTitle>
          <p className="text-sm text-slate-500 mt-1">{itemDescription}</p>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4 pt-2">
          <div className="space-y-1.5">
            <Label>Lote</Label>
            <Select onValueChange={(v) => { if (v) setValue('lotId', v as string); }}>
              <SelectTrigger>
                <SelectValue placeholder="Selecione o lote…" />
              </SelectTrigger>
              <SelectContent>
                {activeLots.map((lot) => (
                  <SelectItem key={lot.id} value={lot.id}>
                    {lot.lotNumber} — val. {new Date(lot.expirationDate).toLocaleDateString('pt-BR')} (saldo: {lot.currentBalance})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {errors.lotId && <p className="text-xs text-red-600">{errors.lotId.message}</p>}
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>Quantidade</Label>
              <Input
                type="number"
                step="0.001"
                min="0"
                placeholder="0"
                {...register('quantity', { valueAsNumber: true })}
              />
              {errors.quantity && <p className="text-xs text-red-600">{errors.quantity.message}</p>}
            </div>

            <div className="space-y-1.5">
              <Label>Valor unitário <span className="text-slate-400 text-xs">(opcional)</span></Label>
              <Input
                type="number"
                step="0.0001"
                min="0"
                placeholder="R$ 0,00"
                {...register('unitValue', { valueAsNumber: true })}
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <Label>Nota fiscal <span className="text-slate-400 text-xs">(opcional)</span></Label>
            <Input placeholder="Ex: NF 12345" {...register('invoiceNumber')} />
          </div>

          <div className="space-y-1.5">
            <Label>Observação <span className="text-slate-400 text-xs">(opcional)</span></Label>
            <Input placeholder="Observações…" {...register('reason')} />
          </div>

          <div className="flex justify-end gap-3 pt-2">
            <Button type="button" variant="outline" onClick={onClose}>
              Cancelar
            </Button>
            <Button
              type="submit"
              className="bg-pmdc-blue hover:bg-pmdc-blue-dark text-white"
              disabled={entryPurchase.isPending}
            >
              {entryPurchase.isPending ? 'Registrando…' : 'Registrar Entrada'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
