'use client';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { createExchangeSchema, type CreateExchangeInput } from '@farmagest/shared';
import { useCreateExchange } from '@/hooks/use-exchanges';
import { useExternalPartners } from '@/hooks/use-external-partners';
import { useSectors } from '@/hooks/use-sectors';
import { useAuthStore } from '@/stores/auth-store';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { ArrowLeft } from 'lucide-react';
import Link from 'next/link';

export default function NovaTrocaPage() {
  const router = useRouter();
  const user = useAuthStore((s) => s.user);
  const createMutation = useCreateExchange();
  const { data: partners } = useExternalPartners({ active: 'true', limit: 100 });
  const { data: sectors } = useSectors();

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<CreateExchangeInput>({
    resolver: zodResolver(createExchangeSchema),
    defaultValues: {
      sectorId: user?.sectorId ?? '',
      date: new Date().toISOString().slice(0, 10),
    },
  });

  async function onSubmit(data: CreateExchangeInput) {
    const date = data.date ? new Date(data.date).toISOString() : undefined;
    const exchange = await createMutation.mutateAsync({ ...data, date });
    router.push(`/trocas/${exchange.id}`);
  }

  const isCoord = user?.role === 'COORDINATION';

  return (
    <div className="p-6 max-w-2xl space-y-6">
      <div className="flex items-center gap-3">
        <Link href="/trocas">
          <Button size="sm" variant="ghost" className="gap-1.5">
            <ArrowLeft size={16} /> Voltar
          </Button>
        </Link>
        <div>
          <h1 className="text-2xl font-semibold text-slate-900">Nova Troca Inter-Municipal</h1>
          <p className="text-slate-500 text-sm">Cria a troca em rascunho — adicione itens na próxima tela</p>
        </div>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="bg-white rounded-lg border p-6 space-y-5">
        <div className="space-y-2">
          <Label htmlFor="sectorId">Setor</Label>
          {isCoord ? (
            <Input id="sectorId" value={user?.sectorId ?? ''} disabled />
          ) : (
            <select
              id="sectorId"
              {...register('sectorId')}
              className="w-full border rounded-md px-3 py-2 text-sm text-slate-700 bg-white"
            >
              <option value="">Selecione o setor...</option>
              {sectors?.data?.map((s: { id: string; name: string }) => (
                <option key={s.id} value={s.id}>{s.name}</option>
              ))}
            </select>
          )}
          {errors.sectorId && <p className="text-xs text-red-500">{errors.sectorId.message}</p>}
        </div>

        <div className="space-y-2">
          <Label htmlFor="partnerId">Município Parceiro *</Label>
          <select
            id="partnerId"
            {...register('partnerId')}
            className="w-full border rounded-md px-3 py-2 text-sm text-slate-700 bg-white"
          >
            <option value="">Selecione o município...</option>
            {partners?.data.map((p) => (
              <option key={p.id} value={p.id}>{p.name}</option>
            ))}
          </select>
          {errors.partnerId && <p className="text-xs text-red-500">{errors.partnerId.message}</p>}
        </div>

        <div className="space-y-2">
          <Label htmlFor="date">Data</Label>
          <Input id="date" type="date" {...register('date')} />
          {errors.date && <p className="text-xs text-red-500">{errors.date.message}</p>}
        </div>

        <div className="space-y-2">
          <Label htmlFor="justification">Justificativa *</Label>
          <Textarea
            id="justification"
            {...register('justification')}
            rows={4}
            placeholder="Descreva o motivo desta troca (mín. 10 caracteres)..."
          />
          {errors.justification && (
            <p className="text-xs text-red-500">{errors.justification.message}</p>
          )}
        </div>

        {createMutation.error && (
          <p className="text-sm text-red-500">
            {(createMutation.error as { response?: { data?: { message?: string } } })?.response?.data?.message ?? 'Erro ao criar troca'}
          </p>
        )}

        <div className="flex justify-end gap-3 pt-2">
          <Link href="/trocas">
            <Button type="button" variant="outline">Cancelar</Button>
          </Link>
          <Button
            type="submit"
            disabled={isSubmitting || createMutation.isPending}
            className="bg-pmdc-blue hover:bg-pmdc-blue-dark text-white"
          >
            {createMutation.isPending ? 'Criando...' : 'Criar e continuar'}
          </Button>
        </div>
      </form>
    </div>
  );
}
