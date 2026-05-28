'use client';
import { use, useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import {
  updateItemSchema,
  ITEM_CATEGORY_LABELS,
  ItemCategory,
  UserRole,
  type UpdateItemInput,
} from '@farmagest/shared';
import { useItem, useUpdateItem } from '@/hooks/use-items';
import { useItemLots } from '@/hooks/use-lots';
import { useAuthStore } from '@/stores/auth-store';
import { NewLotDialog } from '@/components/shared/NewLotDialog';
import { PageHeader } from '@/components/shared/PageHeader';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { ArrowLeft, Plus, AlertTriangle, PackageOpen } from 'lucide-react';

function expirationStatus(dateStr: string) {
  const d = new Date(dateStr);
  const now = new Date();
  const diffDays = Math.ceil((d.getTime() - now.getTime()) / 86400000);
  if (diffDays < 0) return { label: 'Vencido', cls: 'bg-red-100 text-red-700 border-0' };
  if (diffDays <= 90) return { label: `${diffDays}d`, cls: 'bg-amber-100 text-amber-700 border-0' };
  return { label: d.toLocaleDateString('pt-BR'), cls: 'bg-slate-100 text-slate-600 border-0' };
}

export default function ItemPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const router = useRouter();
  const user = useAuthStore((s) => s.user);
  const canEdit = ['COORDINATION', 'ADMIN', 'MANAGER'].includes(user?.role as string);
  const canAddLot = canEdit;
  const [newLotOpen, setNewLotOpen] = useState(false);

  const { data: item, isLoading } = useItem(id);
  const { data: lotsData } = useItemLots(id);
  const updateItem = useUpdateItem(id);

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    formState: { errors },
  } = useForm<UpdateItemInput>({
    resolver: zodResolver(updateItemSchema),
    values: item
      ? {
          description: item.description,
          category: item.category as ItemCategory,
          unitOfMeasure: item.unitOfMeasure,
          manufacturer: item.manufacturer ?? undefined,
          controlled344: item.controlled344,
          active: item.active,
        }
      : undefined,
  });

  async function onSubmit(data: UpdateItemInput) {
    try {
      await updateItem.mutateAsync(data);
      toast.success('Item atualizado com sucesso');
    } catch (err: any) {
      toast.error(err.response?.data?.message ?? 'Erro ao atualizar item');
    }
  }

  if (isLoading) return <div className="p-6 text-slate-400">Carregando…</div>;
  if (!item) return <div className="p-6 text-slate-400">Item não encontrado</div>;

  const activeLots = lotsData?.data.filter((l) => l.active) ?? [];

  return (
    <div className="p-6 max-w-3xl space-y-6">
      <PageHeader
        title={item.description}
        description={`Código: ${item.code}`}
        action={
          <div className="flex gap-2 items-center">
            {item.controlled344 && (
              <Badge className="bg-amber-50 text-amber-700 border-amber-200 gap-1">
                <AlertTriangle size={12} /> 344/98
              </Badge>
            )}
            <Badge variant="outline" className="font-mono text-xs">{item.sector?.code}</Badge>
            <Badge
              className={
                item.active
                  ? 'bg-status-success-bg text-status-success border-0'
                  : 'bg-slate-100 text-slate-500 border-0'
              }
            >
              {item.active ? 'Ativo' : 'Inativo'}
            </Badge>
          </div>
        }
      />

      <Button
        variant="ghost"
        size="sm"
        className="-mt-4 gap-1.5 text-slate-500"
        onClick={() => router.back()}
      >
        <ArrowLeft size={16} /> Voltar
      </Button>

      {/* Dados */}
      <div className="grid grid-cols-4 gap-3">
        {[
          { label: 'Saldo total', value: '—', note: 'Sprint 3' },
          { label: 'Consumo médio', value: '—', note: 'Sprint 3' },
          { label: 'Dias até zerar', value: '—', note: 'Sprint 3' },
          { label: 'Lotes ativos', value: String(activeLots.length) },
        ].map((stat) => (
          <div key={stat.label} className="bg-white rounded-lg border p-4">
            <div className="text-xs text-slate-400">{stat.label}</div>
            <div className="text-2xl font-semibold text-slate-700 mt-1">{stat.value}</div>
            {stat.note && <div className="text-xs text-slate-400 mt-0.5">{stat.note}</div>}
          </div>
        ))}
      </div>

      {/* Formulário de edição */}
      {canEdit && (
        <form onSubmit={handleSubmit(onSubmit)} className="bg-white rounded-lg border p-6 space-y-4">
          <h2 className="text-sm font-semibold text-slate-700 mb-2">Dados do item</h2>

          <div className="space-y-1.5">
            <Label>Código <span className="text-slate-400 text-xs">(imutável)</span></Label>
            <Input value={item.code} disabled className="font-mono" />
          </div>

          <div className="space-y-1.5">
            <Label>Setor <span className="text-slate-400 text-xs">(imutável)</span></Label>
            <Input value={item.sector?.name ?? '—'} disabled />
          </div>

          <div className="space-y-1.5">
            <Label>Descrição</Label>
            <Input {...register('description')} />
            {errors.description && <p className="text-xs text-red-600">{errors.description.message}</p>}
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label>Categoria</Label>
              <Select
                defaultValue={item.category}
                onValueChange={(v) => setValue('category', v as ItemCategory)}
              >
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {Object.entries(ITEM_CATEGORY_LABELS).map(([k, v]) => (
                    <SelectItem key={k} value={k}>{v}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Unidade de medida</Label>
              <Input {...register('unitOfMeasure')} />
            </div>
          </div>

          <div className="space-y-1.5">
            <Label>Fabricante</Label>
            <Input {...register('manufacturer')} />
          </div>

          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2">
              <input type="checkbox" id="controlled344" className="h-4 w-4 rounded border-slate-300" {...register('controlled344')} />
              <Label htmlFor="controlled344" className="cursor-pointer">Portaria 344/98</Label>
            </div>
            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id="active"
                className="h-4 w-4 rounded border-slate-300"
                checked={watch('active') ?? item.active}
                onChange={(e) => setValue('active', e.target.checked)}
              />
              <Label htmlFor="active" className="cursor-pointer">Ativo</Label>
            </div>
          </div>

          <div className="flex justify-end pt-2">
            <Button
              type="submit"
              className="bg-pmdc-blue hover:bg-pmdc-blue-dark text-white"
              disabled={updateItem.isPending}
            >
              {updateItem.isPending ? 'Salvando…' : 'Salvar Alterações'}
            </Button>
          </div>
        </form>
      )}

      {/* Lotes */}
      <div className="bg-white rounded-lg border overflow-hidden">
        <div className="flex items-center justify-between px-6 py-4 border-b">
          <h2 className="text-sm font-semibold text-slate-700">
            Lotes em estoque
            <span className="ml-2 text-slate-400 font-normal">({activeLots.length} ativo{activeLots.length !== 1 ? 's' : ''})</span>
          </h2>
          {canAddLot && (
            <Button
              size="sm"
              variant="outline"
              className="gap-1.5 text-pmdc-blue border-pmdc-blue/30 hover:bg-pmdc-blue/5"
              onClick={() => setNewLotOpen(true)}
            >
              <Plus size={14} /> Novo lote
            </Button>
          )}
        </div>

        {lotsData?.data.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-10 text-slate-400 gap-2">
            <PackageOpen size={28} />
            <span className="text-sm">Nenhum lote cadastrado</span>
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow className="bg-slate-50">
                <TableHead>Número do lote</TableHead>
                <TableHead>Validade</TableHead>
                <TableHead>Saldo</TableHead>
                <TableHead>Fornecedor</TableHead>
                <TableHead>NF</TableHead>
                <TableHead>Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {lotsData?.data.map((lot) => {
                const exp = expirationStatus(lot.expirationDate);
                return (
                  <TableRow key={lot.id}>
                    <TableCell className="font-mono text-sm">{lot.lotNumber}</TableCell>
                    <TableCell>
                      <Badge className={exp.cls}>{exp.label}</Badge>
                    </TableCell>
                    <TableCell className="font-medium">{lot.currentBalance}</TableCell>
                    <TableCell className="text-slate-500">{lot.supplier ?? '—'}</TableCell>
                    <TableCell className="text-slate-500">{lot.invoiceNumber ?? '—'}</TableCell>
                    <TableCell>
                      <Badge
                        className={
                          lot.active
                            ? 'bg-status-success-bg text-status-success border-0'
                            : 'bg-slate-100 text-slate-500 border-0'
                        }
                      >
                        {lot.active ? 'Ativo' : 'Inativo'}
                      </Badge>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        )}
      </div>

      {/* Movimentações — placeholder Sprint 3 */}
      <div className="bg-white rounded-lg border p-6 text-center text-slate-400">
        <p className="text-sm">Últimas movimentações disponíveis a partir da Sprint 3</p>
      </div>

      <NewLotDialog
        open={newLotOpen}
        onClose={() => setNewLotOpen(false)}
        itemId={id}
      />
    </div>
  );
}
