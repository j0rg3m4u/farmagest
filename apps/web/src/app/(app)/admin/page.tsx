'use client';

import Link from 'next/link';
import { Settings, RefreshCcw, UserCog, Trash2, Database, ScrollText } from 'lucide-react';
import { Card } from '@/components/ui/card';

const CARDS = [
  {
    href: '/admin/settings',
    icon: Settings,
    label: 'Configurações',
    desc: 'Aprovação de trocas, tolerância e limites globais',
    color: 'text-blue-400',
  },
  {
    href: '/admin/recalculate',
    icon: RefreshCcw,
    label: 'Recalcular Saldos',
    desc: 'Recalcula currentBalance de todos os lotes a partir do histórico',
    color: 'text-green-400',
  },
  {
    href: '/admin/impersonate',
    icon: UserCog,
    label: 'Impersonar Usuário',
    desc: 'Gera token temporário para acessar o sistema como outro usuário',
    color: 'text-yellow-400',
  },
  {
    href: '/admin/cleanup',
    icon: Trash2,
    label: 'Limpeza de Dados',
    desc: 'Remove movimentações, GERAs ou itens (apenas em dev/staging)',
    color: 'text-red-400',
  },
  {
    href: '/admin/database',
    icon: Database,
    label: 'Status do Banco',
    desc: 'Contagem de registros, uptime e versão do Node',
    color: 'text-purple-400',
  },
  {
    href: '/admin/logs',
    icon: ScrollText,
    label: 'Logs de Auditoria',
    desc: 'Histórico de ações registradas no sistema',
    color: 'text-gray-400',
  },
] as const;

export default function AdminIndexPage() {
  return (
    <div className="p-6 max-w-4xl mx-auto">
      <h1 className="text-2xl font-bold text-gray-900 mb-1">Administração do Sistema</h1>
      <p className="text-sm text-gray-500 mb-6">
        Ferramentas exclusivas para operadores NodeLab. Alterações aqui afetam todos os setores e
        usuários.
      </p>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {CARDS.map((card) => {
          const Icon = card.icon;
          return (
            <Link key={card.href} href={card.href}>
              <Card className="p-5 hover:shadow-md transition-shadow cursor-pointer h-full border-gray-200 hover:border-red-300">
                <Icon size={24} className={`mb-3 ${card.color}`} />
                <h2 className="font-semibold text-gray-900 mb-1">{card.label}</h2>
                <p className="text-xs text-gray-500 leading-relaxed">{card.desc}</p>
              </Card>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
