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
import { ArrowLeft, Download, Upload, AlertCircle, CheckCircle2, FileSpreadsheet } from 'lucide-react';

interface PreviewRow {
  linha: number;
  descricao: string;
  categoria: string;
  unidade: string;
  fabricante: string;
  controlado_344: string;
  error?: string;
}

const VALID_CATEGORIES = ['MEDICATION', 'CORRELATE'];

function validateRow(row: Record<string, unknown>, num: number): PreviewRow {
  const descricao = String(row['descricao'] ?? '').trim();
  const categoria = String(row['categoria'] ?? '').trim().toUpperCase();
  const unidade = String(row['unidade'] ?? '').trim();
  const fabricante = String(row['fabricante'] ?? '').trim();
  const controlado_344 = String(row['controlado_344'] ?? 'NAO').trim().toUpperCase();

  let error: string | undefined;
  if (!descricao) error = 'Descrição obrigatória';
  else if (descricao.length > 200) error = 'Descrição excede 200 caracteres';
  else if (!VALID_CATEGORIES.includes(categoria)) error = `Categoria inválida: "${row['categoria']}" (use MEDICATION ou CORRELATE)`;
  else if (!unidade) error = 'Unidade obrigatória';

  return { linha: num, descricao, categoria, unidade, fabricante, controlado_344, error };
}

export default function ImportarItensPage() {
  const router = useRouter();
  const user = useAuthStore((s) => s.user);
  const isManager = user?.role === UserRole.MANAGER;
  const { data: sectorsData } = useSectors({ active: 'true', limit: 100 });

  const [sectorId, setSectorId] = useState(isManager ? '' : (user?.sectorId ?? ''));
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<PreviewRow[] | null>(null);
  const [importing, setImporting] = useState(false);
  const [result, setResult] = useState<{ imported: number; codes: string[] } | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const selectedSector = sectorsData?.data.find((s) => s.id === sectorId);

  function parseFile(f: File) {
    const reader = new FileReader();
    reader.onload = (e) => {
      const data = new Uint8Array(e.target?.result as ArrayBuffer);
      const wb = XLSX.read(data, { type: 'array' });
      const ws = wb.Sheets[wb.SheetNames[0]];
      const rows: Record<string, unknown>[] = XLSX.utils.sheet_to_json(ws);
      const parsed = rows.slice(0, 200).map((row, i) => validateRow(row, i + 2));
      setPreview(parsed);
    };
    reader.readAsArrayBuffer(f);
  }

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0];
    if (!f) return;
    setFile(f);
    setPreview(null);
    setResult(null);
    parseFile(f);
  }

  const onDrop = useCallback((e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    const f = e.dataTransfer.files[0];
    if (!f) return;
    setFile(f);
    setPreview(null);
    setResult(null);
    parseFile(f);
  }, []);

  async function handleImport() {
    if (!file || !sectorId) return;
    setImporting(true);
    try {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('sectorId', sectorId);
      const res = await apiClient.post<{ imported: number; codes: string[] }>(
        '/items/import',
        formData,
        { headers: { 'Content-Type': 'multipart/form-data' } },
      );
      setResult(res.data);
      toast.success(`${res.data.imported} itens importados com sucesso`);
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

  const hasErrors = preview?.some((r) => r.error);
  const canImport = !!file && !!sectorId && preview !== null && !hasErrors;

  if (result) {
    return (
      <div className="p-6 max-w-2xl">
        <div className="bg-white rounded-lg border p-8 text-center space-y-4">
          <CheckCircle2 size={48} className="text-green-500 mx-auto" />
          <h2 className="text-xl font-semibold text-slate-800">
            {result.imported} itens importados com sucesso
          </h2>
          {selectedSector && (
            <p className="text-slate-500 text-sm">
              Setor: <span className="font-mono font-medium">{selectedSector.code}</span> — {selectedSector.name}
            </p>
          )}
          <div className="bg-slate-50 rounded-lg p-4 text-left max-h-48 overflow-auto">
            <div className="text-xs text-slate-400 mb-2">Códigos gerados:</div>
            <div className="flex flex-wrap gap-1.5">
              {result.codes.map((c) => (
                <Badge key={c} variant="outline" className="font-mono text-xs">{c}</Badge>
              ))}
            </div>
          </div>
          <div className="flex justify-center gap-3">
            <Button variant="outline" onClick={() => { setResult(null); setFile(null); setPreview(null); }}>
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
    <div className="p-6 max-w-3xl space-y-6">
      <PageHeader title="Importar Itens" description="Importe múltiplos itens via planilha CSV ou XLSX" />

      <Button variant="ghost" size="sm" className="gap-1.5 text-slate-500 -mt-4" onClick={() => router.back()}>
        <ArrowLeft size={16} /> Voltar
      </Button>

      {/* Configurações */}
      <div className="bg-white rounded-lg border p-6 space-y-5">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-semibold text-slate-700">Configuração</h2>
          <Button variant="outline" size="sm" className="gap-1.5" onClick={downloadTemplate}>
            <Download size={14} /> Baixar modelo de planilha
          </Button>
        </div>

        <div className="space-y-1.5">
          <label className="text-sm font-medium text-slate-700">Setor de destino</label>
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
                <div className="text-xs text-slate-400">{preview?.length ?? 0} linhas detectadas</div>
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

      {/* Preview */}
      {preview && (
        <div className="bg-white rounded-lg border overflow-hidden">
          <div className="flex items-center justify-between px-6 py-4 border-b">
            <h2 className="text-sm font-semibold text-slate-700">
              Preview{' '}
              {hasErrors ? (
                <span className="text-red-500 font-normal">
                  ({preview.filter((r) => r.error).length} erro{preview.filter((r) => r.error).length !== 1 ? 's' : ''})
                </span>
              ) : (
                <span className="text-green-600 font-normal">({preview.length} linhas sem erros)</span>
              )}
            </h2>
            <Button
              className="bg-pmdc-blue hover:bg-pmdc-blue-dark text-white gap-1.5"
              size="sm"
              disabled={!canImport || importing}
              onClick={handleImport}
            >
              {importing ? 'Importando…' : `Confirmar importação (${preview.length} itens)`}
            </Button>
          </div>
          {hasErrors && (
            <div className="px-6 py-3 bg-red-50 border-b flex items-center gap-2 text-sm text-red-600">
              <AlertCircle size={14} />
              Corrija os erros antes de importar
            </div>
          )}
          <div className="overflow-x-auto max-h-96 overflow-y-auto">
            <Table>
              <TableHeader>
                <TableRow className="bg-slate-50">
                  <TableHead className="w-12">#</TableHead>
                  <TableHead>Descrição</TableHead>
                  <TableHead>Categoria</TableHead>
                  <TableHead>Unidade</TableHead>
                  <TableHead>Fabricante</TableHead>
                  <TableHead>344/98</TableHead>
                  <TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {preview.map((row) => (
                  <TableRow key={row.linha} className={row.error ? 'bg-red-50' : ''}>
                    <TableCell className="text-slate-400 text-xs">{row.linha}</TableCell>
                    <TableCell className={row.error ? 'text-red-700' : ''}>{row.descricao || '—'}</TableCell>
                    <TableCell>
                      {VALID_CATEGORIES.includes(row.categoria) ? (
                        <Badge className={
                          row.categoria === 'MEDICATION'
                            ? 'bg-blue-50 text-blue-700 border-blue-200'
                            : 'bg-teal-50 text-teal-700 border-teal-200'
                        }>
                          {ITEM_CATEGORY_LABELS[row.categoria as ItemCategory]}
                        </Badge>
                      ) : (
                        <span className="text-red-500 text-xs">{row.categoria || '—'}</span>
                      )}
                    </TableCell>
                    <TableCell className="text-slate-500 text-sm">{row.unidade || '—'}</TableCell>
                    <TableCell className="text-slate-500">{row.fabricante || '—'}</TableCell>
                    <TableCell className="text-slate-500 text-xs">{row.controlado_344}</TableCell>
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
    </div>
  );
}
