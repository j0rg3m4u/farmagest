'use client';

import { useState } from 'react';
import { useMutation } from '@tanstack/react-query';
import { toast } from 'sonner';
import { Trash2, AlertTriangle } from 'lucide-react';
import { apiClient } from '@/lib/api-client';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';

type CleanupTarget = 'movements' | 'geras' | 'items' | 'all';

const TARGETS: { value: CleanupTarget; label: string; desc: string }[] = [
  { value: 'movements', label: 'Movimentações', desc: 'Remove todos os registros de movimentação' },
  { value: 'geras', label: 'GERAs', desc: 'Remove todos os pedidos GERA e seus itens' },
  { value: 'items', label: 'Itens e Lotes', desc: 'Remove todos os itens e lotes de todos os setores' },
  { value: 'all', label: 'TUDO', desc: 'Remove movimentações + GERAs + itens e lotes' },
];

export default function AdminCleanupPage() {
  const [selected, setSelected] = useState<CleanupTarget | ''>('');
  const [confirmed, setConfirmed] = useState(false);

  const { mutate, isPending } = useMutation({
    mutationFn: (target: CleanupTarget) =>
      apiClient.post('/admin/cleanup', { target }).then((r) => r.data),
    onSuccess: (_data, target) => {
      toast.success(`Limpeza de "${target}" concluída`);
      setSelected('');
      setConfirmed(false);
    },
    onError: (err: { response?: { data?: { message?: string } } }) => {
      const msg = err?.response?.data?.message ?? 'Erro ao executar limpeza';
      toast.error(msg);
    },
  });

  return (
    <div className="p-6 max-w-xl mx-auto">
      <h1 className="text-xl font-semibold text-gray-900 mb-6">Limpeza de Dados</h1>

      <div className="flex items-start gap-3 p-4 bg-red-50 border border-red-200 rounded-lg mb-6">
        <AlertTriangle size={18} className="text-red-600 mt-0.5 shrink-0" />
        <p className="text-sm text-red-700">
          Esta operação é <strong>irreversível</strong> e está bloqueada em produção. Use apenas em
          ambientes de desenvolvimento ou staging para redefinir o estado do banco.
        </p>
      </div>

      <Card className="p-6 space-y-4">
        <div>
          <label className="block text-sm font-medium mb-2">O que limpar?</label>
          <div className="space-y-2">
            {TARGETS.map((t) => (
              <label
                key={t.value}
                className="flex items-start gap-3 cursor-pointer p-3 rounded-lg border hover:bg-gray-50 transition-colors"
              >
                <input
                  type="radio"
                  name="target"
                  value={t.value}
                  checked={selected === t.value}
                  onChange={() => {
                    setSelected(t.value);
                    setConfirmed(false);
                  }}
                  className="mt-0.5"
                />
                <div>
                  <span className="text-sm font-medium text-gray-900">{t.label}</span>
                  <p className="text-xs text-gray-500">{t.desc}</p>
                </div>
              </label>
            ))}
          </div>
        </div>

        {selected && (
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={confirmed}
              onChange={(e) => setConfirmed(e.target.checked)}
            />
            <span className="text-sm text-red-700 font-medium">
              Confirmo que desejo apagar permanentemente os dados selecionados
            </span>
          </label>
        )}

        <Button
          variant="destructive"
          onClick={() => selected && mutate(selected)}
          disabled={!selected || !confirmed || isPending}
        >
          <Trash2 size={16} className="mr-2" />
          {isPending ? 'Executando…' : 'Executar Limpeza'}
        </Button>
      </Card>
    </div>
  );
}
