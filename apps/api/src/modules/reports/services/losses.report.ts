import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../common/prisma/prisma.service';
import { resolvePeriod, type ReportFilters } from '@farmagest/shared';
import type { JwtPayload } from '@farmagest/shared';
import { isGlobalRole } from '../../../common/utils/auth.utils';

const fmtNum = (n: number) => n.toLocaleString('pt-BR', { maximumFractionDigits: 3 });
const fmtR$ = (n: number) => n.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
const fmtDate = (d: Date | string) => new Date(d).toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short' });

@Injectable()
export class LossesReportService {
  constructor(private prisma: PrismaService) {}

  async getData(filters: ReportFilters, user: JwtPayload) {
    const { from, to } = resolvePeriod(filters);
    const sectorId = !isGlobalRole(user) ? (user.sectorId ?? undefined) : (filters.sectorId ?? undefined);

    const losses = await this.prisma.movement.findMany({
      where: {
        createdAt: { gte: from, lte: to },
        type: 'EXIT_DISPOSAL',
        ...(sectorId ? { sectorId } : {}),
      },
      include: {
        item: { select: { code: true, description: true, unitValue: true } },
        lot: { select: { lotNumber: true, expirationDate: true } },
        createdBy: { select: { name: true } },
      },
      orderBy: { createdAt: 'desc' },
    });

    let totalQty = 0;
    let totalValor = 0;

    const rows = losses.map((m) => {
      const qty = Number(m.quantity);
      const unitVal = Number(m.unitValue ?? m.item.unitValue ?? 0);
      const perdaTotal = qty * unitVal;
      totalQty += qty;
      totalValor += perdaTotal;
      return {
        Data: fmtDate(m.createdAt),
        Código: m.item.code,
        Item: m.item.description,
        Lote: m.lot.lotNumber,
        Validade: new Date(m.lot.expirationDate).toLocaleDateString('pt-BR'),
        'Qtd descartada': fmtNum(qty),
        'Valor unitário': unitVal > 0 ? fmtR$(unitVal) : '—',
        'Perda total (R$)': perdaTotal > 0 ? fmtR$(perdaTotal) : '—',
        Responsável: m.createdBy.name,
        _month: new Date(m.createdAt).toLocaleDateString('pt-BR', { month: 'short', year: 'numeric' }),
        _perdaTotal: perdaTotal,
      };
    });

    // Gráfico: perdas por mês
    const byMonth: Record<string, number> = {};
    for (const r of rows) {
      byMonth[r._month] = (byMonth[r._month] ?? 0) + r._perdaTotal;
    }
    const chart = Object.entries(byMonth).map(([month, value]) => ({ month, value }));

    return {
      rows,
      totals: {
        Data: 'TOTAL',
        Código: '',
        Item: `${losses.length} descartes`,
        Lote: '',
        Validade: '',
        'Qtd descartada': fmtNum(totalQty),
        'Valor unitário': '',
        'Perda total (R$)': fmtR$(totalValor),
        Responsável: '',
      },
      chart,
      meta: { from, to, totalLosses: losses.length, totalQty, totalValor },
    };
  }
}
