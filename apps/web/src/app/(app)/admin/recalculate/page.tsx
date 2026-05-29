'use client';

import { useState } from 'react';
import { useMutation } from '@tanstack/react-query';
import { toast } from 'sonner';
import { RefreshCcw } from 'lucide-react';
import { apiClient } from '@/lib/api-client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card } from '@/components/ui/card';

interface RecalcResult {
  recalculados: number;
  divergencias: number;
}

export default function AdminRecalculatePage() {
  const [sectorId, setSectorId] = useState('');
  const [result, setResult] = useState<RecalcResult | null>(null);

  const { mutate, isPending } = useMutation({
    mutationFn: (): Promise<RecalcResult> => {
      const params = sectorId ? `?sectorId=${sectorId}` : '';
      return apiClient.post<RecalcResult>(`/admin/recalculate-balances${params}`).then((r) => r.data);
    },
    onSuccess: (data) => {
      setResult(data);
      if (data.divergencias === 0) {
        toast.success(`${data.recalculados} lotes verificados — nenhuma divergência`);
      } else {
        toast.warning(`${data.divergencias} divergências corrigidas em ${data.recalculados} lotes`);
      }
    },
    onError: () => toast.error('Erro ao recalcular saldos'),
  });

  return (
    <div className="p-6 max-w-xl mx-auto">
      <h1 className="text-xl font-semibold text-gray-900 mb-2">Recalcular Saldos</h1>
      <p className="text-sm text-gray-500 mb-6">
        Recalcula o{' '}
        <code className="bg-gray-100 px-1 rounded text-xs">currentBalance</code> de cada lote a
        partir do histórico de movimentações. Use após importações ou correções manuais.
      </p>

      <Card className="p-6 space-y-5">
        <div>
          <Label htmlFor="sectorId">Setor (opcional)</Label>
          <Input
            id="sectorId"
            placeholder="ID do setor — vazio = todos"
            value={sectorId}
            onChange={(e) => setSectorId(e.target.value)}
            className="mt-1"
          />
        </div>

        <Button onClick={() => mutate()} disabled={isPending}>
          <RefreshCcw size={16} className={`mr-2 ${isPending ? 'animate-spin' : ''}`} />
          {isPending ? 'Recalculando…' : 'Executar Recálculo'}
        </Button>

        {result && (
          <div className="mt-4 p-4 bg-gray-50 rounded-lg text-sm space-y-1">
            <div>
              <span className="font-medium">Lotes verificados:</span> {result.recalculados}
            </div>
            <div
              className={result.divergencias > 0 ? 'text-yellow-700 font-medium' : 'text-green-700'}
            >
              <span className="font-medium">Divergências corrigidas:</span> {result.divergencias}
            </div>
          </div>
        )}
      </Card>
    </div>
  );
}
