import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../common/prisma/prisma.service';
import type { JwtPayload } from '@farmagest/shared';
import { isGlobalRole } from '../../../common/utils/auth.utils';

const fmtNum = (n: number) => n.toLocaleString('pt-BR', { maximumFractionDigits: 3 });
const fmtR$ = (n: number) => n.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

function situationLabel(balance: number, avgConsumption30: number): string {
  if (balance === 0) return 'Zerado';
  if (avgConsumption30 > 0 && balance < avgConsumption30) return 'Crítico';
  if (avgConsumption30 > 0 && balance > avgConsumption30 * 3) return 'Excesso';
  return 'Normal';
}

@Injectable()
export class StockPositionReportService {
  constructor(private prisma: PrismaService) {}

  async getData(user: JwtPayload, sectorId?: string) {
    const scopedSectorId = !isGlobalRole(user) ? (user.sectorId ?? undefined) : (sectorId ?? undefined);

    const items = await this.prisma.item.findMany({
      where: {
        ...(scopedSectorId ? { sectorId: scopedSectorId } : {}),
        active: true,
        deletedAt: null,
      },
      include: {
        lots: {
          where: { active: true, deletedAt: null },
          select: {
            lotNumber: true,
            expirationDate: true,
            currentBalance: true,
            unitCost: true,
          },
          orderBy: { expirationDate: 'asc' },
        },
      },
      orderBy: { code: 'asc' },
    });

    // Consumo médio dos últimos 30 dias por item
    const thirtyDaysAgo = new Date(Date.now() - 30 * 864e5);
    const consumoAgrupado = await this.prisma.movement.groupBy({
      by: ['itemId'],
      where: {
        createdAt: { gte: thirtyDaysAgo },
        type: { in: ['EXIT_SUPPLY', 'EXIT_DISPOSAL', 'EXIT_EXCHANGE', 'EXIT_ADJUSTMENT'] },
        ...(scopedSectorId ? { sectorId: scopedSectorId } : {}),
      },
      _sum: { quantity: true },
    });
    const consumoMap = new Map(consumoAgrupado.map((c) => [c.itemId, Number(c._sum.quantity ?? 0)]));

    let semValor = 0;
    let totalValorEstoque = 0;

    const rows = items.map((item) => {
      const activeLots = item.lots.filter((l) => Number(l.currentBalance) > 0);
      const totalBalance = activeLots.reduce((s, l) => s + Number(l.currentBalance), 0);
      const unitVal = Number(item.unitValue ?? 0);
      const valorEstoque = totalBalance * unitVal;
      const avgConsumption30 = consumoMap.get(item.id) ?? 0;
      const proxVenc = activeLots[0]?.expirationDate;
      const situacao = situationLabel(totalBalance, avgConsumption30);

      if (unitVal === 0 && totalBalance > 0) semValor++;
      totalValorEstoque += valorEstoque;

      return {
        Código: item.code,
        Item: item.description,
        Situação: situacao,
        'Lotes ativos': activeLots.length,
        'Saldo total': fmtNum(totalBalance),
        'Próx. vencimento': proxVenc ? new Date(proxVenc).toLocaleDateString('pt-BR') : '—',
        'Valor em estoque (R$)': valorEstoque > 0 ? fmtR$(valorEstoque) : '—',
        _balance: totalBalance,
        _situacao: situacao,
      };
    });

    // Contagem por situação
    const counts = rows.reduce<Record<string, number>>(
      (acc, r) => { acc[r._situacao] = (acc[r._situacao] ?? 0) + 1; return acc; },
      {},
    );

    return {
      rows,
      chart: Object.entries(counts).map(([name, value]) => ({ name, value })),
      meta: {
        totalItems: items.length,
        zerados: counts['Zerado'] ?? 0,
        criticos: counts['Crítico'] ?? 0,
        normais: counts['Normal'] ?? 0,
        excesso: counts['Excesso'] ?? 0,
        totalValorEstoque,
        semValor,
      },
    };
  }
}
