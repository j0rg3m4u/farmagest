'use client';
import Link from 'next/link';
import { useAuthStore } from '@/stores/auth-store';
import { USER_ROLE_LABELS, UserRole } from '@farmagest/shared';
import { useAlertSummary, useExpirationAlert } from '@/hooks/use-alerts';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { AlertTriangle, PackageX, TrendingDown, Clock, ArrowRightLeft } from 'lucide-react';

function StatCard({
  label,
  value,
  icon: Icon,
  color,
  href,
}: {
  label: string;
  value: number | string;
  icon: React.ElementType;
  color: string;
  href?: string;
}) {
  const card = (
    <div className={`bg-white rounded-lg border p-5 flex gap-4 items-center ${href ? 'hover:shadow-md transition-shadow cursor-pointer' : ''}`}>
      <div className={`rounded-full p-3 ${color}`}>
        <Icon size={20} />
      </div>
      <div>
        <div className="text-2xl font-bold text-slate-800">{value}</div>
        <div className="text-xs text-slate-500 mt-0.5">{label}</div>
      </div>
    </div>
  );
  return href ? <Link href={href}>{card}</Link> : card;
}

export default function PainelPage() {
  const user = useAuthStore((s) => s.user);
  const { data: summary, isLoading } = useAlertSummary();
  const { data: expiring30 } = useExpirationAlert(30);

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-slate-900">
          Bem-vindo{user?.name?.split(' ')[0] ? `, ${user.name.split(' ')[0]}` : ''}!
        </h1>
        <p className="text-slate-500 text-sm">
          {user?.role && USER_ROLE_LABELS[user.role as UserRole]}
        </p>
      </div>

      {/* Cards de indicadores */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          label="Itens sem estoque"
          value={isLoading ? '…' : (summary?.zeroBalance.count ?? 0)}
          icon={PackageX}
          color="bg-red-50 text-red-600"
          href="/alerts/critical"
        />
        <StatCard
          label="Lotes vencendo em 30 dias"
          value={isLoading ? '…' : (summary?.expiringIn30.count ?? 0)}
          icon={AlertTriangle}
          color="bg-amber-50 text-amber-600"
          href="/alerts/expiration"
        />
        <StatCard
          label="Lotes vencendo em 31–90 dias"
          value={isLoading ? '…' : ((summary?.expiringIn31to60.count ?? 0) + (summary?.expiringIn61to90.count ?? 0))}
          icon={Clock}
          color="bg-yellow-50 text-yellow-600"
        />
        <StatCard
          label="Movimentações este mês"
          value={isLoading ? '…' : (summary?.movementsThisMonth ?? 0)}
          icon={TrendingDown}
          color="bg-blue-50 text-blue-600"
          href="/movimentacoes"
        />
      </div>

      {/* Atalhos */}
      <div className="flex gap-3">
        <Link href="/movimentacoes/saida">
          <Button size="sm" className="gap-1.5 bg-pmdc-blue hover:bg-pmdc-blue-dark text-white">
            <ArrowRightLeft size={14} /> Nova saída
          </Button>
        </Link>
        <Link href="/itens">
          <Button size="sm" variant="outline" className="gap-1.5">
            Ver itens
          </Button>
        </Link>
      </div>

      {/* Lotes vencendo em 30 dias */}
      {expiring30 && expiring30.total > 0 && (
        <div className="bg-white rounded-lg border overflow-hidden">
          <div className="px-6 py-4 border-b flex items-center gap-2">
            <AlertTriangle size={16} className="text-amber-500" />
            <h2 className="text-sm font-semibold text-slate-700">
              Lotes vencendo em 30 dias
              <span className="ml-2 text-slate-400 font-normal">({expiring30.total})</span>
            </h2>
          </div>
          <Table>
            <TableHeader>
              <TableRow className="bg-slate-50">
                <TableHead>Item</TableHead>
                <TableHead>Lote</TableHead>
                <TableHead>Validade</TableHead>
                <TableHead className="text-right">Saldo</TableHead>
                <TableHead>Setor</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {expiring30.lots.slice(0, 10).map((lot) => {
                const daysLeft = Math.ceil(
                  (new Date(lot.expirationDate).getTime() - Date.now()) / 86400000
                );
                return (
                  <TableRow key={lot.id}>
                    <TableCell>
                      <div className="text-sm font-medium">{lot.item.description}</div>
                      <div className="text-xs font-mono text-slate-400">{lot.item.code}</div>
                    </TableCell>
                    <TableCell className="font-mono text-xs">{lot.lotNumber}</TableCell>
                    <TableCell>
                      <Badge
                        className={
                          daysLeft < 0
                            ? 'bg-red-100 text-red-700 border-0 text-xs'
                            : daysLeft <= 30
                            ? 'bg-amber-100 text-amber-700 border-0 text-xs'
                            : 'bg-slate-100 text-slate-600 border-0 text-xs'
                        }
                      >
                        {daysLeft < 0 ? 'Vencido' : `${daysLeft}d`}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right font-medium">{lot.currentBalance}</TableCell>
                    <TableCell className="text-xs text-slate-500">{lot.item.sector?.name}</TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
          {expiring30.total > 10 && (
            <div className="px-6 py-3 border-t text-xs text-slate-400">
              +{expiring30.total - 10} outros lotes — veja o relatório completo
            </div>
          )}
        </div>
      )}

      {/* Estado vazio */}
      {!isLoading && summary?.zeroBalance.count === 0 && summary?.expiringIn30.count === 0 && (
        <div className="bg-green-50 border border-green-200 rounded-lg p-6 text-center text-green-700 text-sm">
          Estoque saudável — sem alertas críticos no momento.
        </div>
      )}
    </div>
  );
}
