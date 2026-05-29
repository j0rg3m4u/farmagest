'use client';

import { useState } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { toast } from 'sonner';
import { UserCog, Copy } from 'lucide-react';
import { apiClient } from '@/lib/api-client';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { USER_ROLE_LABELS, type UserRole } from '@farmagest/shared';

interface UserItem {
  id: string;
  name: string;
  email: string;
  role: UserRole;
}

interface ImpersonateResult {
  accessToken: string;
  impersonatedUser: UserItem;
}

export default function AdminImpersonatePage() {
  const [selected, setSelected] = useState<string>('');
  const [token, setToken] = useState<string | null>(null);

  const { data: usersResponse, isLoading } = useQuery<{ data: UserItem[] } | UserItem[]>({
    queryKey: ['admin', 'users-list'],
    queryFn: () => apiClient.get('/users').then((r) => r.data),
  });

  const users: UserItem[] = Array.isArray(usersResponse)
    ? usersResponse
    : (usersResponse?.data ?? []);

  const eligible = users.filter((u) => u.role !== 'SUPERADMIN');

  const { mutate, isPending } = useMutation({
    mutationFn: (userId: string): Promise<ImpersonateResult> =>
      apiClient.post<ImpersonateResult>(`/admin/impersonate/${userId}`).then((r) => r.data),
    onSuccess: (data) => {
      setToken(data.accessToken);
      toast.success(`Impersonando ${data.impersonatedUser.name}`);
    },
    onError: () => toast.error('Erro ao impersonar usuário'),
  });

  const copyToken = () => {
    if (!token) return;
    navigator.clipboard.writeText(token);
    toast.info('Token copiado');
  };

  return (
    <div className="p-6 max-w-xl mx-auto">
      <h1 className="text-xl font-semibold text-gray-900 mb-2">Impersonar Usuário</h1>
      <p className="text-sm text-gray-500 mb-6">
        Gera um JWT de 1 hora no contexto do usuário selecionado. A ação é registrada em auditoria.
      </p>

      <Card className="p-6 space-y-4">
        <div>
          <label className="block text-sm font-medium mb-1">Selecione o usuário</label>
          {isLoading ? (
            <p className="text-sm text-gray-400">Carregando…</p>
          ) : (
            <select
              className="w-full border rounded-md px-3 py-2 text-sm bg-white"
              value={selected}
              onChange={(e) => {
                setSelected(e.target.value);
                setToken(null);
              }}
            >
              <option value="">— escolha um usuário —</option>
              {eligible.map((u) => (
                <option key={u.id} value={u.id}>
                  {u.name} ({USER_ROLE_LABELS[u.role]}) — {u.email}
                </option>
              ))}
            </select>
          )}
        </div>

        <Button
          onClick={() => selected && mutate(selected)}
          disabled={!selected || isPending}
          variant="destructive"
        >
          <UserCog size={16} className="mr-2" />
          {isPending ? 'Gerando token…' : 'Impersonar'}
        </Button>

        {token && (
          <div className="mt-2 p-3 bg-gray-900 rounded-lg">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs text-gray-400">Access Token (expira em 1h)</span>
              <button
                onClick={copyToken}
                className="text-gray-400 hover:text-white transition-colors"
              >
                <Copy size={14} />
              </button>
            </div>
            <p className="text-xs text-green-400 font-mono break-all">{token}</p>
          </div>
        )}
      </Card>
    </div>
  );
}
