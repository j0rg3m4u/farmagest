import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../common/prisma/prisma.service';
import { resolvePeriod, type ReportFilters } from '@farmagest/shared';
import type { JwtPayload } from '@farmagest/shared';
import { isGlobalRole } from '../../../common/utils/auth.utils';

const fmtR$ = (n: number) => n.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
const fmtDate = (d: Date | string) => new Date(d).toLocaleDateString('pt-BR');

@Injectable()
export class ExchangesReportService {
  constructor(private prisma: PrismaService) {}

  async getData(filters: ReportFilters, user: JwtPayload) {
    const { from, to } = resolvePeriod(filters);
    const sectorId = !isGlobalRole(user) ? (user.sectorId ?? undefined) : (filters.sectorId ?? undefined);

    const exchanges = await this.prisma.exchange.findMany({
      where: {
        date: { gte: from, lte: to },
        status: { in: ['EXECUTED', 'COMPLETED'] },
        ...(sectorId ? { sectorId } : {}),
        deletedAt: null,
      },
      include: {
        partner: { select: { name: true } },
        outputs: true,
        inputs: true,
        createdBy: { select: { name: true } },
      },
      orderBy: { date: 'desc' },
    });

    let totalEnviado = 0;
    let totalRecebido = 0;

    const rows = exchanges.map((ex) => {
      const enviado = ex.outputs.reduce((s, o) => s + Number(o.subtotal), 0);
      const recebido = ex.inputs.reduce((s, i) => s + Number(i.subtotal), 0);
      const diff = recebido - enviado;
      totalEnviado += enviado;
      totalRecebido += recebido;
      return {
        Código: ex.code,
        Data: fmtDate(ex.date),
        'Município Parceiro': ex.partner?.name ?? '—',
        'Itens enviados': ex.outputs.length,
        'Valor enviado (R$)': fmtR$(enviado),
        'Itens recebidos': ex.inputs.length,
        'Valor recebido (R$)': fmtR$(recebido),
        'Diferença (R$)': fmtR$(diff),
        Responsável: ex.createdBy.name,
        _month: new Date(ex.date).toLocaleDateString('pt-BR', { month: 'short', year: 'numeric' }),
        _enviado: enviado,
        _recebido: recebido,
      };
    });

    const byMonth: Record<string, { enviado: number; recebido: number }> = {};
    for (const r of rows) {
      byMonth[r._month] ??= { enviado: 0, recebido: 0 };
      byMonth[r._month].enviado += r._enviado;
      byMonth[r._month].recebido += r._recebido;
    }
    const chart = Object.entries(byMonth).map(([month, v]) => ({ month, ...v }));

    return {
      rows,
      totals: {
        Código: 'TOTAL',
        Data: '',
        'Município Parceiro': `${exchanges.length} trocas`,
        'Itens enviados': '',
        'Valor enviado (R$)': fmtR$(totalEnviado),
        'Itens recebidos': '',
        'Valor recebido (R$)': fmtR$(totalRecebido),
        'Diferença (R$)': fmtR$(totalRecebido - totalEnviado),
        Responsável: '',
      },
      chart,
      meta: { from, to, totalExchanges: exchanges.length, totalEnviado, totalRecebido },
    };
  }
}
