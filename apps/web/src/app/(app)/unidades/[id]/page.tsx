'use client';
import { use } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { updateUnitSchema, UNIT_TYPE_LABELS, UnitType, type UpdateUnitInput } from '@farmagest/shared';
import { useUnit, useUpdateUnit } from '@/hooks/use-units';
import { useAuthStore } from '@/stores/auth-store';
import { canEditUnits } from '@/lib/permissions';
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
import { ArrowLeft } from 'lucide-react';

export default function UnidadePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const router = useRouter();
  const user = useAuthStore((s) => s.user);
  const canManage = canEditUnits(user);

  const { data: unit, isLoading } = useUnit(id);
  const updateUnit = useUpdateUnit(id);

  const {
    register,
    handleSubmit,
    setValue,
    formState: { errors },
  } = useForm<UpdateUnitInput>({
    resolver: zodResolver(updateUnitSchema),
    values: unit
      ? {
          name: unit.name,
          type: unit.type as UnitType,
          responsible: unit.responsible,
          address: unit.address ?? undefined,
          contact: unit.contact ?? undefined,
          active: unit.active,
        }
      : undefined,
  });

  async function onSubmit(data: UpdateUnitInput) {
    try {
      await updateUnit.mutateAsync(data);
      toast.success('Unidade atualizada com sucesso');
      router.push('/unidades');
    } catch (err: any) {
      toast.error(err.response?.data?.message ?? 'Erro ao atualizar unidade');
    }
  }

  if (isLoading) return <div className="p-6 text-slate-400">Carregando…</div>;
  if (!unit) return <div className="p-6 text-slate-400">Unidade não encontrada</div>;

  return (
    <div className="p-6 max-w-2xl">
      <PageHeader title={unit.name} />

      <Button
        variant="ghost"
        size="sm"
        className="mb-6 gap-1.5 text-slate-500"
        onClick={() => router.back()}
      >
        <ArrowLeft size={16} /> Voltar
      </Button>

      <form onSubmit={handleSubmit(onSubmit)} className="bg-white rounded-lg border p-6 space-y-5">
        <div className="space-y-1.5">
          <Label>Nome</Label>
          <Input {...register('name')} disabled={!canManage} />
          {errors.name && <p className="text-xs text-red-600">{errors.name.message}</p>}
        </div>

        <div className="space-y-1.5">
          <Label>Tipo</Label>
          <Select
            defaultValue={unit.type}
            onValueChange={(v) => setValue('type', v as UnitType)}
            disabled={!canManage}
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {Object.entries(UNIT_TYPE_LABELS).map(([k, v]) => (
                <SelectItem key={k} value={k}>{v}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-1.5">
          <Label>Responsável</Label>
          <Input {...register('responsible')} disabled={!canManage} />
          {errors.responsible && <p className="text-xs text-red-600">{errors.responsible.message}</p>}
        </div>

        <div className="space-y-1.5">
          <Label>Endereço</Label>
          <Input {...register('address')} disabled={!canManage} />
        </div>

        <div className="space-y-1.5">
          <Label>Contato</Label>
          <Input {...register('contact')} disabled={!canManage} />
        </div>

        {canManage && (
          <div className="flex justify-end gap-3 pt-2">
            <Button type="button" variant="outline" onClick={() => router.back()}>
              Cancelar
            </Button>
            <Button
              type="submit"
              className="bg-pmdc-blue hover:bg-pmdc-blue-dark text-white"
              disabled={updateUnit.isPending}
            >
              {updateUnit.isPending ? 'Salvando…' : 'Salvar Alterações'}
            </Button>
          </div>
        )}
      </form>
    </div>
  );
}
