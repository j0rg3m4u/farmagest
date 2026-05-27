'use client';
import { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import {
  createItemSchema,
  ITEM_CATEGORY_LABELS,
  ItemCategory,
  UserRole,
  type CreateItemInput,
} from '@farmagest/shared';
import { useCreateItem } from '@/hooks/use-items';
import { useSectors } from '@/hooks/use-sectors';
import { useAuthStore } from '@/stores/auth-store';
import { PageHeader } from '@/components/shared/PageHeader';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { ArrowLeft, Info } from 'lucide-react';

export default function NovoItemPage() {
  const router = useRouter();
  const user = useAuthStore((s) => s.user);
  const isManager = user?.role === UserRole.MANAGER;
  const createItem = useCreateItem();
  const { data: sectorsData } = useSectors({ active: 'true', limit: 100 });

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    formState: { errors },
  } = useForm<CreateItemInput>({
    resolver: zodResolver(createItemSchema) as any,
    defaultValues: { controlled344: false },
  });

  const selectedSectorId = watch('sectorId');

  // Auto-populate sectorId for non-MANAGER
  useEffect(() => {
    if (!isManager && user?.sectorId) {
      setValue('sectorId', user.sectorId);
    }
  }, [isManager, user?.sectorId, setValue]);

  // Auto-suggest category based on sector code
  useEffect(() => {
    if (!selectedSectorId || !sectorsData) return;
    const sector = sectorsData.data.find((s) => s.id === selectedSectorId);
    if (!sector) return;
    if (sector.code === 'MED') setValue('category', ItemCategory.MEDICATION);
    else if (sector.code === 'COR') setValue('category', ItemCategory.CORRELATE);
  }, [selectedSectorId, sectorsData, setValue]);

  const selectedSector = sectorsData?.data.find((s) => s.id === selectedSectorId);
  const nextCode = selectedSector
    ? `${selectedSector.code}-${String((selectedSector as any).itemSequence + 1).padStart(4, '0')}`
    : null;

  async function onSubmit(data: any) {
    try {
      const item = await createItem.mutateAsync(data as CreateItemInput);
      toast.success(`Item criado: ${(item as any).code}`);
      router.push(`/itens/${(item as any).id}`);
    } catch (err: any) {
      toast.error(err.response?.data?.message ?? 'Erro ao criar item');
    }
  }

  return (
    <div className="p-6 max-w-2xl">
      <PageHeader title="Novo Item" />

      <Button
        variant="ghost"
        size="sm"
        className="mb-6 gap-1.5 text-slate-500"
        onClick={() => router.back()}
      >
        <ArrowLeft size={16} /> Voltar
      </Button>

      <form onSubmit={handleSubmit(onSubmit)} className="bg-white rounded-lg border p-6 space-y-5">
        {/* Setor */}
        <div className="space-y-1.5">
          <Label>Setor</Label>
          {isManager ? (
            <Select onValueChange={(v) => setValue('sectorId', (v as string) ?? '')}>
              <SelectTrigger>
                <SelectValue placeholder="Selecione o setor" />
              </SelectTrigger>
              <SelectContent>
                {sectorsData?.data.map((s) => (
                  <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          ) : (
            <Input value={selectedSector?.name ?? user?.sector?.name ?? '—'} disabled />
          )}
          {errors.sectorId && <p className="text-xs text-red-600">{errors.sectorId.message}</p>}
        </div>

        {/* Código informativo */}
        {nextCode && (
          <div className="flex items-center gap-2 text-sm text-slate-500 bg-slate-50 rounded-lg px-3 py-2">
            <Info size={14} className="shrink-0 text-pmdc-blue" />
            Código gerado automaticamente:{' '}
            <span className="font-mono font-semibold text-slate-700">{nextCode}</span>
          </div>
        )}

        {/* Descrição */}
        <div className="space-y-1.5">
          <Label>Descrição</Label>
          <Input placeholder="Ex: Dipirona sódica 500mg cp" {...register('description')} />
          {errors.description && <p className="text-xs text-red-600">{errors.description.message}</p>}
        </div>

        {/* Categoria */}
        <div className="space-y-1.5">
          <Label>Categoria</Label>
          <Select
            value={watch('category') ?? ''}
            onValueChange={(v) => setValue('category', v as ItemCategory)}
          >
            <SelectTrigger>
              <SelectValue placeholder="Selecione a categoria" />
            </SelectTrigger>
            <SelectContent>
              {Object.entries(ITEM_CATEGORY_LABELS).map(([k, v]) => (
                <SelectItem key={k} value={k}>{v}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          {errors.category && <p className="text-xs text-red-600">{errors.category.message}</p>}
        </div>

        {/* Unidade de medida */}
        <div className="space-y-1.5">
          <Label>Unidade de medida</Label>
          <Input placeholder="Ex: cp, ml, frasco, un, kg" {...register('unitOfMeasure')} />
          {errors.unitOfMeasure && <p className="text-xs text-red-600">{errors.unitOfMeasure.message}</p>}
        </div>

        {/* Fabricante */}
        <div className="space-y-1.5">
          <Label>Fabricante <span className="text-slate-400 text-xs">(opcional)</span></Label>
          <Input placeholder="Ex: EMS, Eurofarma" {...register('manufacturer')} />
        </div>

        {/* Portaria 344/98 */}
        <div className="flex items-center gap-2">
          <input
            type="checkbox"
            id="controlled344"
            className="h-4 w-4 rounded border-slate-300"
            {...register('controlled344')}
          />
          <Label htmlFor="controlled344" className="cursor-pointer">
            Controlado pela Portaria 344/98 (psicotrópico / entorpecente)
          </Label>
        </div>

        <div className="flex justify-end gap-3 pt-2">
          <Button type="button" variant="outline" onClick={() => router.back()}>
            Cancelar
          </Button>
          <Button
            type="submit"
            className="bg-pmdc-blue hover:bg-pmdc-blue-dark text-white"
            disabled={createItem.isPending}
          >
            {createItem.isPending ? 'Salvando…' : 'Criar Item'}
          </Button>
        </div>
      </form>
    </div>
  );
}
