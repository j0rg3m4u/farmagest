'use client';
import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { ITEM_CATEGORY_LABELS, ItemCategory, UserRole } from '@farmagest/shared';
import { useItems, useBatchUpdateItems } from '@/hooks/use-items';
import { useSectors } from '@/hooks/use-sectors';
import { useAuthStore } from '@/stores/auth-store';
import { PageHeader } from '@/components/shared/PageHeader';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
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
import { ArrowLeft, Save, Filter } from 'lucide-react';

interface EditableRow {
  id: string;
  code: string;
  description: string;
  category: ItemCategory;
  unitOfMeasure: string;
  manufacturer: string;
  controlled344: boolean;
  dirty: boolean;
}

export default function EditarEmLotePage() {
  const router = useRouter();
  const user = useAuthStore((s) => s.user);
  const isManager = user?.role === 'MANAGER';
  const { data: sectorsData } = useSectors({ active: 'true', limit: 100 });

  const [sectorFilter, setSectorFilter] = useState(isManager ? '' : (user?.sectorId ?? ''));
  const [search, setSearch] = useState('');
  const [unitFilter, setUnitFilter] = useState('');
  const [page] = useState(1);

  const { data: itemsData, isLoading } = useItems({
    search: search || undefined,
    sectorId: sectorFilter || undefined,
    active: 'true',
    limit: 100,
    page,
  });

  const [rows, setRows] = useState<EditableRow[]>([]);
  const batchUpdate = useBatchUpdateItems();

  useEffect(() => {
    if (!itemsData) return;
    setRows((prev) => {
      const prevMap = new Map(prev.filter((r) => r.dirty).map((r) => [r.id, r]));
      return itemsData.data.map((item) => {
        if (prevMap.has(item.id)) return prevMap.get(item.id)!;
        return {
          id: item.id,
          code: item.code,
          description: item.description,
          category: item.category as ItemCategory,
          unitOfMeasure: item.unitOfMeasure,
          manufacturer: item.manufacturer ?? '',
          controlled344: item.controlled344,
          dirty: false,
        };
      });
    });
  }, [itemsData]);

  function updateRow(id: string, field: keyof EditableRow, value: unknown) {
    setRows((prev) =>
      prev.map((r) => (r.id === id ? { ...r, [field]: value, dirty: true } : r)),
    );
  }

  const displayRows = useMemo(() => {
    if (!unitFilter) return rows;
    return rows.filter((r) => r.unitOfMeasure.toLowerCase().includes(unitFilter.toLowerCase()));
  }, [rows, unitFilter]);

  const dirtyCount = rows.filter((r) => r.dirty).length;

  async function handleSave() {
    const dirty = rows.filter((r) => r.dirty);
    if (!dirty.length) return;
    try {
      const updates = dirty.map(({ id, category, unitOfMeasure, manufacturer, controlled344 }) => ({
        id,
        category,
        unitOfMeasure,
        manufacturer: manufacturer || null,
        controlled344,
      }));
      const res = await batchUpdate.mutateAsync(updates);
      toast.success(`${res.updated} itens atualizados`);
      setRows((prev) => prev.map((r) => ({ ...r, dirty: false })));
    } catch (err: any) {
      toast.error(err.response?.data?.message ?? 'Erro ao salvar');
    }
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-start justify-between">
        <PageHeader
          title="Edição em Lote"
          description="Edite categoria, unidade de medida e fabricante de múltiplos itens de uma só vez"
        />
        {dirtyCount > 0 && (
          <Button
            className="bg-pmdc-blue hover:bg-pmdc-blue-dark text-white gap-1.5"
            onClick={handleSave}
            disabled={batchUpdate.isPending}
          >
            <Save size={16} />
            {batchUpdate.isPending ? 'Salvando…' : `Salvar ${dirtyCount} alteração${dirtyCount !== 1 ? 'ões' : ''}`}
          </Button>
        )}
      </div>

      <Button variant="ghost" size="sm" className="gap-1.5 text-slate-500 -mt-4" onClick={() => router.back()}>
        <ArrowLeft size={16} /> Voltar
      </Button>

      {/* Filtros */}
      <div className="bg-white rounded-lg border p-4">
        <div className="flex items-center gap-2 mb-3 text-sm font-medium text-slate-600">
          <Filter size={14} /> Filtros
        </div>
        <div className="flex flex-wrap gap-3">
          <Input
            placeholder="Buscar por descrição..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="max-w-xs text-sm"
          />
          <Input
            placeholder="Filtrar por unidade (ex: un)"
            value={unitFilter}
            onChange={(e) => setUnitFilter(e.target.value)}
            className="max-w-xs text-sm"
          />
          {isManager && (
            <Select value={sectorFilter} onValueChange={(v) => setSectorFilter((v as string) ?? '')}>
              <SelectTrigger className="max-w-xs">
                <SelectValue placeholder="Todos os setores" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="">Todos os setores</SelectItem>
                {sectorsData?.data.map((s) => (
                  <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
        </div>
        <p className="text-xs text-slate-400 mt-2">
          {displayRows.length} de {rows.length} itens exibidos
          {dirtyCount > 0 && <span className="text-amber-600 ml-2">· {dirtyCount} com alterações não salvas</span>}
        </p>
      </div>

      {/* Tabela editável */}
      <div className="bg-white rounded-lg border overflow-hidden">
        {isLoading ? (
          <div className="p-8 text-center text-slate-400 text-sm">Carregando itens…</div>
        ) : displayRows.length === 0 ? (
          <div className="p-8 text-center text-slate-400 text-sm">Nenhum item encontrado</div>
        ) : (
          <div className="overflow-x-auto max-h-[600px] overflow-y-auto">
            <Table>
              <TableHeader className="sticky top-0 bg-slate-50 z-10">
                <TableRow>
                  <TableHead className="w-28">Código</TableHead>
                  <TableHead>Descrição</TableHead>
                  <TableHead className="w-36">Categoria</TableHead>
                  <TableHead className="w-28">Unidade</TableHead>
                  <TableHead className="w-40">Fabricante</TableHead>
                  <TableHead className="w-16">344/98</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {displayRows.map((row) => (
                  <TableRow key={row.id} className={row.dirty ? 'bg-amber-50' : ''}>
                    <TableCell>
                      <span className="font-mono text-xs text-slate-500">{row.code}</span>
                    </TableCell>
                    <TableCell className="text-sm text-slate-700 max-w-xs">
                      <span className="line-clamp-2">{row.description}</span>
                    </TableCell>
                    <TableCell>
                      <Select
                        value={row.category}
                        onValueChange={(v) => updateRow(row.id, 'category', v as ItemCategory)}
                      >
                        <SelectTrigger className="h-8 text-xs">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {Object.entries(ITEM_CATEGORY_LABELS).map(([k, v]) => (
                            <SelectItem key={k} value={k} className="text-xs">{v}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </TableCell>
                    <TableCell>
                      <Input
                        value={row.unitOfMeasure}
                        onChange={(e) => updateRow(row.id, 'unitOfMeasure', e.target.value)}
                        className="h-8 text-xs font-mono max-w-24"
                      />
                    </TableCell>
                    <TableCell>
                      <Input
                        value={row.manufacturer}
                        onChange={(e) => updateRow(row.id, 'manufacturer', e.target.value)}
                        placeholder="—"
                        className="h-8 text-xs max-w-36"
                      />
                    </TableCell>
                    <TableCell>
                      <input
                        type="checkbox"
                        checked={row.controlled344}
                        onChange={(e) => updateRow(row.id, 'controlled344', e.target.checked)}
                        className="h-4 w-4"
                      />
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </div>

      {dirtyCount > 0 && (
        <div className="flex justify-end">
          <Button
            className="bg-pmdc-blue hover:bg-pmdc-blue-dark text-white gap-1.5"
            onClick={handleSave}
            disabled={batchUpdate.isPending}
          >
            <Save size={16} />
            {batchUpdate.isPending ? 'Salvando…' : `Salvar ${dirtyCount} alteração${dirtyCount !== 1 ? 'ões' : ''}`}
          </Button>
        </div>
      )}
    </div>
  );
}
