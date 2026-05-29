import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../common/prisma/prisma.service';
import { resolvePeriod, type ReportFilters } from '@farmagest/shared';
import type { JwtPayload } from '@farmagest/shared';
import { isGlobalRole } from '../../../common/utils/auth.utils';

const fmtDate = (d: Date | string) => new Date(d).toLocaleDateString('pt-BR');
const fmtPct = (n: number) => `${n.toFixed(1)}%`;

@Injectable()
export class GeraReportService {
  constructor(private prisma: PrismaService) {}

  async getData(filters: ReportFilters, user: JwtPayload) {
    const { from, to } = resolvePeriod(filters);
    const sectorId = !isGlobalRole(user) ? (user.sectorId ?? undefined) : (filters.sectorId ?? undefined);

    const geras = await this.prisma.gera.findMany({
      where: {
        requestedAt: { gte: from, lte: to },
        status: { in: ['COMPLETED', 'DISPATCHED'] },
        deletedAt: null,
      },
      include: {
        unit: { select: { name: true } },
        items: {
          where: sectorId ? { sectorId } : {},
          select: { status: true, requested: true, approved: true },
        },
      },
      orderBy: { requestedAt: 'desc' },
    });

    let totalSolicitados = 0;
    let totalAtendidos = 0;
    let totalParciais = 0;
    let totalNegados = 0;

    const rows = geras.map((g) => {
      const items = g.items;
      const solicitados = items.length;
      const atendidos = items.filter((i) => i.status === 'APPROVED' && Number(i.approved) >= Number(i.requested)).length;
      const parciais = items.filter((i) => i.status === 'APPROVED' && Number(i.approved) < Number(i.requested)).length;
      const negados = items.filter((i) => i.status === 'DENIED').length;
      const taxa = solicitados > 0 ? ((atendidos + parciais * 0.5) / solicitados) * 100 : 0;

      totalSolicitados += solicitados;
      totalAtendidos += atendidos;
      totalParciais += parciais;
      totalNegados += negados;

      return {
        'GERA': g.code,
        'Nº Original': g.externalNumber ?? '—',
        Unidade: g.unit?.name ?? '—',
        Data: fmtDate(g.requestedAt),
        'Itens solicit.': solicitados,
        'Atendidos': atendidos,
        'Parciais': parciais,
        'Negados': negados,
        'Taxa atend.': fmtPct(taxa),
      };
    });

    const taxaGeral = totalSolicitados > 0
      ? ((totalAtendidos + totalParciais * 0.5) / totalSolicitados) * 100
      : 0;

    const chart = [
      { name: 'Integral', value: totalAtendidos },
      { name: 'Parcial', value: totalParciais },
      { name: 'Negado', value: totalNegados },
    ];

    return {
      rows,
      totals: {
        'GERA': 'TOTAL',
        'Nº Original': '',
        Unidade: `${geras.length} GERAs`,
        Data: '',
        'Itens solicit.': totalSolicitados,
        'Atendidos': totalAtendidos,
        'Parciais': totalParciais,
        'Negados': totalNegados,
        'Taxa atend.': fmtPct(taxaGeral),
      },
      chart,
      meta: { from, to, totalGeras: geras.length, taxaGeral },
    };
  }
}
