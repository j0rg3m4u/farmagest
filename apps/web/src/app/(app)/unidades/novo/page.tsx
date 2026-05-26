'use client';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { createUnitSchema, UNIT_TYPE_LABELS, UnitType, type CreateUnitInput } from '@farmagest/shared';
import { useCreateUnit } from '@/hooks/use-units';
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

export default function NovaUnidadePage() {
  const router = useRouter();
  const createUnit = useCreateUnit();

  const {
    register,
    handleSubmit,
    setValue,
    formState: { errors },
  } = useForm<CreateUnitInput>({
    resolver: zodResolver(createUnitSchema),
  });

  async function onSubmit(data: CreateUnitInput) {
    try {
      await createUnit.mutateAsync(data);
      toast.success('Unidade criada com sucesso');
      router.push('/unidades');
    } catch (err: any) {
      toast.error(err.response?.data?.message ?? 'Erro ao criar unidade');
    }
  }

  return (
    <div className="p-6 max-w-2xl">
      <PageHeader title="Nova Unidade" />

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
          <Input placeholder="Ex: UBS Jardim Primavera" {...register('name')} />
          {errors.name && <p className="text-xs text-red-600">{errors.name.message}</p>}
        </div>

        <div className="space-y-1.5">
          <Label>Tipo</Label>
          <Select onValueChange={(v) => setValue('type', v as UnitType)}>
            <SelectTrigger>
              <SelectValue placeholder="Selecione o tipo" />
            </SelectTrigger>
            <SelectContent>
              {Object.entries(UNIT_TYPE_LABELS).map(([k, v]) => (
                <SelectItem key={k} value={k}>{v}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          {errors.type && <p className="text-xs text-red-600">{errors.type.message}</p>}
        </div>

        <div className="space-y-1.5">
          <Label>Responsável</Label>
          <Input placeholder="Nome do responsável" {...register('responsible')} />
          {errors.responsible && <p className="text-xs text-red-600">{errors.responsible.message}</p>}
        </div>

        <div className="space-y-1.5">
          <Label>Endereço <span className="text-slate-400 text-xs">(opcional)</span></Label>
          <Input placeholder="Rua, número — bairro, cidade/UF" {...register('address')} />
        </div>

        <div className="space-y-1.5">
          <Label>Contato <span className="text-slate-400 text-xs">(opcional)</span></Label>
          <Input placeholder="(21) 0000-0000" {...register('contact')} />
        </div>

        <div className="flex justify-end gap-3 pt-2">
          <Button type="button" variant="outline" onClick={() => router.back()}>
            Cancelar
          </Button>
          <Button
            type="submit"
            className="bg-pmdc-blue hover:bg-pmdc-blue-dark text-white"
            disabled={createUnit.isPending}
          >
            {createUnit.isPending ? 'Salvando…' : 'Criar Unidade'}
          </Button>
        </div>
      </form>
    </div>
  );
}
