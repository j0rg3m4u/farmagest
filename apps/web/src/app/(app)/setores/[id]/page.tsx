'use client';
import { use } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { updateSectorSchema, UserRole, type UpdateSectorInput } from '@farmagest/shared';
import { useSector, useUpdateSector } from '@/hooks/use-sectors';
import { useAuthStore } from '@/stores/auth-store';
import { PageHeader } from '@/components/shared/PageHeader';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { ArrowLeft } from 'lucide-react';

export default function SetorPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const router = useRouter();
  const user = useAuthStore((s) => s.user);
  const canEdit = user?.role === UserRole.COORDINATION || user?.role === UserRole.MANAGER;

  const { data: sector, isLoading } = useSector(id);
  const updateSector = useUpdateSector(id);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<UpdateSectorInput>({
    resolver: zodResolver(updateSectorSchema),
    values: sector
      ? {
          name: sector.name,
          code: sector.code,
          responsible: sector.responsible,
          description: sector.description ?? undefined,
          active: sector.active,
        }
      : undefined,
  });

  async function onSubmit(data: UpdateSectorInput) {
    try {
      await updateSector.mutateAsync(data);
      toast.success('Setor atualizado com sucesso');
      router.push('/setores');
    } catch (err: any) {
      toast.error(err.response?.data?.message ?? 'Erro ao atualizar setor');
    }
  }

  if (isLoading) return <div className="p-6 text-slate-400">Carregando…</div>;
  if (!sector) return <div className="p-6 text-slate-400">Setor não encontrado</div>;

  return (
    <div className="p-6 max-w-2xl">
      <PageHeader title={sector.name} />

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
          <Input {...register('name')} disabled={!canEdit} />
          {errors.name && <p className="text-xs text-red-600">{errors.name.message}</p>}
        </div>

        <div className="space-y-1.5">
          <Label>Código</Label>
          <Input className="font-mono" {...register('code')} disabled={!canEdit} />
          {errors.code && <p className="text-xs text-red-600">{errors.code.message}</p>}
        </div>

        <div className="space-y-1.5">
          <Label>Responsável</Label>
          <Input {...register('responsible')} disabled={!canEdit} />
          {errors.responsible && <p className="text-xs text-red-600">{errors.responsible.message}</p>}
        </div>

        <div className="space-y-1.5">
          <Label>Descrição</Label>
          <Textarea rows={3} {...register('description')} disabled={!canEdit} />
        </div>

        {canEdit && (
          <div className="flex justify-end gap-3 pt-2">
            <Button type="button" variant="outline" onClick={() => router.back()}>
              Cancelar
            </Button>
            <Button
              type="submit"
              className="bg-pmdc-blue hover:bg-pmdc-blue-dark text-white"
              disabled={updateSector.isPending}
            >
              {updateSector.isPending ? 'Salvando…' : 'Salvar Alterações'}
            </Button>
          </div>
        )}
      </form>
    </div>
  );
}
