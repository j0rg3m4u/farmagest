import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../common/prisma/prisma.service';
import { resolvePeriod, type ReportFilters } from '@farmagest/shared';
import type { JwtPayload } from '@farmagest/shared';

const fmtNum = (n: number) => n.toLocaleString('pt-BR', { maximumFractionDigits: 3 });
const fmtR$ = (n: number) => n.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

const EXIT_TYPES = ['EXIT_SUPPLY', 'EXIT_DISPOSAL', 'EXIT_ADJUSTMENT', 'EXIT_EXCHANGE'] as const;

@Injectable()
export class ConsumptionReportService {
  constructor(private prisma: PrismaService) {}

  async getByItem(filters: ReportFilters, user: JwtPayload) {
    const { from, to } = resolvePeriod(filters);
    const days = Math.max(1, Math.round((to.getTime() - from.getTime()) / 864e5));
    const sectorId = user.role !== 'MANAGER' ? (user.sectorId ?? undefined) : (filters.sectorId ?? undefined);

    const grouped = await this.prisma.movement.groupBy({
      by: ['itemId'],
      where: {
        createdAt: { gte: from, lte: to },
        type: { in: EXIT_TYPES as unknown as any[] },
        ...(sectorId ? { sectorId } : {}),
      },
      _sum: { quantity: true },
      orderBy: { _sum: { quantity: 'desc' } },
      take: 200,
    });

    const itemIds = grouped.map((g) => g.itemId);
    const items = await this.prisma.item.findMany({
      where: { id: { in: itemIds } },
      select: { id: true, code: true, description: true, unitValue: true },
    });
    const itemMap = new Map(items.map((i) => [i.id, i]));

    const totalQty = grouped.reduce((s, g) => s + Number(g._sum.quantity ?? 0), 0);

    const rows = grouped.map((g, idx) => {
      const qty = Number(g._sum.quantity ?? 0);
      const item = itemMap.get(g.itemId);
      const valor = item?.unitValue ? qty * Number(item.unitValue) : 0;
      const pct = totalQty > 0 ? ((qty / totalQty) * 100).toFixed(1) : '0.0';
      return {
        '#': idx + 1,
        Código: item?.code ?? g.itemId,
        Item: item?.description ?? '—',
        'Total consumido': fmtNum(qty),
        'Consumo médio/dia': fmtNum(qty / days),
        'Valor total (R$)': valor > 0 ? fmtR$(valor) : '—',
        '% do total': `${pct}%`,
        // campos numéricos para gráfico
        _qty: qty,
        _valor: valor,
        _desc: item?.description ?? '—',
      };
    });

    const totalValor = rows.reduce((s, r) => s + r._valor, 0);

    return {
      rows,
      totals: {
        '#': '',
        Código: 'TOTAL',
        Item: `${grouped.length} itens`,
        'Total consumido': fmtNum(totalQty),
        'Consumo médio/dia': fmtNum(totalQty / days),
        'Valor total (R$)': fmtR$(totalValor),
        '% do total': '100%',
      },
      chart: rows.slice(0, 20).map((r) => ({ name: r._desc.slice(0, 30), qty: r._qty })),
      meta: { from, to, totalItems: grouped.length, totalQty, totalValor },
    };
  }

  async getByUnit(filters: ReportFilters, user: JwtPayload) {
    const { from, to } = resolvePeriod(filters);
    const sectorId = user.role !== 'MANAGER' ? (user.sectorId ?? undefined) : (filters.sectorId ?? undefined);

    const grouped = await this.prisma.movement.groupBy({
      by: ['unitId'],
      where: {
        createdAt: { gte: from, lte: to },
        type: 'EXIT_SUPPLY',
        unitId: { not: null },
        ...(sectorId ? { sectorId } : {}),
      },
      _sum: { quantity: true },
      orderBy: { _sum: { quantity: 'desc' } },
      take: 200,
    });

    const unitIds = grouped.map((g) => g.unitId!).filter(Boolean);
    const units = await this.prisma.unit.findMany({
      where: { id: { in: unitIds } },
      select: { id: true, name: true, type: true },
    });
    const unitMap = new Map(units.map((u) => [u.id, u]));

    // Itens distintos por unidade
    const distinctItems = await this.prisma.movement.groupBy({
      by: ['unitId', 'itemId'],
      where: {
        createdAt: { gte: from, lte: to },
        type: 'EXIT_SUPPLY',
        unitId: { in: unitIds },
        ...(sectorId ? { sectorId } : {}),
      },
    });
    const itemCountByUnit = new Map<string, number>();
    for (const d of distinctItems) {
      if (d.unitId) itemCountByUnit.set(d.unitId, (itemCountByUnit.get(d.unitId) ?? 0) + 1);
    }

    const rows = grouped.map((g) => {
      const qty = Number(g._sum.quantity ?? 0);
      const unit = unitMap.get(g.unitId!);
      return {
        Unidade: unit?.name ?? g.unitId ?? '—',
        Tipo: unit?.type ?? '—',
        'Itens distintos': itemCountByUnit.get(g.unitId!) ?? 0,
        'Total consumido': fmtNum(qty),
        _qty: qty,
        _name: unit?.name ?? '—',
      };
    });

    return {
      rows,
      chart: rows.slice(0, 20).map((r) => ({ name: r._name.slice(0, 25), qty: r._qty })),
      meta: { from, to, totalUnits: grouped.length },
    };
  }
}
