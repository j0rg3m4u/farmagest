import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../common/prisma/prisma.service';
import type { JwtPayload } from '@farmagest/shared';

const fmtNum = (n: number) => n.toLocaleString('pt-BR', { maximumFractionDigits: 3 });
const fmtR$ = (n: number) => n.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

function urgencyLabel(days: number): string {
  if (days <= 30) return 'Crítico (≤30 dias)';
  if (days <= 60) return 'Atenção (31–60 dias)';
  return 'Alerta (61–90 dias)';
}

@Injectable()
export class ExpirationReportService {
  constructor(private prisma: PrismaService) {}

  async getData(days: number = 30, user: JwtPayload, sectorId?: string) {
    const scopedSectorId = user.role !== 'MANAGER' ? (user.sectorId ?? undefined) : (sectorId ?? undefined);
    const maxDays = Math.min(90, Math.max(1, days));

    const lots = await this.prisma.lot.findMany({
      where: {
        active: true,
        deletedAt: null,
        currentBalance: { gt: 0 },
        expirationDate: {
          lte: new Date(Date.now() + maxDays * 864e5),
          gte: new Date(),
        },
        item: {
          ...(scopedSectorId ? { sectorId: scopedSectorId } : {}),
          active: true,
          deletedAt: null,
        },
      },
      include: {
        item: { select: { code: true, description: true, unitValue: true, sectorId: true } },
      },
      orderBy: { expirationDate: 'asc' },
    });

    let totalRisco = 0;
    let semValor = 0;

    const rows = lots.map((lot) => {
      const balance = Number(lot.currentBalance);
      const unitVal = Number(lot.item.unitValue ?? 0);
      const risco = balance * unitVal;
      const daysLeft = Math.round((new Date(lot.expirationDate).getTime() - Date.now()) / 864e5);
      if (unitVal === 0) semValor++;
      totalRisco += risco;
      return {
        Código: lot.item.code,
        Item: lot.item.description,
        Lote: lot.lotNumber,
        Validade: new Date(lot.expirationDate).toLocaleDateString('pt-BR'),
        'Dias restantes': daysLeft,
        Saldo: fmtNum(balance),
        'Valor em risco (R$)': risco > 0 ? fmtR$(risco) : '—',
        Urgência: urgencyLabel(daysLeft),
        _daysLeft: daysLeft,
        _risco: risco,
      };
    });

    // Gráfico: valor em risco por faixa
    const faixas = {
      '≤30 dias': 0,
      '31–60 dias': 0,
      '61–90 dias': 0,
    };
    for (const r of rows) {
      if (r._daysLeft <= 30) faixas['≤30 dias'] += r._risco;
      else if (r._daysLeft <= 60) faixas['31–60 dias'] += r._risco;
      else faixas['61–90 dias'] += r._risco;
    }
    const chart = Object.entries(faixas).map(([name, value]) => ({ name, value }));

    return {
      rows,
      chart,
      meta: { days: maxDays, totalLots: lots.length, totalRisco, semValor },
    };
  }
}
