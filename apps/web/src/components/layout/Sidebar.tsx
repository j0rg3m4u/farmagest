'use client';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { UserRole } from '@farmagest/shared';
import { useAuthStore } from '@/stores/auth-store';
import { LayoutDashboard, Users, Building2, Package, ClipboardList, BarChart3, Layers, Upload, PencilLine, ArrowRightLeft, Globe, Repeat2, ShieldCheck } from 'lucide-react';

interface NavItem {
  href: string;
  label: string;
  icon: React.ElementType;
  roles: UserRole[];
  exact?: boolean;
}

const NAV_ITEMS: NavItem[] = [
  {
    href: '/painel',
    label: 'Painel',
    icon: LayoutDashboard,
    roles: [UserRole.COORDINATION, UserRole.MANAGER, UserRole.ADMIN, UserRole.ASSISTANT, UserRole.UNIT],
  },
  {
    href: '/unidades',
    label: 'Unidades',
    icon: Building2,
    exact: true,
    roles: [UserRole.COORDINATION, UserRole.MANAGER, UserRole.ADMIN],
  },
  {
    href: '/unidades/importar',
    label: 'Importar Unidades',
    icon: Upload,
    roles: [UserRole.COORDINATION, UserRole.MANAGER],
  },
  {
    href: '/usuarios',
    label: 'Usuários',
    icon: Users,
    roles: [UserRole.COORDINATION, UserRole.MANAGER],
  },
  {
    href: '/setores',
    label: 'Setores',
    icon: Layers,
    roles: [UserRole.COORDINATION, UserRole.MANAGER],
  },
  {
    href: '/itens',
    label: 'Itens',
    icon: Package,
    exact: true,
    roles: [UserRole.COORDINATION, UserRole.MANAGER, UserRole.ADMIN, UserRole.ASSISTANT],
  },
  {
    href: '/itens/importar',
    label: 'Importar Itens',
    icon: Upload,
    roles: [UserRole.COORDINATION, UserRole.ADMIN, UserRole.MANAGER],
  },
  {
    href: '/itens/editar-em-lote',
    label: 'Editar em Lote',
    icon: PencilLine,
    roles: [UserRole.COORDINATION, UserRole.ADMIN, UserRole.MANAGER],
  },
  {
    href: '/movimentacoes',
    label: 'Movimentações',
    icon: ArrowRightLeft,
    roles: [UserRole.COORDINATION, UserRole.MANAGER, UserRole.ADMIN],
  },
  {
    href: '/trocas',
    label: 'Trocas Inter-Municipais',
    icon: Repeat2,
    roles: [UserRole.COORDINATION, UserRole.MANAGER],
  },
  {
    href: '/parceiros',
    label: 'Municípios Parceiros',
    icon: Globe,
    roles: [UserRole.COORDINATION, UserRole.MANAGER],
  },
  {
    href: '/pedidos',
    label: 'Pedidos',
    icon: ClipboardList,
    roles: [UserRole.COORDINATION, UserRole.MANAGER, UserRole.ADMIN, UserRole.ASSISTANT, UserRole.UNIT],
  },
  {
    href: '/relatorios',
    label: 'Relatórios',
    icon: BarChart3,
    roles: [UserRole.COORDINATION, UserRole.MANAGER],
  },
  {
    href: '/auditoria',
    label: 'Auditoria',
    icon: ShieldCheck,
    roles: [UserRole.COORDINATION, UserRole.MANAGER],
  },
];

export function Sidebar() {
  const pathname = usePathname();
  const user = useAuthStore((s) => s.user);
  const role = user?.role as UserRole | undefined;

  const visible = NAV_ITEMS.filter((item) => role && item.roles.includes(role));

  return (
    <aside className="w-64 bg-pmdc-blue flex flex-col shrink-0 h-full">
      {/* Logo */}
      <div className="px-6 py-5 border-b border-pmdc-blue-light">
        <div className="text-pmdc-gold font-bold text-lg leading-tight">FarmaGest</div>
        <div className="text-pmdc-blue-soft text-xs mt-0.5 opacity-80">
          Gestão de Medicamentos e Correlatos
        </div>
      </div>

      {/* Nav */}
      <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
        {visible.map((item) => {
          const Icon = item.icon;
          const active = item.exact
            ? pathname === item.href
            : pathname === item.href || pathname.startsWith(item.href + '/');
          return (
            <Link
              key={item.href}
              href={item.href}
              className={[
                'flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors',
                active
                  ? 'bg-pmdc-blue-light text-white'
                  : 'text-pmdc-blue-soft hover:bg-pmdc-blue-light/60 hover:text-white',
              ].join(' ')}
            >
              <Icon size={18} />
              {item.label}
            </Link>
          );
        })}
      </nav>
    </aside>
  );
}
