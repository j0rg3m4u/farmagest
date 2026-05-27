'use client';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { createSectorSchema, type CreateSectorInput } from '@farmagest/shared';
import { useCreateSector } from '@/hooks/use-sectors';
import { PageHeader } from '@/components/shared/PageHeader';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { ArrowLeft } from 'lucide-react';

export default function NovoSetorPage() {
  const router = useRouter();
  const createSector = useCreateSector();

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<CreateSectorInput>({
    resolver: zodResolver(createSectorSchema),
  });

  async function onSubmit(data: CreateSectorInput) {
    try {
      await createSector.mutateAsync(data);
      toast.success('Setor criado com sucesso');
      router.push('/setores');
    } catch (err: any) {
      toast.error(err.response?.data?.message ?? 'Erro ao criar setor');
    }
  }

  return (
    <div className="p-6 max-w-2xl">
      <PageHeader title="Novo Setor" />

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
          <Input placeholder="Ex: Medicamentos" {...register('name')} />
          {errors.name && <p className="text-xs text-red-600">{errors.name.message}</p>}
        </div>

        <div className="space-y-1.5">
          <Label>
            Código{' '}
            <span className="text-slate-400 text-xs">maiúsculas e números, máx 10</span>
          </Label>
          <Input placeholder="Ex: MED" className="font-mono uppercase" {...register('code')} />
          {errors.code && <p className="text-xs text-red-600">{errors.code.message}</p>}
        </div>

        <div className="space-y-1.5">
          <Label>Responsável</Label>
          <Input placeholder="Nome do responsável" {...register('responsible')} />
          {errors.responsible && <p className="text-xs text-red-600">{errors.responsible.message}</p>}
        </div>

        <div className="space-y-1.5">
          <Label>
            Descrição <span className="text-slate-400 text-xs">(opcional)</span>
          </Label>
          <Textarea
            placeholder="Descreva o setor…"
            rows={3}
            {...register('description')}
          />
          {errors.description && <p className="text-xs text-red-600">{errors.description.message}</p>}
        </div>

        <div className="flex justify-end gap-3 pt-2">
          <Button type="button" variant="outline" onClick={() => router.back()}>
            Cancelar
          </Button>
          <Button
            type="submit"
            className="bg-pmdc-blue hover:bg-pmdc-blue-dark text-white"
            disabled={createSector.isPending}
          >
            {createSector.isPending ? 'Salvando…' : 'Criar Setor'}
          </Button>
        </div>
      </form>
    </div>
  );
}
