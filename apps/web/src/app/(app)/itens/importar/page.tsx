'use client';
import { useCallback, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import * as XLSX from 'xlsx';
import { toast } from 'sonner';
import { ITEM_CATEGORY_LABELS, ItemCategory, UserRole } from '@farmagest/shared';
import { useSectors } from '@/hooks/use-sectors';
import { useAuthStore } from '@/stores/auth-store';
import { apiClient } from '@/lib/api-client';
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
import {
  ArrowLeft,
  Download,
  Upload,
  AlertCircle,
  CheckCircle2,
  FileSpreadsheet,
  Info,
} from 'lucide-react';

type ImportMode = 'list' | 'matrix';

interface ListPreviewRow {
  linha: number;
  descricao: string;
  categoria: string;
  unidade: string;
  fabricante: string;
  controlado_344: string;
  error?: string;
  selected: boolean;
}

interface MatrixPreviewRow {
  idx: number;
  description: string;
  category: ItemCategory;
  unitOfMeasure: string;
  selected: boolean;
}

const VALID_CATEGORIES = ['MEDICATION', 'CORRELATE'];

function inferCategory(tipo: string): ItemCategory {
  return tipo.trim().toUpperCase() === 'MED' ? ItemCategory.MEDICATION : ItemCategory.CORRELATE;
}

const UNIT_PATTERNS: Array<{ pattern: RegExp; unit: string }> = [
  { pattern: /\bpct\b/i, unit: 'pct' },
  { pattern: /\bpacote\b/i, unit: 'pacote' },
  { pattern: /\bcaixa\b/i, unit: 'caixa' },
  { pattern: /\bfrasco\b/i, unit: 'frasco' },
  { pattern: /\brolo\b/i, unit: 'rolo' },
  { pattern: /\btubo\b/i, unit: 'tubo' },
  { pattern: /\bampola\b/i, unit: 'ampola' },
  { pattern: /\bsache\b/i, unit: 'sache' },
  { pattern: /\bcps\b/i, unit: 'cps' },
  { pattern: /\bcap\b/i, unit: 'cap' },
  { pattern: /\bcp\b/i, unit: 'cp' },
  { pattern: /\bml\b/i, unit: 'ml' },
];

function inferUnit(desc: string): string {
  for (const r of UNIT_PATTERNS) if (r.pattern.test(desc)) return r.unit;
  return 'un';
}

function colToNum(col: string): number {
  const s = col.trim().toUpperCase();
  if (/^\d+$/.test(s)) return parseInt(s, 10);
  let n = 0;
  for (const ch of s) n = n * 26 + ch.charCodeAt(0) - 64;
  return n;
}

function validateListRow(row: Record<string, unknown>, num: number): ListPreviewRow {
  const descricao = String(row['descricao'] ?? '').trim();
  const categoria = String(row['categoria'] ?? '').trim().toUpperCase();
  const unidade = String(row['unidade'] ?? '').trim();
  const fabricante = String(row['fabricante'] ?? '').trim();
  const controlado_344 = String(row['controlado_344'] ?? 'NAO').trim().toUpperCase();
  let error: string | undefined;
  if (!descricao) error = 'Descrição obrigatória';
  else if (descricao.length > 300) error = 'Descrição excede 300 caracteres';
  else if (!VALID_CATEGORIES.includes(categoria)) error = `Categoria inválida: "${row['categoria']}"`;
  else if (!unidade) error = 'Unidade obrigatória';
  return { linha: num, descricao, categoria, unidade, fabricante, controlado_344, error, selected: !error };
}

export default function ImportarItensPage() {
  const router = useRouter();
  const user = useAuthStore((s) => s.user);
  const isManager = user?.role === 'MANAGER';
  const { data: sectorsData } = useSectors({ active: 'true', limit: 100 });

  const [mode, setMode] = useState<ImportMode>('list');
  const [sectorId, setSectorId] = useState(isManager ? '' : (user?.sectorId ?? ''));

  // List mode state
  const [listFile, setListFile] = useState<File | null>(null);
  const [listPreview, setListPreview] = useState<ListPreviewRow[] | null>(null);

  // Matrix mode state
  const [matrixFile, setMatrixFile] = useState<File | null>(null);
  const [matrixPreview, setMatrixPreview] = useState<MatrixPreviewRow[] | null>(null);
  const [descCol, setDescCol] = useState('A');
  const [typeCol, setTypeCol] = useState('B');
  const [startRow, setStartRow] = useState('2');

  const [importing, setImporting] = useState(false);
  const [result, setResult] = useState<{ imported: number; skipped: number; codes: string[] } | null>(null);
  const listFileRef = useRef<HTMLInputElement>(null);
  const matrixFileRef = useRef<HTMLInputElement>(null);

  const selectedSector = sectorsData?.data.find((s) => s.id === sectorId);

  function parseListFile(f: File) {
    const reader = new FileReader();
    reader.onload = (e) => {
      const data = new Uint8Array(e.target?.result as ArrayBuffer);
      const wb = XLSX.read(data, { type: 'array' });
      const ws = wb.Sheets[wb.SheetNames[0]];
      const rows: Record<string, unknown>[] = XLSX.utils.sheet_to_json(ws);
      setListPreview(rows.slice(0, 500).map((row, i) => validateListRow(row, i + 2)));
    };
    reader.readAsArrayBuffer(f);
  }

  function parseMatrixFile(f: File, dCol = descCol, tCol = typeCol, sRow = startRow) {
    const reader = new FileReader();
    reader.onload = (e) => {
      const data = new Uint8Array(e.target?.result as ArrayBuffer);
      const wb = XLSX.read(data, { type: 'array' });
      const ws = wb.Sheets[wb.SheetNames[0]];
      const descColIdx = colToNum(dCol) - 1;
      const typeColIdx = colToNum(tCol) - 1;
      const startRowIdx = Math.max(0, parseInt(sRow || '2', 10) - 1);
      const range = XLSX.utils.decode_range(ws['!ref'] ?? 'A1');
      const rows: MatrixPreviewRow[] = [];
      for (let r = startRowIdx; r <= range.e.r; r++) {
        const descCell = ws[XLSX.utils.encode_cell({ r, c: descColIdx })];
        if (!descCell) continue;
        const description = String(descCell.v ?? '').trim();
        if (!description) continue;
        const typeCell = ws[XLSX.utils.encode_cell({ r, c: typeColIdx })];
        const rawType = typeCell ? String(typeCell.v ?? '').trim() : 'MAT';
        rows.push({
          idx: rows.length,
          description,
          category: inferCategory(rawType),
          unitOfMeasure: inferUnit(description),
          selected: true,
        });
      }
      setMatrixPreview(rows);
    };
    reader.readAsArrayBuffer(f);
  }

  function handleListFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0];
    if (!f) return;
    setListFile(f);
    setListPreview(null);
    setResult(null);
    parseListFile(f);
  }

  function handleMatrixFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0];
    if (!f) return;
    setMatrixFile(f);
    setMatrixPreview(null);
    setResult(null);
    parseMatrixFile(f);
  }

  const onListDrop = useCallback((e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    const f = e.dataTransfer.files[0];
    if (!f) return;
    setListFile(f);
    setListPreview(null);
    setResult(null);
    parseListFile(f);
  }, []); // eslint-disable-line

  const onMatrixDrop = useCallback((e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    const f = e.dataTransfer.files[0];
    if (!f) return;
    setMatrixFile(f);
    setMatrixPreview(null);
    setResult(null);
    parseMatrixFile(f);
  }, [descCol, typeCol, startRow]); // eslint-disable-line

  function reparseMatrix() {
    if (matrixFile) parseMatrixFile(matrixFile, descCol, typeCol, startRow);
  }

  async function handleImport() {
    if (!sectorId) { toast.error('Selecione o setor de destino'); return; }
    setImporting(true);
    try {
      const formData = new FormData();
      formData.append('sectorId', sectorId);

      if (mode === 'list') {
        if (!listFile) return;
        const selected = listPreview?.filter((r) => r.selected && !r.error) ?? [];
        const ws = XLSX.utils.aoa_to_sheet([
          ['descricao', 'categoria', 'unidade', 'fabricante', 'controlado_344'],
          ...selected.map((r) => [r.descricao, r.categoria, r.unidade, r.fabricante, r.controlado_344]),
        ]);
        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, 'Itens');
        const buf = XLSX.write(wb, { type: 'array', bookType: 'xlsx' }) as ArrayBuffer;
        formData.append('file', new Blob([buf], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' }), 'import.xlsx');
        formData.append('mode', 'list');
      } else {
        if (!matrixFile) return;
        const selected = matrixPreview?.filter((r) => r.selected) ?? [];
        const ws = XLSX.utils.aoa_to_sheet([
          ['DESCRICAO', 'TIPO'],
          ...selected.map((r) => [r.description, r.category === ItemCategory.MEDICATION ? 'MED' : 'MAT']),
        ]);
        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, 'Itens');
        const buf = XLSX.write(wb, { type: 'array', bookType: 'xlsx' }) as ArrayBuffer;
        formData.append('file', new Blob([buf], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' }), 'import.xlsx');
        formData.append('mode', 'matrix');
        formData.append('descriptionColumn', '1');
        formData.append('typeColumn', '2');
        formData.append('startRow', '2');
      }

      formData.append('onDuplicate', 'skip');

      const res = await apiClient.post<{ imported: number; skipped: number; codes: string[] }>(
        '/items/import',
        formData,
        { headers: { 'Content-Type': 'multipart/form-data' } },
      );
      setResult(res.data);
      if (res.data.skipped > 0) {
        toast.success(`${res.data.imported} itens importados (${res.data.skipped} duplicatas ignoradas)`);
      } else {
        toast.success(`${res.data.imported} itens importados com sucesso`);
      }
    } catch (err: any) {
      const serverErrors = err.response?.data?.errors as string[] | undefined;
      if (serverErrors?.length) {
        toast.error(`Erros na planilha: ${serverErrors[0]}`);
      } else {
        toast.error(err.response?.data?.message ?? 'Erro na importação');
      }
    } finally {
      setImporting(false);
    }
  }

  async function downloadTemplate() {
    try {
      const res = await apiClient.get('/items/import/template', { responseType: 'blob' });
      const url = URL.createObjectURL(res.data as Blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'modelo-importacao-itens.xlsx';
      a.click();
      URL.revokeObjectURL(url);
    } catch {
      toast.error('Erro ao baixar template');
    }
  }

  const listSelected = listPreview?.filter((r) => r.selected && !r.error) ?? [];
  const listErrors = listPreview?.filter((r) => r.error) ?? [];
  const matrixSelected = matrixPreview?.filter((r) => r.selected) ?? [];

  const canImport =
    !importing &&
    !!sectorId &&
    (mode === 'list'
      ? listSelected.length > 0
      : matrixSelected.length > 0);

  if (result) {
    return (
      <div className="p-6 max-w-2xl">
        <div className="bg-white rounded-lg border p-8 text-center space-y-4">
          <CheckCircle2 size={48} className="text-green-500 mx-auto" />
          <h2 className="text-xl font-semibold text-slate-800">
            {result.imported} itens importados com sucesso
          </h2>
          {result.skipped > 0 && (
            <p className="text-sm text-amber-600">{result.skipped} duplicatas ignoradas</p>
          )}
          {selectedSector && (
            <p className="text-slate-500 text-sm">
              Setor: <span className="font-mono font-medium">{selectedSector.code}</span> — {selectedSector.name}
            </p>
          )}
          {result.codes.length > 0 && (
            <div className="bg-slate-50 rounded-lg p-4 text-left max-h-48 overflow-auto">
              <div className="text-xs text-slate-400 mb-2">Códigos gerados:</div>
              <div className="flex flex-wrap gap-1.5">
                {result.codes.slice(0, 50).map((c) => (
                  <Badge key={c} variant="outline" className="font-mono text-xs">{c}</Badge>
                ))}
                {result.codes.length > 50 && (
                  <span className="text-xs text-slate-400">+{result.codes.length - 50} mais</span>
                )}
              </div>
            </div>
          )}
          <div className="flex justify-center gap-3">
            <Button variant="outline" onClick={() => { setResult(null); setListFile(null); setListPreview(null); setMatrixFile(null); setMatrixPreview(null); }}>
              Nova importação
            </Button>
            <Button className="bg-pmdc-blue hover:bg-pmdc-blue-dark text-white" onClick={() => router.push('/itens')}>
              Ver itens
            </Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 max-w-4xl space-y-6">
      <PageHeader title="Importar Itens" description="Importe múltiplos itens via planilha CSV ou XLSX" />

      <Button variant="ghost" size="sm" className="gap-1.5 text-slate-500 -mt-4" onClick={() => router.back()}>
        <ArrowLeft size={16} /> Voltar
      </Button>

      {/* Setor de destino */}
      <div className="bg-white rounded-lg border p-6 space-y-3">
        <h2 className="text-sm font-semibold text-slate-700">Setor de destino</h2>
        {isManager ? (
          <Select value={sectorId} onValueChange={(v) => setSectorId((v as string) ?? '')}>
            <SelectTrigger className="max-w-xs">
              <SelectValue placeholder="Selecione o setor" />
            </SelectTrigger>
            <SelectContent>
              {sectorsData?.data.map((s) => (
                <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        ) : (
          <div className="flex items-center gap-2">
            <Badge variant="outline" className="font-mono">{selectedSector?.code}</Badge>
            <span className="text-sm text-slate-600">{selectedSector?.name}</span>
          </div>
        )}
      </div>

      {/* Mode tabs */}
      <div className="bg-white rounded-lg border overflow-hidden">
        <div className="flex border-b">
          <button
            onClick={() => setMode('list')}
            className={[
              'flex-1 px-6 py-3 text-sm font-medium transition-colors',
              mode === 'list' ? 'bg-pmdc-blue text-white' : 'text-slate-600 hover:bg-slate-50',
            ].join(' ')}
          >
            Lista padrão
          </button>
          <button
            onClick={() => setMode('matrix')}
            className={[
              'flex-1 px-6 py-3 text-sm font-medium transition-colors',
              mode === 'matrix' ? 'bg-pmdc-blue text-white' : 'text-slate-600 hover:bg-slate-50',
            ].join(' ')}
          >
            Planilha da Marylyn (matriz)
          </button>
        </div>

        <div className="p-6 space-y-5">
          {mode === 'list' ? (
            <div className="flex items-center justify-between">
              <p className="text-sm text-slate-600">
                Colunas: <span className="font-mono text-xs bg-slate-100 px-1 rounded">descricao</span>{' '}
                <span className="font-mono text-xs bg-slate-100 px-1 rounded">categoria</span>{' '}
                <span className="font-mono text-xs bg-slate-100 px-1 rounded">unidade</span>{' '}
                <span className="font-mono text-xs bg-slate-100 px-1 rounded">fabricante</span>{' '}
                <span className="font-mono text-xs bg-slate-100 px-1 rounded">controlado_344</span>
              </p>
              <Button variant="outline" size="sm" className="gap-1.5 shrink-0" onClick={downloadTemplate}>
                <Download size={14} /> Baixar modelo
              </Button>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="flex items-start gap-2 p-3 bg-amber-50 rounded-lg text-sm text-amber-700 border border-amber-200">
                <AlertCircle size={14} className="mt-0.5 shrink-0" />
                <span>
                  Importa de planilha em formato matriz, extraindo apenas a coluna de descrição.
                  As outras colunas (unidades, quantidades) serão ignoradas — elas representam movimentações.
                  Unidade de medida será <strong>inferida automaticamente</strong> — revise após importar.
                </span>
              </div>
              <div className="grid grid-cols-3 gap-4">
                <div className="space-y-1.5">
                  <Label className="text-xs">Coluna de descrição</Label>
                  <Input
                    value={descCol}
                    onChange={(e) => setDescCol(e.target.value.toUpperCase())}
                    onBlur={reparseMatrix}
                    placeholder="A"
                    className="text-sm"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs">Coluna de tipo</Label>
                  <Input
                    value={typeCol}
                    onChange={(e) => setTypeCol(e.target.value.toUpperCase())}
                    onBlur={reparseMatrix}
                    placeholder="B"
                    className="text-sm"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs">Linha inicial dos dados</Label>
                  <Input
                    value={startRow}
                    onChange={(e) => setStartRow(e.target.value)}
                    onBlur={reparseMatrix}
                    placeholder="2"
                    className="text-sm"
                  />
                </div>
              </div>
            </div>
          )}

          {/* Drop zone */}
          {mode === 'list' ? (
            <div
              onDrop={onListDrop}
              onDragOver={(e) => e.preventDefault()}
              onClick={() => listFileRef.current?.click()}
              className="border-2 border-dashed border-slate-200 rounded-lg p-8 text-center cursor-pointer hover:border-pmdc-blue/40 hover:bg-pmdc-blue/5 transition-colors"
            >
              {listFile ? (
                <div className="flex items-center justify-center gap-3 text-slate-700">
                  <FileSpreadsheet size={24} className="text-green-600" />
                  <div className="text-left">
                    <div className="font-medium text-sm">{listFile.name}</div>
                    <div className="text-xs text-slate-400">{listPreview?.length ?? 0} linhas detectadas</div>
                  </div>
                </div>
              ) : (
                <div className="space-y-2 text-slate-400">
                  <Upload size={32} className="mx-auto" />
                  <p className="text-sm">Arraste um arquivo .xlsx ou .csv aqui</p>
                  <p className="text-xs">ou clique para selecionar</p>
                </div>
              )}
              <input ref={listFileRef} type="file" accept=".xlsx,.csv" className="hidden" onChange={handleListFileChange} />
            </div>
          ) : (
            <div
              onDrop={onMatrixDrop}
              onDragOver={(e) => e.preventDefault()}
              onClick={() => matrixFileRef.current?.click()}
              className="border-2 border-dashed border-slate-200 rounded-lg p-8 text-center cursor-pointer hover:border-pmdc-blue/40 hover:bg-pmdc-blue/5 transition-colors"
            >
              {matrixFile ? (
                <div className="flex items-center justify-center gap-3 text-slate-700">
                  <FileSpreadsheet size={24} className="text-green-600" />
                  <div className="text-left">
                    <div className="font-medium text-sm">{matrixFile.name}</div>
                    <div className="text-xs text-slate-400">{matrixPreview?.length ?? 0} itens detectados</div>
                  </div>
                </div>
              ) : (
                <div className="space-y-2 text-slate-400">
                  <Upload size={32} className="mx-auto" />
                  <p className="text-sm">Arraste a planilha MARY_2_0.xlsx aqui</p>
                  <p className="text-xs">ou clique para selecionar</p>
                </div>
              )}
              <input ref={matrixFileRef} type="file" accept=".xlsx,.csv" className="hidden" onChange={handleMatrixFileChange} />
            </div>
          )}
        </div>
      </div>

      {/* Preview — list mode */}
      {mode === 'list' && listPreview && (
        <div className="bg-white rounded-lg border overflow-hidden">
          <div className="flex items-center justify-between px-6 py-4 border-b">
            <h2 className="text-sm font-semibold text-slate-700">
              Preview{' '}
              {listErrors.length > 0 ? (
                <span className="text-red-500 font-normal">({listErrors.length} erro{listErrors.length !== 1 ? 's' : ''})</span>
              ) : (
                <span className="text-green-600 font-normal">({listSelected.length} itens sem erros)</span>
              )}
            </h2>
            <Button
              className="bg-pmdc-blue hover:bg-pmdc-blue-dark text-white gap-1.5"
              size="sm"
              disabled={!canImport}
              onClick={handleImport}
            >
              {importing ? 'Importando…' : `Confirmar (${listSelected.length} itens)`}
            </Button>
          </div>
          {listErrors.length > 0 && (
            <div className="px-6 py-3 bg-red-50 border-b flex items-center gap-2 text-sm text-red-600">
              <AlertCircle size={14} />
              Linhas com erro serão ignoradas na importação
            </div>
          )}
          <div className="overflow-x-auto max-h-96 overflow-y-auto">
            <Table>
              <TableHeader>
                <TableRow className="bg-slate-50">
                  <TableHead className="w-10"></TableHead>
                  <TableHead className="w-10">#</TableHead>
                  <TableHead>Descrição</TableHead>
                  <TableHead>Categoria</TableHead>
                  <TableHead>Unidade</TableHead>
                  <TableHead>344/98</TableHead>
                  <TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {listPreview.map((row) => (
                  <TableRow key={row.linha} className={row.error ? 'bg-red-50' : !row.selected ? 'opacity-40' : ''}>
                    <TableCell>
                      {!row.error && (
                        <input
                          type="checkbox"
                          checked={row.selected}
                          onChange={() => setListPreview((p) => p?.map((r) => r.linha === row.linha ? { ...r, selected: !r.selected } : r) ?? null)}
                          className="h-4 w-4"
                        />
                      )}
                    </TableCell>
                    <TableCell className="text-slate-400 text-xs">{row.linha}</TableCell>
                    <TableCell className={row.error ? 'text-red-700' : ''}>{row.descricao || '—'}</TableCell>
                    <TableCell>
                      {VALID_CATEGORIES.includes(row.categoria) ? (
                        <Badge className={row.categoria === 'MEDICATION' ? 'bg-blue-50 text-blue-700 border-blue-200' : 'bg-teal-50 text-teal-700 border-teal-200'}>
                          {ITEM_CATEGORY_LABELS[row.categoria as ItemCategory]}
                        </Badge>
                      ) : (
                        <span className="text-red-500 text-xs">{row.categoria || '—'}</span>
                      )}
                    </TableCell>
                    <TableCell className="text-slate-500 text-sm">{row.unidade || '—'}</TableCell>
                    <TableCell className="text-slate-500 text-xs">{row.controlado_344}</TableCell>
                    <TableCell>
                      {row.error ? (
                        <span className="text-xs text-red-600 flex items-center gap-1"><AlertCircle size={12} /> {row.error}</span>
                      ) : (
                        <CheckCircle2 size={14} className="text-green-500" />
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </div>
      )}

      {/* Preview — matrix mode */}
      {mode === 'matrix' && matrixPreview && (
        <div className="bg-white rounded-lg border overflow-hidden">
          <div className="flex items-center justify-between px-6 py-4 border-b">
            <h2 className="text-sm font-semibold text-slate-700">
              Preview —{' '}
              <span className="text-slate-500 font-normal">{matrixSelected.length} de {matrixPreview.length} selecionados</span>
            </h2>
            <div className="flex items-center gap-3">
              <button
                onClick={() => setMatrixPreview((p) => p?.map((r) => ({ ...r, selected: true })) ?? null)}
                className="text-xs text-pmdc-blue hover:underline"
              >
                Selecionar todos
              </button>
              <Button
                className="bg-pmdc-blue hover:bg-pmdc-blue-dark text-white gap-1.5"
                size="sm"
                disabled={!canImport}
                onClick={handleImport}
              >
                {importing ? 'Importando…' : `Confirmar (${matrixSelected.length} itens)`}
              </Button>
            </div>
          </div>
          <div className="px-6 py-3 bg-amber-50 border-b flex items-start gap-2 text-sm text-amber-700">
            <Info size={14} className="mt-0.5 shrink-0" />
            <span>
              <strong>{matrixPreview.length} itens detectados.</strong>{' '}
              Unidade de medida foi inferida automaticamente — revise após importar usando a tela de edição em lote.
            </span>
          </div>
          <div className="overflow-x-auto max-h-96 overflow-y-auto">
            <Table>
              <TableHeader>
                <TableRow className="bg-slate-50">
                  <TableHead className="w-10"></TableHead>
                  <TableHead className="w-10">#</TableHead>
                  <TableHead>Descrição</TableHead>
                  <TableHead>Categoria</TableHead>
                  <TableHead>
                    <span className="flex items-center gap-1">
                      Unidade inferida <Info size={12} className="text-slate-400" aria-label="Inferida automaticamente — revise após importar" />
                    </span>
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {matrixPreview.map((row) => (
                  <TableRow key={row.idx} className={!row.selected ? 'opacity-40' : ''}>
                    <TableCell>
                      <input
                        type="checkbox"
                        checked={row.selected}
                        onChange={() => setMatrixPreview((p) => p?.map((r) => r.idx === row.idx ? { ...r, selected: !r.selected } : r) ?? null)}
                        className="h-4 w-4"
                      />
                    </TableCell>
                    <TableCell className="text-slate-400 text-xs">{row.idx + 1}</TableCell>
                    <TableCell className="text-sm">{row.description}</TableCell>
                    <TableCell>
                      <Badge className={row.category === ItemCategory.MEDICATION ? 'bg-blue-50 text-blue-700 border-blue-200' : 'bg-teal-50 text-teal-700 border-teal-200'}>
                        {ITEM_CATEGORY_LABELS[row.category]}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-slate-500 text-sm font-mono">{row.unitOfMeasure}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </div>
      )}
    </div>
  );
}
