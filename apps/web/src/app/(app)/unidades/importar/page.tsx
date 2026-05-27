'use client';
import { useCallback, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import * as XLSX from 'xlsx';
import { toast } from 'sonner';
import { UNIT_TYPE_LABELS, UnitType } from '@farmagest/shared';
import { apiClient } from '@/lib/api-client';
import { PageHeader } from '@/components/shared/PageHeader';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
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
  idx: number;
  name: string;
  type: string;
  responsible: string;
  error?: string;
  selected: boolean;
}

interface MatrixPreviewRow {
  idx: number;
  name: string;
  type: UnitType;
  selected: boolean;
}

const VALID_TYPES = Object.values(UnitType) as string[];

const TYPE_COLORS: Record<UnitType, string> = {
  [UnitType.UBS]: 'bg-green-50 text-green-700 border-green-200',
  [UnitType.UPA]: 'bg-orange-50 text-orange-700 border-orange-200',
  [UnitType.HOSPITAL]: 'bg-red-50 text-red-700 border-red-200',
  [UnitType.CAPS]: 'bg-purple-50 text-purple-700 border-purple-200',
  [UnitType.OTHER]: 'bg-slate-50 text-slate-600 border-slate-200',
};

function inferUnitType(name: string): UnitType {
  const t = name.trim();
  if (/^UPA\b/i.test(t)) return UnitType.UPA;
  if (/^(UBS|USF|CF)\b/i.test(t)) return UnitType.UBS;
  if (/^HOSPITAL\b/i.test(t)) return UnitType.HOSPITAL;
  if (/^CAPS\b/i.test(t)) return UnitType.CAPS;
  return UnitType.OTHER;
}

function colToNum(col: string): number {
  const s = col.trim().toUpperCase();
  if (/^\d+$/.test(s)) return parseInt(s, 10);
  let n = 0;
  for (const ch of s) n = n * 26 + ch.charCodeAt(0) - 64;
  return n;
}

export default function ImportarUnidadesPage() {
  const router = useRouter();
  const [mode, setMode] = useState<ImportMode>('list');
  const [file, setFile] = useState<File | null>(null);
  const [listPreview, setListPreview] = useState<ListPreviewRow[] | null>(null);
  const [matrixPreview, setMatrixPreview] = useState<MatrixPreviewRow[] | null>(null);
  const [headerRow, setHeaderRow] = useState('1');
  const [startCol, setStartCol] = useState('C');
  const [endCol, setEndCol] = useState('');
  const [importing, setImporting] = useState(false);
  const [result, setResult] = useState<{ imported: number } | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  function resetFile() {
    setFile(null);
    setListPreview(null);
    setMatrixPreview(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
  }

  function parseListMode(wb: XLSX.WorkBook) {
    const ws = wb.Sheets[wb.SheetNames[0]];
    const rows: Record<string, unknown>[] = XLSX.utils.sheet_to_json(ws);
    const parsed: ListPreviewRow[] = rows.slice(0, 300).map((row, i) => {
      const name = String(row['nome'] ?? '').trim();
      const type = String(row['tipo'] ?? '').trim().toUpperCase();
      const responsible = String(row['responsavel'] ?? '').trim();
      let error: string | undefined;
      if (!name) error = 'Nome obrigatório';
      else if (name.length > 180) error = 'Nome excede 180 caracteres';
      else if (!VALID_TYPES.includes(type)) error = `Tipo inválido: "${row['tipo']}"`;
      else if (!responsible) error = 'Responsável obrigatório';
      return { idx: i, name, type, responsible, error, selected: true };
    });
    setListPreview(parsed);
  }

  function parseMatrixMode(wb: XLSX.WorkBook) {
    const ws = wb.Sheets[wb.SheetNames[0]];
    const headerRowIdx = Math.max(0, parseInt(headerRow || '1', 10) - 1);
    const startColIdx = colToNum(startCol || 'C') - 1;
    const range = XLSX.utils.decode_range(ws['!ref'] ?? 'A1');
    const endColIdx = endCol ? colToNum(endCol) - 1 : range.e.c;
    const names: MatrixPreviewRow[] = [];
    for (let c = startColIdx; c <= endColIdx; c++) {
      const addr = XLSX.utils.encode_cell({ r: headerRowIdx, c });
      const cell = ws[addr];
      if (!cell) continue;
      const val = String(cell.v ?? '').trim().replace(/\s+/g, ' ');
      if (!val) continue;
      names.push({ idx: names.length, name: val, type: inferUnitType(val), selected: true });
    }
    setMatrixPreview(names);
  }

  function handleFile(f: File) {
    setFile(f);
    setListPreview(null);
    setMatrixPreview(null);
    const reader = new FileReader();
    reader.onload = (e) => {
      const data = new Uint8Array(e.target?.result as ArrayBuffer);
      const wb = XLSX.read(data, { type: 'array' });
      if (mode === 'list') parseListMode(wb);
      else parseMatrixMode(wb);
    };
    reader.readAsArrayBuffer(f);
  }

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0];
    if (f) handleFile(f);
  }

  const onDrop = useCallback((e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    const f = e.dataTransfer.files[0];
    if (f) handleFile(f);
  }, [mode, headerRow, startCol, endCol]); // eslint-disable-line

  function reparse() {
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (e) => {
      const data = new Uint8Array(e.target?.result as ArrayBuffer);
      const wb = XLSX.read(data, { type: 'array' });
      if (mode === 'list') parseListMode(wb);
      else parseMatrixMode(wb);
    };
    reader.readAsArrayBuffer(file);
  }

  function toggleListRow(idx: number) {
    setListPreview((prev) => prev?.map((r) => r.idx === idx ? { ...r, selected: !r.selected } : r) ?? null);
  }

  function toggleMatrixRow(idx: number) {
    setMatrixPreview((prev) => prev?.map((r) => r.idx === idx ? { ...r, selected: !r.selected } : r) ?? null);
  }

  async function handleImport() {
    if (!file) return;
    setImporting(true);
    try {
      const formData = new FormData();

      if (mode === 'list') {
        const selected = listPreview?.filter((r) => r.selected && !r.error) ?? [];
        const ws = XLSX.utils.aoa_to_sheet([
          ['nome', 'tipo', 'responsavel', 'endereco', 'contato'],
          ...selected.map((r) => [r.name, r.type, r.responsible, '', '']),
        ]);
        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, 'Unidades');
        const buf = XLSX.write(wb, { type: 'array', bookType: 'xlsx' }) as ArrayBuffer;
        formData.append('file', new Blob([buf], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' }), 'import.xlsx');
        formData.append('mode', 'list');
      } else {
        const selected = matrixPreview?.filter((r) => r.selected) ?? [];
        const ws = XLSX.utils.aoa_to_sheet([selected.map((r) => r.name)]);
        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, 'Unidades');
        const buf = XLSX.write(wb, { type: 'array', bookType: 'xlsx' }) as ArrayBuffer;
        formData.append('file', new Blob([buf], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' }), 'import.xlsx');
        formData.append('mode', 'matrix');
        formData.append('headerRow', '1');
        formData.append('startColumn', '1');
        formData.append('endColumn', String(selected.length));
      }

      const res = await apiClient.post<{ imported: number }>('/units/import', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      setResult(res.data);
      toast.success(`${res.data.imported} unidades importadas com sucesso`);
    } catch (err: any) {
      const serverErrors = err.response?.data?.errors as string[] | undefined;
      if (serverErrors?.length) {
        toast.error(`Erros: ${serverErrors[0]}`);
      } else {
        toast.error(err.response?.data?.message ?? 'Erro na importação');
      }
    } finally {
      setImporting(false);
    }
  }

  async function downloadTemplate() {
    try {
      const res = await apiClient.get('/units/import/template', { responseType: 'blob' });
      const url = URL.createObjectURL(res.data as Blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'modelo-importacao-unidades.xlsx';
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
    !!file &&
    (mode === 'list' ? listSelected.length > 0 : matrixSelected.length > 0);

  if (result) {
    return (
      <div className="p-6 max-w-2xl">
        <div className="bg-white rounded-lg border p-8 text-center space-y-4">
          <CheckCircle2 size={48} className="text-green-500 mx-auto" />
          <h2 className="text-xl font-semibold text-slate-800">
            {result.imported} unidades importadas com sucesso
          </h2>
          <div className="flex justify-center gap-3">
            <Button
              variant="outline"
              onClick={() => { setResult(null); resetFile(); }}
            >
              Nova importação
            </Button>
            <Button
              className="bg-pmdc-blue hover:bg-pmdc-blue-dark text-white"
              onClick={() => router.push('/unidades')}
            >
              Ver unidades
            </Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 max-w-4xl space-y-6">
      <PageHeader
        title="Importar Unidades"
        description="Importe múltiplas unidades de saúde via planilha"
      />

      <Button
        variant="ghost"
        size="sm"
        className="gap-1.5 text-slate-500 -mt-4"
        onClick={() => router.back()}
      >
        <ArrowLeft size={16} /> Voltar
      </Button>

      {/* Mode tabs */}
      <div className="bg-white rounded-lg border overflow-hidden">
        <div className="flex border-b">
          <button
            onClick={() => { setMode('list'); resetFile(); }}
            className={[
              'flex-1 px-6 py-3 text-sm font-medium transition-colors',
              mode === 'list'
                ? 'bg-pmdc-blue text-white'
                : 'text-slate-600 hover:bg-slate-50',
            ].join(' ')}
          >
            Lista padrão
          </button>
          <button
            onClick={() => { setMode('matrix'); resetFile(); }}
            className={[
              'flex-1 px-6 py-3 text-sm font-medium transition-colors',
              mode === 'matrix'
                ? 'bg-pmdc-blue text-white'
                : 'text-slate-600 hover:bg-slate-50',
            ].join(' ')}
          >
            Planilha da Marylyn (matriz)
          </button>
        </div>

        <div className="p-6 space-y-5">
          {mode === 'list' ? (
            <>
              <div className="flex items-center justify-between">
                <p className="text-sm text-slate-600">
                  Planilha com colunas: <span className="font-mono text-xs bg-slate-100 px-1 rounded">nome</span>{' '}
                  <span className="font-mono text-xs bg-slate-100 px-1 rounded">tipo</span>{' '}
                  <span className="font-mono text-xs bg-slate-100 px-1 rounded">responsavel</span>{' '}
                  <span className="font-mono text-xs bg-slate-100 px-1 rounded">endereco</span>{' '}
                  <span className="font-mono text-xs bg-slate-100 px-1 rounded">contato</span>
                </p>
                <Button variant="outline" size="sm" className="gap-1.5 shrink-0" onClick={downloadTemplate}>
                  <Download size={14} /> Baixar modelo
                </Button>
              </div>
            </>
          ) : (
            <div className="space-y-4">
              <div className="flex items-start gap-2 p-3 bg-blue-50 rounded-lg text-sm text-blue-700">
                <Info size={14} className="mt-0.5 shrink-0" />
                <span>
                  Importa unidades a partir do formato matriz da planilha de abastecimento.
                  Os nomes das unidades são lidos do cabeçalho (colunas C em diante).
                </span>
              </div>
              <div className="grid grid-cols-3 gap-4">
                <div className="space-y-1.5">
                  <Label className="text-xs">Linha do cabeçalho</Label>
                  <Input
                    value={headerRow}
                    onChange={(e) => setHeaderRow(e.target.value)}
                    onBlur={reparse}
                    placeholder="1"
                    className="text-sm"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs">Coluna inicial</Label>
                  <Input
                    value={startCol}
                    onChange={(e) => setStartCol(e.target.value.toUpperCase())}
                    onBlur={reparse}
                    placeholder="C"
                    className="text-sm"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs">Coluna final <span className="text-slate-400">(vazio = auto)</span></Label>
                  <Input
                    value={endCol}
                    onChange={(e) => setEndCol(e.target.value.toUpperCase())}
                    onBlur={reparse}
                    placeholder="automático"
                    className="text-sm"
                  />
                </div>
              </div>
            </div>
          )}

          {/* Drop zone */}
          <div
            onDrop={onDrop}
            onDragOver={(e) => e.preventDefault()}
            onClick={() => fileInputRef.current?.click()}
            className="border-2 border-dashed border-slate-200 rounded-lg p-8 text-center cursor-pointer hover:border-pmdc-blue/40 hover:bg-pmdc-blue/5 transition-colors"
          >
            {file ? (
              <div className="flex items-center justify-center gap-3 text-slate-700">
                <FileSpreadsheet size={24} className="text-green-600" />
                <div className="text-left">
                  <div className="font-medium text-sm">{file.name}</div>
                  <div className="text-xs text-slate-400">
                    {mode === 'list'
                      ? `${listPreview?.length ?? 0} linhas detectadas`
                      : `${matrixPreview?.length ?? 0} colunas detectadas`}
                  </div>
                </div>
              </div>
            ) : (
              <div className="space-y-2 text-slate-400">
                <Upload size={32} className="mx-auto" />
                <p className="text-sm">Arraste um arquivo .xlsx ou .csv aqui</p>
                <p className="text-xs">ou clique para selecionar</p>
              </div>
            )}
            <input
              ref={fileInputRef}
              type="file"
              accept=".xlsx,.csv"
              className="hidden"
              onChange={handleFileChange}
            />
          </div>
        </div>
      </div>

      {/* Preview — list mode */}
      {mode === 'list' && listPreview && (
        <div className="bg-white rounded-lg border overflow-hidden">
          <div className="flex items-center justify-between px-6 py-4 border-b">
            <h2 className="text-sm font-semibold text-slate-700">
              Preview{' '}
              {listErrors.length > 0 ? (
                <span className="text-red-500 font-normal">
                  ({listErrors.length} erro{listErrors.length !== 1 ? 's' : ''})
                </span>
              ) : (
                <span className="text-green-600 font-normal">({listSelected.length} selecionadas)</span>
              )}
            </h2>
            <Button
              className="bg-pmdc-blue hover:bg-pmdc-blue-dark text-white gap-1.5"
              size="sm"
              disabled={!canImport}
              onClick={handleImport}
            >
              {importing ? 'Importando…' : `Confirmar (${listSelected.length} unidades)`}
            </Button>
          </div>
          {listErrors.length > 0 && (
            <div className="px-6 py-3 bg-red-50 border-b flex items-center gap-2 text-sm text-red-600">
              <AlertCircle size={14} />
              Linhas com erro serão automaticamente excluídas da importação
            </div>
          )}
          <div className="overflow-x-auto max-h-96 overflow-y-auto">
            <Table>
              <TableHeader>
                <TableRow className="bg-slate-50">
                  <TableHead className="w-10"></TableHead>
                  <TableHead>#</TableHead>
                  <TableHead>Nome</TableHead>
                  <TableHead>Tipo</TableHead>
                  <TableHead>Responsável</TableHead>
                  <TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {listPreview.map((row) => (
                  <TableRow key={row.idx} className={row.error ? 'bg-red-50' : !row.selected ? 'opacity-40' : ''}>
                    <TableCell>
                      {!row.error && (
                        <input
                          type="checkbox"
                          checked={row.selected}
                          onChange={() => toggleListRow(row.idx)}
                          className="h-4 w-4"
                        />
                      )}
                    </TableCell>
                    <TableCell className="text-slate-400 text-xs">{row.idx + 2}</TableCell>
                    <TableCell className={row.error ? 'text-red-700' : ''}>{row.name || '—'}</TableCell>
                    <TableCell>
                      {VALID_TYPES.includes(row.type) ? (
                        <Badge className={TYPE_COLORS[row.type as UnitType]}>
                          {UNIT_TYPE_LABELS[row.type as UnitType]}
                        </Badge>
                      ) : (
                        <span className="text-red-500 text-xs">{row.type || '—'}</span>
                      )}
                    </TableCell>
                    <TableCell className="text-slate-500 text-sm">{row.responsible || '—'}</TableCell>
                    <TableCell>
                      {row.error ? (
                        <span className="text-xs text-red-600 flex items-center gap-1">
                          <AlertCircle size={12} /> {row.error}
                        </span>
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
              <span className="text-slate-500 font-normal">
                {matrixSelected.length} de {matrixPreview.length} selecionadas
              </span>
            </h2>
            <div className="flex items-center gap-3">
              <button
                onClick={() => setMatrixPreview((p) => p?.map((r) => ({ ...r, selected: true })) ?? null)}
                className="text-xs text-pmdc-blue hover:underline"
              >
                Selecionar todas
              </button>
              <Button
                className="bg-pmdc-blue hover:bg-pmdc-blue-dark text-white gap-1.5"
                size="sm"
                disabled={!canImport}
                onClick={handleImport}
              >
                {importing ? 'Importando…' : `Confirmar (${matrixSelected.length} unidades)`}
              </Button>
            </div>
          </div>
          <div className="overflow-x-auto max-h-96 overflow-y-auto">
            <Table>
              <TableHeader>
                <TableRow className="bg-slate-50">
                  <TableHead className="w-10"></TableHead>
                  <TableHead>#</TableHead>
                  <TableHead>Nome</TableHead>
                  <TableHead>Tipo inferido</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {matrixPreview.map((row) => (
                  <TableRow key={row.idx} className={!row.selected ? 'opacity-40' : ''}>
                    <TableCell>
                      <input
                        type="checkbox"
                        checked={row.selected}
                        onChange={() => toggleMatrixRow(row.idx)}
                        className="h-4 w-4"
                      />
                    </TableCell>
                    <TableCell className="text-slate-400 text-xs">{row.idx + 1}</TableCell>
                    <TableCell className="text-sm">{row.name}</TableCell>
                    <TableCell>
                      <Badge className={TYPE_COLORS[row.type]}>
                        {UNIT_TYPE_LABELS[row.type]}
                      </Badge>
                    </TableCell>
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
