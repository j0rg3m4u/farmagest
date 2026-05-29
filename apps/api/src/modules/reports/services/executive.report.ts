import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../common/prisma/prisma.service';
import { resolvePeriod, type ReportFilters } from '@farmagest/shared';

const fmtR$ = (n: number) => n.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

const ENTRY_TYPES = ['ENTRY_PURCHASE', 'ENTRY_EXCHANGE', 'ENTRY_ADJUSTMENT', 'ENTRY_RETURN'] as const;
const EXIT_TYPES = ['EXIT_SUPPLY', 'EXIT_DISPOSAL', 'EXIT_EXCHANGE', 'EXIT_ADJUSTMENT'] as const;

function sumMovementValue(movements: Array<{ quantity: { toNumber(): number }; unitValue: { toNumber(): number } | null }>) {
  return movements.reduce((s, m) => s + m.quantity.toNumber() * (m.unitValue?.toNumber() ?? 0), 0);
}

@Injectable()
export class ExecutiveReportService {
  constructor(private prisma: PrismaService) {}

  async getData(filters: ReportFilters) {
    const { from, to } = resolvePeriod(filters);

    const [
      entradaMoves,
      saidaMoves,
      perdaMoves,
      trocasResult,
      sectors,
      expiringLots,
      geraItems,
      topConsumption,
      topUnits,
    ] = await Promise.all([
      // Total entradas no período
      this.prisma.movement.findMany({
        where: { createdAt: { gte: from, lte: to }, type: { in: ENTRY_TYPES as unknown as any[] } },
        select: { quantity: true, unitValue: true },
      }),

      // Total saídas no período
      this.prisma.movement.findMany({
        where: { createdAt: { gte: from, lte: to }, type: { in: EXIT_TYPES as unknown as any[] } },
        select: { quantity: true, unitValue: true },
      }),

      // Perdas (descartes)
      this.prisma.movement.findMany({
        where: { createdAt: { gte: from, lte: to }, type: 'EXIT_DISPOSAL' },
        select: { quantity: true, unitValue: true },
      }),

      // Trocas executadas
      this.prisma.exchange.findMany({
        where: {
          date: { gte: from, lte: to },
          status: { in: ['EXECUTED', 'COMPLETED'] },
          deletedAt: null,
        },
        include: { outputs: { select: { subtotal: true } } },
      }),

      // Setores com itens e lotes para estoque crítico
      this.prisma.sector.findMany({
        where: { active: true, deletedAt: null },
        include: {
          items: {
            where: { active: true, deletedAt: null },
            include: {
              lots: { where: { active: true, deletedAt: null }, select: { currentBalance: true } },
            },
          },
        },
      }),

      // Validades em risco (próximos 90 dias)
      this.prisma.lot.findMany({
        where: {
          active: true,
          deletedAt: null,
          currentBalance: { gt: 0 },
          expirationDate: { lte: new Date(Date.now() + 90 * 864e5), gte: new Date() },
          item: { active: true, deletedAt: null },
        },
        include: { item: { select: { unitValue: true } } },
      }),

      // GERA items no período
      this.prisma.geraItem.findMany({
        where: {
          gera: {
            requestedAt: { gte: from, lte: to },
            status: { in: ['COMPLETED', 'DISPATCHED'] },
            deletedAt: null,
          },
        },
        select: { status: true, requested: true, approved: true },
      }),

      // Top 5 itens mais consumidos
      this.prisma.movement.groupBy({
        by: ['itemId'],
        where: {
          createdAt: { gte: from, lte: to },
          type: { in: EXIT_TYPES as unknown as any[] },
        },
        _sum: { quantity: true },
        orderBy: { _sum: { quantity: 'desc' } },
        take: 5,
      }),

      // Top 5 unidades por GERAs
      this.prisma.gera.groupBy({
        by: ['unitId'],
        where: {
          requestedAt: { gte: from, lte: to },
          status: { in: ['COMPLETED', 'DISPATCHED'] },
          deletedAt: null,
        },
        _count: { id: true },
        orderBy: { _count: { id: 'desc' } },
        take: 5,
      }),
    ]);

    // KPIs
    const totalEntradas = sumMovementValue(entradaMoves);
    const totalSaidas = sumMovementValue(saidaMoves);
    const totalPerdas = sumMovementValue(perdaMoves);
    const totalTrocas = trocasResult.reduce(
      (s, ex) => s + ex.outputs.reduce((ss, o) => ss + Number(o.subtotal), 0),
      0,
    );

    // Estoque crítico por setor
    const thirtyDaysAgo = new Date(Date.now() - 30 * 864e5);
    const consumoAgrupado = await this.prisma.movement.groupBy({
      by: ['itemId'],
      where: {
        createdAt: { gte: thirtyDaysAgo },
        type: { in: EXIT_TYPES as unknown as any[] },
      },
      _sum: { quantity: true },
    });
    const consumoMap = new Map(consumoAgrupado.map((c) => [c.itemId, Number(c._sum.quantity ?? 0)]));

    const sectorCritical = sectors.map((s) => {
      let zerados = 0;
      let criticos = 0;
      for (const item of s.items) {
        const balance = item.lots.reduce((acc, l) => acc + Number(l.currentBalance), 0);
        const avg = consumoMap.get(item.id) ?? 0;
        if (balance === 0) zerados++;
        else if (avg > 0 && balance < avg) criticos++;
      }
      return { setor: s.name, zerados, criticos, total: s.items.length };
    });

    // Validades em risco por faixa
    let risco30 = 0;
    let risco60 = 0;
    let risco90 = 0;
    for (const lot of expiringLots) {
      const daysLeft = Math.round((new Date(lot.expirationDate).getTime() - Date.now()) / 864e5);
      const val = Number(lot.currentBalance) * Number(lot.item.unitValue ?? 0);
      if (daysLeft <= 30) risco30 += val;
      else if (daysLeft <= 60) risco60 += val;
      else risco90 += val;
    }

    // Taxa de atendimento GERAs
    const geraTotal = geraItems.length;
    const geraAtendidos = geraItems.filter((i) => i.status === 'APPROVED' && Number(i.approved) >= Number(i.requested)).length;
    const geraParciais = geraItems.filter((i) => i.status === 'APPROVED' && Number(i.approved) < Number(i.requested)).length;
    const geraNegados = geraItems.filter((i) => i.status === 'DENIED').length;
    const taxaAtendimento = geraTotal > 0 ? ((geraAtendidos + geraParciais * 0.5) / geraTotal) * 100 : 0;

    // Top 5 itens — buscar nomes
    const topItemIds = topConsumption.map((c) => c.itemId);
    const topItemDetails = await this.prisma.item.findMany({
      where: { id: { in: topItemIds } },
      select: { id: true, code: true, description: true },
    });
    const itemMap = new Map(topItemDetails.map((i) => [i.id, i]));
    const topItems = topConsumption.map((c) => ({
      item: itemMap.get(c.itemId)?.description ?? c.itemId,
      codigo: itemMap.get(c.itemId)?.code ?? '—',
      quantidade: Number(c._sum.quantity ?? 0),
    }));

    // Top 5 unidades — buscar nomes
    const topUnitIds = topUnits.map((u) => u.unitId);
    const topUnitDetails = await this.prisma.unit.findMany({
      where: { id: { in: topUnitIds } },
      select: { id: true, name: true },
    });
    const unitMap = new Map(topUnitDetails.map((u) => [u.id, u]));
    const topUnitsFormatted = topUnits.map((u) => ({
      unidade: unitMap.get(u.unitId)?.name ?? u.unitId,
      geras: u._count.id,
    }));

    // Evolução do estoque ao longo do período (por semana)
    const allMovements = await this.prisma.movement.findMany({
      where: { createdAt: { gte: from, lte: to } },
      select: { createdAt: true, type: true, quantity: true, unitValue: true },
      orderBy: { createdAt: 'asc' },
    });

    const weeklyBalance: Record<string, number> = {};
    for (const m of allMovements) {
      const week = new Date(m.createdAt);
      week.setDate(week.getDate() - week.getDay());
      const key = week.toLocaleDateString('pt-BR');
      weeklyBalance[key] ??= 0;
      const val = Number(m.quantity) * Number(m.unitValue ?? 0);
      const isEntry = (ENTRY_TYPES as readonly string[]).includes(m.type);
      weeklyBalance[key] += isEntry ? val : -val;
    }
    const stockEvolution = Object.entries(weeklyBalance).map(([week, delta]) => ({ week, delta }));

    return {
      kpis: {
        totalEntradas,
        totalSaidas,
        totalPerdas,
        totalTrocas,
        totalEntradasFmt: fmtR$(totalEntradas),
        totalSaidasFmt: fmtR$(totalSaidas),
        totalPerdasFmt: fmtR$(totalPerdas),
        totalTrocasFmt: fmtR$(totalTrocas),
      },
      sectorCritical,
      expirationRisk: {
        risco30,
        risco60,
        risco90,
        risco30Fmt: fmtR$(risco30),
        risco60Fmt: fmtR$(risco60),
        risco90Fmt: fmtR$(risco90),
      },
      geraAttendance: {
        total: geraTotal,
        atendidos: geraAtendidos,
        parciais: geraParciais,
        negados: geraNegados,
        taxaAtendimento: parseFloat(taxaAtendimento.toFixed(1)),
        chart: [
          { name: 'Integral', value: geraAtendidos },
          { name: 'Parcial', value: geraParciais },
          { name: 'Negado', value: geraNegados },
        ],
      },
      topItems,
      topUnits: topUnitsFormatted,
      stockEvolution,
      meta: { from, to },
    };
  }
}
