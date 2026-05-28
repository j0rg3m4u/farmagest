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
  type UpdateItemInput,
} from '@farmagest/shared';
import { canEditItems, canCreateLots, canCreateMovements } from '@/lib/permissions';
import { useItem, useUpdateItem } from '@/hooks/use-items';
import { useItemLots } from '@/hooks/use-lots';
import { useItemMovements } from '@/hooks/use-movements';
import { useAuthStore } from '@/stores/auth-store';
import { NewLotDialog } from '@/components/shared/NewLotDialog';
import { EntryPurchaseDialog } from '@/components/shared/EntryPurchaseDialog';
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
import { MOVEMENT_TYPE_LABELS } from '@farmagest/shared';
import { ArrowLeft, Plus, AlertTriangle, PackageOpen, TrendingDown, TrendingUp } from 'lucide-react';

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
  const canEdit = canEditItems(user);
  const canAddLot = canCreateLots(user);
  const canEntry = canCreateMovements(user);
  const [newLotOpen, setNewLotOpen] = useState(false);
  const [entryOpen, setEntryOpen] = useState(false);

  const { data: item, isLoading } = useItem(id);
  const { data: lotsData } = useItemLots(id);
  const updateItem = useUpdateItem(id);

  const thirtyDaysAgo = new Date(Date.now() - 30 * 86400000).toISOString();
  const { data: movementsData } = useItemMovements(id, { limit: 10 });

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
  const totalBalance = activeLots.reduce((sum, l) => sum + Number(l.currentBalance), 0);

  const recentExits = movementsData?.data.filter((m) =>
    m.type === 'EXIT_SUPPLY' && new Date(m.createdAt) >= new Date(Date.now() - 30 * 86400000)
  ) ?? [];
  const dailyAvg = recentExits.reduce((s, m) => s + Number(m.quantity), 0) / 30;
  const daysUntilEmpty = dailyAvg > 0 ? Math.floor(totalBalance / dailyAvg) : null;

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

      {/* Stats */}
      <div className="grid grid-cols-4 gap-3">
        <div className="bg-white rounded-lg border p-4">
          <div className="text-xs text-slate-400">Saldo total</div>
          <div className="text-2xl font-semibold text-slate-700 mt-1">
            {totalBalance.toLocaleString('pt-BR', { maximumFractionDigits: 3 })}
          </div>
          <div className="text-xs text-slate-400 mt-0.5">{item.unitOfMeasure}</div>
        </div>
        <div className="bg-white rounded-lg border p-4">
          <div className="text-xs text-slate-400">Consumo médio/dia</div>
          <div className="text-2xl font-semibold text-slate-700 mt-1">
            {dailyAvg > 0 ? dailyAvg.toFixed(1) : '—'}
          </div>
          <div className="text-xs text-slate-400 mt-0.5">últimos 30 dias</div>
        </div>
        <div className="bg-white rounded-lg border p-4">
          <div className="text-xs text-slate-400">Dias até zerar</div>
          <div className="text-2xl font-semibold text-slate-700 mt-1">
            {daysUntilEmpty !== null ? daysUntilEmpty : '∞'}
          </div>
        </div>
        <div className="bg-white rounded-lg border p-4">
          <div className="text-xs text-slate-400">Lotes ativos</div>
          <div className="text-2xl font-semibold text-slate-700 mt-1">{activeLots.length}</div>
        </div>
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
          <div className="flex gap-2">
            {canEntry && (
              <Button
                size="sm"
                className="gap-1.5 bg-green-600 hover:bg-green-700 text-white"
                onClick={() => setEntryOpen(true)}
              >
                <TrendingUp size={14} /> Nova entrada
              </Button>
            )}
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

      {/* Últimas movimentações */}
      <div className="bg-white rounded-lg border overflow-hidden">
        <div className="px-6 py-4 border-b">
          <h2 className="text-sm font-semibold text-slate-700">Últimas movimentações</h2>
        </div>
        {!movementsData?.data.length ? (
          <div className="p-6 text-center text-sm text-slate-400">Nenhuma movimentação registrada</div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow className="bg-slate-50">
                <TableHead>Data</TableHead>
                <TableHead>Tipo</TableHead>
                <TableHead>Lote</TableHead>
                <TableHead className="text-right">Qtd</TableHead>
                <TableHead className="text-right">Saldo após</TableHead>
                <TableHead>Por</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {movementsData.data.map((mov) => {
                const isEntry = mov.type.startsWith('ENTRY_');
                return (
                  <TableRow key={mov.id}>
                    <TableCell className="text-xs text-slate-500">
                      {new Date(mov.createdAt).toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short' })}
                    </TableCell>
                    <TableCell>
                      <Badge
                        className={
                          isEntry
                            ? 'bg-green-50 text-green-700 border-0 text-xs'
                            : 'bg-red-50 text-red-700 border-0 text-xs'
                        }
                      >
                        {isEntry ? <TrendingUp size={10} className="mr-1" /> : <TrendingDown size={10} className="mr-1" />}
                        {MOVEMENT_TYPE_LABELS[mov.type as keyof typeof MOVEMENT_TYPE_LABELS] ?? mov.type}
                      </Badge>
                    </TableCell>
                    <TableCell className="font-mono text-xs">{mov.lot?.lotNumber ?? '—'}</TableCell>
                    <TableCell className="text-right font-medium">
                      <span className={isEntry ? 'text-green-700' : 'text-red-700'}>
                        {isEntry ? '+' : '-'}{mov.quantity}
                      </span>
                    </TableCell>
                    <TableCell className="text-right text-slate-600">{mov.balanceAfter}</TableCell>
                    <TableCell className="text-xs text-slate-500">{mov.createdBy?.name ?? '—'}</TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        )}
      </div>

      <NewLotDialog
        open={newLotOpen}
        onClose={() => setNewLotOpen(false)}
        itemId={id}
      />

      <EntryPurchaseDialog
        open={entryOpen}
        onClose={() => setEntryOpen(false)}
        itemId={id}
        itemDescription={item.description}
      />
    </div>
  );
}
