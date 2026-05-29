'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useForm, useFieldArray } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { createGeraSchema, GERA_TYPE_LABELS, GeraType } from '@farmagest/shared';
import { z } from 'zod';

type GeraFormValues = z.input<typeof createGeraSchema>;
import { useCreateGera } from '@/hooks/use-geras';
import { useUnits } from '@/hooks/use-units';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import { ArrowLeft, Plus, Trash2 } from 'lucide-react';
import Link from 'next/link';

export default function NovoGeraPage() {
  const router = useRouter();
  const createMutation = useCreateGera();
  const { data: unitsData } = useUnits({ limit: 200 });

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    control,
    formState: { errors, isSubmitting },
  } = useForm<GeraFormValues>({
    resolver: zodResolver(createGeraSchema) as any,
    defaultValues: {
      type: GeraType.MONTHLY,
      requestedAt: new Date().toISOString().slice(0, 10),
      items: [],
    },
  });

  const { fields, append, remove } = useFieldArray({ control, name: 'items' });

  async function onSubmit(data: GeraFormValues) {
    const gera = await createMutation.mutateAsync(data as any);
    router.push(`/geras/${gera.id}`);
  }

  return (
    <div className="p-6 max-w-3xl space-y-6">
      <div className="flex items-center gap-3">
        <Link href="/geras">
          <Button size="sm" variant="ghost" className="gap-1.5">
            <ArrowLeft size={16} /> Voltar
          </Button>
        </Link>
        <div>
          <h1 className="text-2xl font-semibold text-slate-900">Registrar GERA</h1>
          <p className="text-slate-500 text-sm">Cadastro manual do pedido de abastecimento</p>
        </div>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
        {/* Cabeçalho */}
        <div className="bg-white rounded-lg border p-6 space-y-5">
          <h2 className="font-medium text-slate-800">Dados do Pedido</h2>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Nº do Pedido (do documento) *</Label>
              <Input {...register('externalNumber')} placeholder="ex: 5810" />
              {errors.externalNumber && <p className="text-xs text-red-500">{errors.externalNumber.message}</p>}
            </div>

            <div className="space-y-2">
              <Label>Tipo de Pedido *</Label>
              <Select
                value={watch('type')}
                onValueChange={(v) => setValue('type', v as GeraType)}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {Object.entries(GERA_TYPE_LABELS).map(([k, v]) => (
                    <SelectItem key={k} value={k}>{v}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-2">
            <Label>Unidade Solicitante *</Label>
            <select
              {...register('unitId')}
              className="w-full border rounded-md px-3 py-2 text-sm text-slate-700 bg-white"
            >
              <option value="">Selecione a unidade…</option>
              {unitsData?.data?.map((u) => (
                <option key={u.id} value={u.id}>{u.name}</option>
              ))}
            </select>
            {errors.unitId && <p className="text-xs text-red-500">{errors.unitId.message}</p>}
          </div>

          <div className="grid grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label>Data da Solicitação *</Label>
              <Input type="date" {...register('requestedAt')} />
              {errors.requestedAt && <p className="text-xs text-red-500">{String(errors.requestedAt.message)}</p>}
            </div>
            <div className="space-y-2">
              <Label>Previsão de Entrega</Label>
              <Input type="date" {...register('expectedDelivery')} />
            </div>
            <div className="space-y-2">
              <Label>Prazo de Entrega</Label>
              <Input type="date" {...register('deadline')} />
            </div>
          </div>
        </div>

        {/* Itens */}
        <div className="bg-white rounded-lg border p-6 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="font-medium text-slate-800">Itens do Pedido</h2>
            <Button
              type="button"
              size="sm"
              variant="outline"
              onClick={() => append({ externalCode: '', description: '', requested: 1 })}
              className="gap-1.5"
            >
              <Plus size={14} /> Adicionar item
            </Button>
          </div>

          {fields.length === 0 && (
            <p className="text-sm text-slate-400 text-center py-4">
              Nenhum item adicionado. Você pode adicionar itens após criar o GERA.
            </p>
          )}

          {fields.map((field, index) => (
            <div key={field.id} className="grid grid-cols-12 gap-2 items-start border-b pb-3">
              <div className="col-span-2">
                <Input
                  {...register(`items.${index}.externalCode`)}
                  placeholder="MAT-1"
                  className="text-sm"
                />
              </div>
              <div className="col-span-6">
                <Input
                  {...register(`items.${index}.description`)}
                  placeholder="Descrição do item"
                  className="text-sm"
                />
              </div>
              <div className="col-span-2">
                <Input
                  type="number"
                  {...register(`items.${index}.requested`, { valueAsNumber: true })}
                  placeholder="Qtd"
                  className="text-sm"
                />
              </div>
              <div className="col-span-1">
                <Button
                  type="button"
                  size="icon"
                  variant="ghost"
                  className="h-8 w-8 text-red-500"
                  onClick={() => remove(index)}
                >
                  <Trash2 size={14} />
                </Button>
              </div>
            </div>
          ))}
        </div>

        {createMutation.error && (
          <p className="text-sm text-red-500">
            {(createMutation.error as any)?.response?.data?.message ?? 'Erro ao criar GERA'}
          </p>
        )}

        <div className="flex justify-end gap-3">
          <Link href="/geras">
            <Button type="button" variant="outline">Cancelar</Button>
          </Link>
          <Button
            type="submit"
            disabled={isSubmitting || createMutation.isPending}
            className="bg-pmdc-blue hover:bg-pmdc-blue-dark text-white"
          >
            {createMutation.isPending ? 'Criando…' : 'Criar GERA'}
          </Button>
        </div>
      </form>
    </div>
  );
}
