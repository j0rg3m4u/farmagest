'use client';
import { useParams, useRouter } from 'next/navigation';
import { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { updateExternalPartnerSchema, type UpdateExternalPartnerInput } from '@farmagest/shared';
import { useExternalPartner, useUpdateExternalPartner } from '@/hooks/use-external-partners';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { ArrowLeft } from 'lucide-react';
import Link from 'next/link';

export default function EditarParceiroPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const { data: partner, isLoading } = useExternalPartner(id);
  const updateMutation = useUpdateExternalPartner(id);

  const {
    register,
    handleSubmit,
    reset,
    watch,
    setValue,
    formState: { errors, isSubmitting },
  } = useForm<UpdateExternalPartnerInput>({
    resolver: zodResolver(updateExternalPartnerSchema),
  });

  useEffect(() => {
    if (partner) {
      reset({
        name: partner.name,
        cnpj: partner.cnpj ?? undefined,
        responsibleName: partner.responsibleName ?? undefined,
        contact: partner.contact ?? undefined,
        notes: partner.notes ?? undefined,
        active: partner.active,
      });
    }
  }, [partner, reset]);

  async function onSubmit(data: UpdateExternalPartnerInput) {
    await updateMutation.mutateAsync(data);
    router.push('/parceiros');
  }

  if (isLoading) {
    return (
      <div className="p-6 text-slate-400">Carregando...</div>
    );
  }

  if (!partner) {
    return (
      <div className="p-6 text-slate-500">Município não encontrado.</div>
    );
  }

  return (
    <div className="p-6 max-w-2xl space-y-6">
      <div className="flex items-center gap-3">
        <Link href="/parceiros">
          <Button size="sm" variant="ghost" className="gap-1.5">
            <ArrowLeft size={16} /> Voltar
          </Button>
        </Link>
        <div>
          <h1 className="text-2xl font-semibold text-slate-900">Editar Município Parceiro</h1>
          <p className="text-slate-500 text-sm">{partner.name}</p>
        </div>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="bg-white rounded-lg border p-6 space-y-5">
        <div className="space-y-2">
          <Label htmlFor="name">Nome do Município *</Label>
          <Input id="name" {...register('name')} />
          {errors.name && <p className="text-xs text-red-500">{errors.name.message}</p>}
        </div>

        <div className="space-y-2">
          <Label htmlFor="cnpj">CNPJ</Label>
          <Input id="cnpj" {...register('cnpj')} placeholder="00.000.000/0000-00" />
          {errors.cnpj && <p className="text-xs text-red-500">{errors.cnpj.message}</p>}
        </div>

        <div className="space-y-2">
          <Label htmlFor="responsibleName">Nome do Responsável</Label>
          <Input id="responsibleName" {...register('responsibleName')} />
          {errors.responsibleName && (
            <p className="text-xs text-red-500">{errors.responsibleName.message}</p>
          )}
        </div>

        <div className="space-y-2">
          <Label htmlFor="contact">Contato</Label>
          <Input id="contact" {...register('contact')} />
          {errors.contact && <p className="text-xs text-red-500">{errors.contact.message}</p>}
        </div>

        <div className="space-y-2">
          <Label htmlFor="notes">Observações</Label>
          <Textarea id="notes" {...register('notes')} rows={3} />
          {errors.notes && <p className="text-xs text-red-500">{errors.notes.message}</p>}
        </div>

        <div className="flex items-center gap-3">
          <input
            type="checkbox"
            id="active"
            className="h-4 w-4 rounded border-slate-300"
            checked={watch('active') ?? true}
            onChange={(e) => setValue('active', e.target.checked)}
          />
          <Label htmlFor="active">Município ativo</Label>
        </div>

        {updateMutation.error && (
          <p className="text-sm text-red-500">
            {(updateMutation.error as { response?: { data?: { message?: string } } })?.response?.data?.message ?? 'Erro ao salvar alterações'}
          </p>
        )}

        <div className="flex justify-end gap-3 pt-2">
          <Link href="/parceiros">
            <Button type="button" variant="outline">
              Cancelar
            </Button>
          </Link>
          <Button
            type="submit"
            disabled={isSubmitting || updateMutation.isPending}
            className="bg-pmdc-blue hover:bg-pmdc-blue-dark text-white"
          >
            {updateMutation.isPending ? 'Salvando...' : 'Salvar Alterações'}
          </Button>
        </div>
      </form>
    </div>
  );
}
