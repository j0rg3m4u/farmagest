import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../common/prisma/prisma.service';
import { resolvePeriod, type ReportFilters } from '@farmagest/shared';
import type { JwtPayload } from '@farmagest/shared';
import { isGlobalRole } from '../../../common/utils/auth.utils';
import { MovementType } from '@farmagest/shared';

const TYPE_LABELS: Record<string, string> = {
  ENTRY_PURCHASE: 'Entrada — Compra',
  ENTRY_EXCHANGE: 'Entrada — Troca',
  ENTRY_ADJUSTMENT: 'Entrada — Ajuste',
  ENTRY_RETURN: 'Entrada — Devolução',
  EXIT_SUPPLY: 'Saída — Abastecimento',
  EXIT_EXCHANGE: 'Saída — Troca',
  EXIT_ADJUSTMENT: 'Saída — Ajuste',
  EXIT_DISPOSAL: 'Saída — Descarte',
};

const fmtDate = (d: Date) => new Date(d).toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short' });
const fmtNum = (n: number) => n.toLocaleString('pt-BR', { maximumFractionDigits: 3 });
const fmtR$ = (n: number) => n.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

@Injectable()
export class MovementsReportService {
  constructor(private prisma: PrismaService) {}

  async getData(filters: ReportFilters, user: JwtPayload) {
    const { from, to } = resolvePeriod(filters);
    const sectorId = !isGlobalRole(user) ? (user.sectorId ?? undefined) : (filters.sectorId ?? undefined);

    const movements = await this.prisma.movement.findMany({
      where: {
        createdAt: { gte: from, lte: to },
        ...(sectorId ? { sectorId } : {}),
        ...(filters.itemId ? { itemId: filters.itemId } : {}),
        ...(filters.unitId ? { unitId: filters.unitId } : {}),
      },
      include: {
        item: { select: { code: true, description: true } },
        lot: { select: { lotNumber: true, expirationDate: true } },
        unit: { select: { name: true } },
        createdBy: { select: { name: true } },
      },
      orderBy: { createdAt: 'desc' },
      take: 2000,
    });

    const rows = movements.map((m) => ({
      'Data/Hora': fmtDate(m.createdAt),
      Tipo: TYPE_LABELS[m.type] ?? m.type,
      Código: m.item.code,
      Item: m.item.description,
      Lote: m.lot.lotNumber,
      Validade: new Date(m.lot.expirationDate).toLocaleDateString('pt-BR'),
      Quantidade: fmtNum(Number(m.quantity)),
      Unidade: m.unit?.name ?? '—',
      Responsável: m.createdBy.name,
    }));

    const totalEntradas = movements
      .filter((m) => m.type.startsWith('ENTRY'))
      .reduce((s, m) => s + Number(m.quantity), 0);
    const totalSaidas = movements
      .filter((m) => m.type.startsWith('EXIT'))
      .reduce((s, m) => s + Number(m.quantity), 0);

    // Dados para gráfico: volume por dia
    const byDay: Record<string, { entries: number; exits: number }> = {};
    for (const m of movements) {
      const day = new Date(m.createdAt).toLocaleDateString('pt-BR');
      byDay[day] ??= { entries: 0, exits: 0 };
      if (m.type.startsWith('ENTRY')) byDay[day].entries += Number(m.quantity);
      else byDay[day].exits += Number(m.quantity);
    }
    const chart = Object.entries(byDay)
      .map(([date, v]) => ({ date, ...v }))
      .sort((a, b) => new Date(a.date.split('/').reverse().join('-')).getTime() - new Date(b.date.split('/').reverse().join('-')).getTime());

    return {
      rows,
      totals: {
        'Data/Hora': 'TOTAIS',
        Tipo: '',
        Código: '',
        Item: `${movements.length} registros`,
        Lote: '',
        Validade: '',
        Quantidade: `E: ${fmtNum(totalEntradas)} | S: ${fmtNum(totalSaidas)}`,
        Unidade: '',
        Responsável: '',
      },
      chart,
      meta: { from, to, totalMovements: movements.length, totalEntradas, totalSaidas },
    };
  }
}
