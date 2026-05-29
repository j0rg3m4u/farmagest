'use client';
import Link from 'next/link';
import { useAuthStore } from '@/stores/auth-store';
import { PageHeader } from '@/components/shared/PageHeader';
import {
  Activity, TrendingDown, Clock, ArrowLeftRight,
  FileText, Package, LayoutDashboard, ShieldCheck,
  TrendingUp, BarChart2,
} from 'lucide-react';

interface ReportCard {
  href: string;
  icon: React.ReactNode;
  title: string;
  description: string;
  badge?: string;
  managerOnly?: boolean;
}

const REPORTS: ReportCard[] = [
  {
    href: '/relatorios/movimentacoes',
    icon: <Activity className="h-5 w-5" />,
    title: 'R01 — Movimentações',
    description: 'Entradas e saídas do estoque no período, com item, lote e responsável.',
  },
  {
    href: '/relatorios/consumo-item',
    icon: <TrendingDown className="h-5 w-5" />,
    title: 'R02 — Consumo por Item',
    description: 'Top itens mais consumidos com consumo médio diário e valor total.',
  },
  {
    href: '/relatorios/consumo-unidade',
    icon: <BarChart2 className="h-5 w-5" />,
    title: 'R03 — Consumo por Unidade',
    description: 'Volume de abastecimento por unidade de saúde no período.',
  },
  {
    href: '/relatorios/perdas',
    icon: <TrendingDown className="h-5 w-5" />,
    title: 'R04 — Perdas e Descartes',
    description: 'Itens descartados por validade com valor financeiro em risco.',
    badge: 'Gerencial',
  },
  {
    href: '/relatorios/vencimentos',
    icon: <Clock className="h-5 w-5" />,
    title: 'R05 — Validades a Expirar',
    description: 'Lotes com vencimento nos próximos 30, 60 ou 90 dias.',
    badge: 'Gerencial',
  },
  {
    href: '/relatorios/trocas',
    icon: <ArrowLeftRight className="h-5 w-5" />,
    title: 'R06 — Trocas Intermunicipais',
    description: 'Trocas executadas com valores enviados, recebidos e saldo.',
    badge: 'Gerencial',
  },
  {
    href: '/relatorios/geras',
    icon: <FileText className="h-5 w-5" />,
    title: 'R07 — Atendimento de GERAs',
    description: 'Taxa de atendimento de pedidos GERA por unidade e período.',
  },
  {
    href: '/relatorios/estoque',
    icon: <Package className="h-5 w-5" />,
    title: 'R08 — Posição de Estoque',
    description: 'Visão atual do estoque com situação, lotes e valor financeiro.',
  },
  {
    href: '/relatorios/executivo',
    icon: <LayoutDashboard className="h-5 w-5" />,
    title: 'R09 — Painel Executivo',
    description: 'KPIs consolidados de todos os setores para a gestão.',
    badge: 'Gerencial',
    managerOnly: true,
  },
  {
    href: '/relatorios/auditoria',
    icon: <ShieldCheck className="h-5 w-5" />,
    title: 'R10 — Trilha de Auditoria',
    description: 'Log completo de ações do sistema para prestação de contas.',
    badge: 'Auditoria',
    managerOnly: true,
  },
];

export default function RelatoriosPage() {
  const user = useAuthStore((s) => s.user);
  const isManager = user?.role === 'MANAGER';

  const visibleReports = REPORTS.filter((r) => !r.managerOnly || isManager);

  return (
    <div>
      <PageHeader
        title="Relatórios"
        description="Inteligência de gestão para tomada de decisão, prestação de contas e controle operacional."
      />

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {visibleReports.map((r) => (
          <Link
            key={r.href}
            href={r.href}
            className="group flex flex-col gap-3 p-4 bg-white border border-slate-200 rounded-xl hover:border-blue-300 hover:shadow-sm transition-all"
          >
            <div className="flex items-start justify-between">
              <div className="p-2 bg-blue-50 text-blue-600 rounded-lg group-hover:bg-blue-100 transition-colors">
                {r.icon}
              </div>
              {r.badge && (
                <span className="text-[10px] font-medium px-2 py-0.5 bg-slate-100 text-slate-500 rounded-full">
                  {r.badge}
                </span>
              )}
            </div>
            <div>
              <h3 className="text-sm font-semibold text-slate-800 group-hover:text-blue-700 transition-colors">
                {r.title}
              </h3>
              <p className="text-xs text-slate-500 mt-0.5 leading-relaxed">{r.description}</p>
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}
