'use client';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { createExternalPartnerSchema, type CreateExternalPartnerInput } from '@farmagest/shared';
import { useCreateExternalPartner } from '@/hooks/use-external-partners';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { ArrowLeft } from 'lucide-react';
import Link from 'next/link';

export default function NovoParceiroPag() {
  const router = useRouter();
  const createMutation = useCreateExternalPartner();

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<CreateExternalPartnerInput>({
    resolver: zodResolver(createExternalPartnerSchema),
  });

  async function onSubmit(data: CreateExternalPartnerInput) {
    await createMutation.mutateAsync(data);
    router.push('/parceiros');
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
          <h1 className="text-2xl font-semibold text-slate-900">Novo Município Parceiro</h1>
          <p className="text-slate-500 text-sm">Cadastrar município para trocas inter-municipais</p>
        </div>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="bg-white rounded-lg border p-6 space-y-5">
        <div className="space-y-2">
          <Label htmlFor="name">Nome do Município *</Label>
          <Input id="name" {...register('name')} placeholder="Ex: Belford Roxo" />
          {errors.name && <p className="text-xs text-red-500">{errors.name.message}</p>}
        </div>

        <div className="space-y-2">
          <Label htmlFor="cnpj">CNPJ</Label>
          <Input id="cnpj" {...register('cnpj')} placeholder="00.000.000/0000-00" />
          {errors.cnpj && <p className="text-xs text-red-500">{errors.cnpj.message}</p>}
        </div>

        <div className="space-y-2">
          <Label htmlFor="responsibleName">Nome do Responsável</Label>
          <Input id="responsibleName" {...register('responsibleName')} placeholder="Nome completo" />
          {errors.responsibleName && (
            <p className="text-xs text-red-500">{errors.responsibleName.message}</p>
          )}
        </div>

        <div className="space-y-2">
          <Label htmlFor="contact">Contato</Label>
          <Input
            id="contact"
            {...register('contact')}
            placeholder="Telefone, e-mail ou outro"
          />
          {errors.contact && <p className="text-xs text-red-500">{errors.contact.message}</p>}
        </div>

        <div className="space-y-2">
          <Label htmlFor="notes">Observações</Label>
          <Textarea id="notes" {...register('notes')} rows={3} placeholder="Informações adicionais..." />
          {errors.notes && <p className="text-xs text-red-500">{errors.notes.message}</p>}
        </div>

        {createMutation.error && (
          <p className="text-sm text-red-500">
            {(createMutation.error as { response?: { data?: { message?: string } } })?.response?.data?.message ?? 'Erro ao cadastrar município'}
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
            disabled={isSubmitting || createMutation.isPending}
            className="bg-pmdc-blue hover:bg-pmdc-blue-dark text-white"
          >
            {createMutation.isPending ? 'Salvando...' : 'Salvar'}
          </Button>
        </div>
      </form>
    </div>
  );
}
