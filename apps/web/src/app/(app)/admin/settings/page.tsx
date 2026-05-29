'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { Save } from 'lucide-react';
import { apiClient } from '@/lib/api-client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card } from '@/components/ui/card';

interface Settings {
  requireExchangeApproval: boolean;
  exchangeTolerancePct: number;
  exchangeApprovalThreshold: number;
}

export default function AdminSettingsPage() {
  const qc = useQueryClient();

  const { data, isLoading } = useQuery<Settings>({
    queryKey: ['admin', 'settings'],
    queryFn: () => apiClient.get('/admin/settings').then((r) => r.data),
  });

  const [form, setForm] = useState<Partial<Settings>>({});

  const current: Settings = {
    requireExchangeApproval: false,
    exchangeTolerancePct: 5,
    exchangeApprovalThreshold: 0,
    ...data,
    ...form,
  };

  const { mutate, isPending } = useMutation({
    mutationFn: (body: Partial<Settings>) =>
      apiClient.patch('/admin/settings', body).then((r) => r.data),
    onSuccess: () => {
      toast.success('Configurações salvas');
      setForm({});
      qc.invalidateQueries({ queryKey: ['admin', 'settings'] });
    },
    onError: () => toast.error('Erro ao salvar configurações'),
  });

  if (isLoading) return <div className="p-6 text-sm text-gray-500">Carregando…</div>;

  return (
    <div className="p-6 max-w-xl mx-auto">
      <h1 className="text-xl font-semibold text-gray-900 mb-6">Configurações Globais</h1>

      <Card className="p-6 space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <Label>Exigir aprovação de trocas</Label>
            <p className="text-xs text-gray-500 mt-0.5">
              Trocas inter-municipais precisam de aprovação do MANAGER
            </p>
          </div>
          <button
            type="button"
            role="switch"
            aria-checked={current.requireExchangeApproval}
            onClick={() =>
              setForm((f) => ({ ...f, requireExchangeApproval: !current.requireExchangeApproval }))
            }
            className={[
              'relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none',
              current.requireExchangeApproval ? 'bg-blue-600' : 'bg-gray-200',
            ].join(' ')}
          >
            <span
              className={[
                'inline-block h-4 w-4 transform rounded-full bg-white shadow transition-transform',
                current.requireExchangeApproval ? 'translate-x-6' : 'translate-x-1',
              ].join(' ')}
            />
          </button>
        </div>

        <div>
          <Label htmlFor="tolerance">Tolerância de quantidade (%)</Label>
          <Input
            id="tolerance"
            type="number"
            min={0}
            max={100}
            value={current.exchangeTolerancePct}
            onChange={(e) =>
              setForm((f) => ({ ...f, exchangeTolerancePct: Number(e.target.value) }))
            }
            className="mt-1 w-40"
          />
          <p className="text-xs text-gray-500 mt-1">
            Diferença percentual permitida na quantidade negociada
          </p>
        </div>

        <div>
          <Label htmlFor="threshold">Limite para aprovação automática (qtd)</Label>
          <Input
            id="threshold"
            type="number"
            min={0}
            value={current.exchangeApprovalThreshold}
            onChange={(e) =>
              setForm((f) => ({ ...f, exchangeApprovalThreshold: Number(e.target.value) }))
            }
            className="mt-1 w-40"
          />
          <p className="text-xs text-gray-500 mt-1">
            Trocas abaixo deste valor são aprovadas automaticamente (0 = desativado)
          </p>
        </div>

        <Button onClick={() => mutate(form)} disabled={isPending || Object.keys(form).length === 0}>
          <Save size={16} className="mr-2" />
          {isPending ? 'Salvando…' : 'Salvar'}
        </Button>
      </Card>
    </div>
  );
}
