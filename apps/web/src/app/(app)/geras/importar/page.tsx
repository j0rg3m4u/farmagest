'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { apiClient } from '@/lib/api-client';
import { useUnits } from '@/hooks/use-units';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ArrowLeft, Upload, CheckCircle2, AlertTriangle, XCircle } from 'lucide-react';
import Link from 'next/link';

type PreviewResult = {
  header: {
    externalNumber: string | null;
    requestedAt: string | null;
    unitName: string | null;
    type: string | null;
    deadline: string | null;
  };
  unitMatch: { found: boolean; unit: { id: string; name: string } | null; nameInPdf: string | null };
  items: Array<{
    externalCode: string;
    description: string;
    requested: number;
    mapped: boolean;
    item: { id: string; code: string; description: string } | null;
  }>;
  summary: { total: number; mapped: number; unmapped: number; parseErrors: number };
  errors: string[];
};

export default function ImportarGeraPage() {
  const router = useRouter();
  const { data: unitsData } = useUnits({ limit: 200 });

  const [step, setStep] = useState<'upload' | 'preview' | 'confirming'>('upload');
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<PreviewResult | null>(null);
  const [selectedUnitId, setSelectedUnitId] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  async function handleAnalyze() {
    if (!file) return;
    setIsLoading(true);
    try {
      const formData = new FormData();
      formData.append('file', file);
      const res = await apiClient.post<PreviewResult>('/geras/import/pdf/preview', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      setPreview(res.data);
      if (res.data.unitMatch.unit) {
        setSelectedUnitId(res.data.unitMatch.unit.id);
      }
      setStep('preview');
    } catch (err: any) {
      toast.error(err.response?.data?.message ?? 'Erro ao analisar PDF');
    } finally {
      setIsLoading(false);
    }
  }

  async function handleConfirm() {
    if (!file) return;
    if (!selectedUnitId) {
      toast.error('Selecione a unidade solicitante');
      return;
    }
    setStep('confirming');
    try {
      const formData = new FormData();
      formData.append('file', file);
      if (selectedUnitId) formData.append('unitId', selectedUnitId);
      if (preview?.header.externalNumber) {
        formData.append('externalNumber', preview.header.externalNumber);
      }
      const res = await apiClient.post<{ id: string; code: string }>('/geras/import/pdf/confirm', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      toast.success(`GERA ${res.data.code} criado com sucesso`);
      router.push(`/geras/${res.data.id}`);
    } catch (err: any) {
      toast.error(err.response?.data?.message ?? 'Erro ao importar GERA');
      setStep('preview');
    }
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
          <h1 className="text-2xl font-semibold text-slate-900">Importar GERA via PDF</h1>
          <p className="text-slate-500 text-sm">Importar pedido de abastecimento a partir do arquivo oficial</p>
        </div>
      </div>

      {/* Passo 1 — Upload */}
      {step === 'upload' && (
        <div className="bg-white rounded-lg border p-8 text-center space-y-4">
          <div className="mx-auto w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center">
            <Upload size={28} className="text-slate-400" />
          </div>
          <div>
            <p className="font-medium text-slate-700">Selecione o PDF do GERA</p>
            <p className="text-sm text-slate-400 mt-1">Arquivo gerado pelo sistema da PMDC (max. 10 MB)</p>
          </div>
          <input
            type="file"
            accept=".pdf"
            className="hidden"
            id="pdf-upload"
            onChange={(e) => setFile(e.target.files?.[0] ?? null)}
          />
          <label
            htmlFor="pdf-upload"
            className="inline-flex items-center justify-center rounded-md border border-input bg-background px-4 py-2 text-sm font-medium hover:bg-accent hover:text-accent-foreground cursor-pointer transition-colors"
          >
            Selecionar arquivo
          </label>
          {file && (
            <div className="flex items-center justify-center gap-2 text-sm text-slate-600">
              <CheckCircle2 size={16} className="text-green-500" />
              {file.name}
            </div>
          )}
          <Button
            onClick={handleAnalyze}
            disabled={!file || isLoading}
            className="bg-pmdc-blue hover:bg-pmdc-blue-dark text-white"
          >
            {isLoading ? 'Analisando…' : 'Analisar PDF'}
          </Button>
        </div>
      )}

      {/* Passo 2 — Preview */}
      {step === 'preview' && preview && (
        <div className="space-y-4">
          {/* Resumo */}
          <div className="bg-white rounded-lg border p-5 space-y-3">
            <h2 className="font-medium text-slate-800">
              GERA Nº {preview.header.externalNumber ?? '—'} — {preview.header.unitName ?? 'Unidade não identificada'}
            </h2>

            <div className="flex gap-3 flex-wrap text-sm">
              <div className={`flex items-center gap-1.5 px-3 py-1 rounded-full ${preview.unitMatch.found ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'}`}>
                {preview.unitMatch.found ? <CheckCircle2 size={14} /> : <XCircle size={14} />}
                Unidade: {preview.unitMatch.found ? preview.unitMatch.unit?.name : 'Não identificada'}
              </div>
              <div className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-green-50 text-green-700">
                <CheckCircle2 size={14} />
                {preview.summary.mapped} itens mapeados
              </div>
              {preview.summary.unmapped > 0 && (
                <div className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-yellow-50 text-yellow-700">
                  <AlertTriangle size={14} />
                  {preview.summary.unmapped} não encontrados
                </div>
              )}
              {preview.summary.parseErrors > 0 && (
                <div className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-red-50 text-red-700">
                  <XCircle size={14} />
                  {preview.summary.parseErrors} erros de leitura
                </div>
              )}
            </div>

            {/* Seleção de unidade se não identificada */}
            {!preview.unitMatch.found && (
              <div className="space-y-1">
                <p className="text-sm font-medium text-slate-700">Selecionar unidade manualmente:</p>
                <select
                  value={selectedUnitId}
                  onChange={(e) => setSelectedUnitId(e.target.value)}
                  className="w-full border rounded-md px-3 py-2 text-sm"
                >
                  <option value="">Selecione…</option>
                  {unitsData?.data?.map((u) => (
                    <option key={u.id} value={u.id}>{u.name}</option>
                  ))}
                </select>
              </div>
            )}
          </div>

          {/* Lista de itens */}
          <div className="bg-white rounded-lg border overflow-hidden">
            <div className="px-4 py-3 bg-slate-50 border-b text-sm font-medium text-slate-700">
              {preview.summary.total} itens encontrados
            </div>
            <div className="divide-y max-h-96 overflow-y-auto">
              {preview.items.map((item, i) => (
                <div key={i} className="flex items-center gap-3 px-4 py-2.5">
                  <span className="font-mono text-xs text-slate-500 w-16 shrink-0">{item.externalCode}</span>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm truncate">{item.description}</p>
                    {item.mapped && item.item && (
                      <p className="text-xs text-slate-400">{item.item.code} — {item.item.description}</p>
                    )}
                  </div>
                  <span className="text-sm text-slate-500 shrink-0">{item.requested}</span>
                  <Badge className={item.mapped
                    ? 'bg-green-50 text-green-700 border-green-200 text-xs'
                    : 'bg-yellow-50 text-yellow-700 border-yellow-200 text-xs'
                  }>
                    {item.mapped ? 'Mapeado' : 'Não mapeado'}
                  </Badge>
                </div>
              ))}
            </div>
          </div>

          <div className="flex justify-between">
            <Button variant="outline" onClick={() => setStep('upload')}>
              Voltar
            </Button>
            <Button
              onClick={handleConfirm}
              disabled={!selectedUnitId}
              className="bg-pmdc-blue hover:bg-pmdc-blue-dark text-white"
            >
              Confirmar importação ({preview.summary.total} itens)
            </Button>
          </div>
        </div>
      )}

      {step === 'confirming' && (
        <div className="bg-white rounded-lg border p-8 text-center">
          <p className="text-slate-600">Criando GERA…</p>
        </div>
      )}
    </div>
  );
}
