'use client';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { toast } from 'sonner';
import { createLotSchema, type CreateLotInput } from '@farmagest/shared';
import { useCreateLot } from '@/hooks/use-lots';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';

interface NewLotDialogProps {
  open: boolean;
  onClose: () => void;
  itemId: string;
}

export function NewLotDialog({ open, onClose, itemId }: NewLotDialogProps) {
  const createLot = useCreateLot();

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<CreateLotInput>({
    resolver: zodResolver(createLotSchema),
    defaultValues: { itemId },
  });

  async function onSubmit(data: CreateLotInput) {
    // date inputs return YYYY-MM-DD — convert to ISO datetime for backend
    const payload: CreateLotInput = {
      ...data,
      expirationDate: data.expirationDate
        ? new Date(data.expirationDate + 'T00:00:00.000Z').toISOString()
        : data.expirationDate,
      manufacturingDate: data.manufacturingDate
        ? new Date(data.manufacturingDate + 'T00:00:00.000Z').toISOString()
        : null,
    };
    try {
      const lot = await createLot.mutateAsync(payload);
      toast.success(`Lote ${(lot as any).lotNumber} criado`);
      reset({ itemId });
      onClose();
    } catch (err: any) {
      toast.error(err.response?.data?.message ?? 'Erro ao criar lote');
    }
  }

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Novo Lote</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4 mt-2">
          <input type="hidden" {...register('itemId')} />

          <div className="space-y-1.5">
            <Label>Número do lote</Label>
            <Input placeholder="Ex: LT-2026-0001" {...register('lotNumber')} />
            {errors.lotNumber && <p className="text-xs text-red-600">{errors.lotNumber.message}</p>}
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label>Data de fabricação <span className="text-slate-400 text-xs">(opcional)</span></Label>
              <Input type="date" {...register('manufacturingDate')} />
            </div>
            <div className="space-y-1.5">
              <Label>Data de validade</Label>
              <Input type="date" {...register('expirationDate')} />
              {errors.expirationDate && (
                <p className="text-xs text-red-600">{errors.expirationDate.message}</p>
              )}
            </div>
          </div>

          <div className="space-y-1.5">
            <Label>Quantidade inicial</Label>
            <Input
              type="number"
              step="0.001"
              min="0.001"
              placeholder="Ex: 500"
              {...register('initialQuantity', { valueAsNumber: true })}
            />
            {errors.initialQuantity && (
              <p className="text-xs text-red-600">{errors.initialQuantity.message}</p>
            )}
          </div>

          <div className="space-y-1.5">
            <Label>Fornecedor <span className="text-slate-400 text-xs">(opcional)</span></Label>
            <Input placeholder="Nome do fornecedor" {...register('supplier')} />
          </div>

          <div className="space-y-1.5">
            <Label>Nota fiscal <span className="text-slate-400 text-xs">(opcional)</span></Label>
            <Input placeholder="Ex: NF 12345" {...register('invoiceNumber')} />
          </div>

          <div className="space-y-1.5">
            <Label>Observações <span className="text-slate-400 text-xs">(opcional)</span></Label>
            <Textarea rows={2} placeholder="Observações sobre este lote…" {...register('notes')} />
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose} disabled={createLot.isPending}>
              Cancelar
            </Button>
            <Button
              type="submit"
              className="bg-pmdc-blue hover:bg-pmdc-blue-dark text-white"
              disabled={createLot.isPending}
            >
              {createLot.isPending ? 'Salvando…' : 'Criar Lote'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
