import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../common/prisma/prisma.service';
import { resolvePeriod, type ReportFilters } from '@farmagest/shared';

const fmtDate = (d: Date | string) => new Date(d).toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short' });

const ACTION_LABELS: Record<string, string> = {
  CREATE: 'Criação',
  UPDATE: 'Edição',
  DELETE: 'Exclusão',
  LOGIN: 'Login',
  LOGOUT: 'Logout',
  EXPORT: 'Exportação',
  IMPORT: 'Importação',
  DISPATCH: 'Despacho',
  APPROVE: 'Aprovação',
  DENY: 'Negação',
  CANCEL: 'Cancelamento',
};

const ENTITY_LABELS: Record<string, string> = {
  User: 'Usuário',
  Item: 'Item',
  Lot: 'Lote',
  Movement: 'Movimentação',
  Exchange: 'Troca',
  Gera: 'GERA',
  GeraItem: 'Item GERA',
  Unit: 'Unidade',
  Sector: 'Setor',
  Setting: 'Configuração',
};

@Injectable()
export class AuditReportService {
  constructor(private prisma: PrismaService) {}

  async getData(filters: ReportFilters & { userId?: string; action?: string; entity?: string }) {
    const { from, to } = resolvePeriod(filters);

    const logs = await this.prisma.auditLog.findMany({
      where: {
        createdAt: { gte: from, lte: to },
        ...(filters.userId ? { userId: filters.userId } : {}),
        ...(filters.action ? { action: filters.action } : {}),
        ...(filters.entity ? { entity: filters.entity } : {}),
      },
      include: {
        user: { select: { name: true, role: true } },
      },
      orderBy: { createdAt: 'desc' },
      take: 2000,
    });

    const rows = logs.map((log) => ({
      'Data/Hora': fmtDate(log.createdAt),
      Usuário: log.user?.name ?? 'Sistema',
      Perfil: log.user?.role ?? '—',
      Ação: ACTION_LABELS[log.action] ?? log.action,
      Entidade: ENTITY_LABELS[log.entity] ?? log.entity,
      'ID da Entidade': log.entityId ?? '—',
      Setor: log.sectorId ?? '—',
      Detalhe: log.payload ? JSON.stringify(log.payload).slice(0, 200) : '—',
      _raw: log,
    }));

    // Contagem por ação
    const byAction: Record<string, number> = {};
    for (const log of logs) {
      const label = ACTION_LABELS[log.action] ?? log.action;
      byAction[label] = (byAction[label] ?? 0) + 1;
    }
    const chart = Object.entries(byAction)
      .sort((a, b) => b[1] - a[1])
      .map(([name, value]) => ({ name, value }));

    // Usuários mais ativos
    const byUser: Record<string, number> = {};
    for (const log of logs) {
      const name = log.user?.name ?? 'Sistema';
      byUser[name] = (byUser[name] ?? 0) + 1;
    }
    const topUsers = Object.entries(byUser)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([name, count]) => ({ name, count }));

    return {
      rows,
      chart,
      topUsers,
      meta: { from, to, total: logs.length, truncated: logs.length === 2000 },
    };
  }
}
