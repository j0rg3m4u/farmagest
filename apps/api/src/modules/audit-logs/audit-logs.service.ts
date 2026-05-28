import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { createHash } from 'crypto';
import { PrismaService } from '../../common/prisma/prisma.service';
import type { JwtPayload } from '@farmagest/shared';

// eslint-disable-next-line @typescript-eslint/no-require-imports
const PDFDocument = require('pdfkit') as typeof import('pdfkit');

export interface AuditLogFilters {
  userId?: string;
  action?: string;
  entity?: string;
  entityId?: string;
  sectorId?: string;
  dateFrom?: string;
  dateTo?: string;
  search?: string;
  page?: string;
  limit?: string;
}

const USER_SELECT = { id: true, name: true, email: true } as const;

@Injectable()
export class AuditLogsService {
  constructor(private prisma: PrismaService) {}

  private buildWhere(filters: AuditLogFilters, user: JwtPayload): Prisma.AuditLogWhereInput {
    const where: Prisma.AuditLogWhereInput = {};

    if (user.role !== 'MANAGER') {
      where.sectorId = user.sectorId ?? undefined;
    } else if (filters.sectorId) {
      where.sectorId = filters.sectorId;
    }

    if (filters.userId) where.userId = filters.userId;
    if (filters.action) where.action = filters.action;
    if (filters.entity) where.entity = filters.entity;
    if (filters.entityId) where.entityId = filters.entityId;

    if (filters.dateFrom || filters.dateTo) {
      where.createdAt = {};
      if (filters.dateFrom) (where.createdAt as Prisma.DateTimeFilter).gte = new Date(filters.dateFrom);
      if (filters.dateTo) (where.createdAt as Prisma.DateTimeFilter).lte = new Date(filters.dateTo);
    }

    return where;
  }

  async list(filters: AuditLogFilters, user: JwtPayload) {
    const page = Math.max(1, parseInt(filters.page ?? '1', 10));
    const limit = Math.min(200, Math.max(1, parseInt(filters.limit ?? '50', 10)));
    const skip = (page - 1) * limit;

    const where = this.buildWhere(filters, user);

    const [data, total] = await Promise.all([
      this.prisma.auditLog.findMany({
        where,
        include: { user: { select: USER_SELECT } },
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
      }),
      this.prisma.auditLog.count({ where }),
    ]);

    return { data, total, page, limit, totalPages: Math.ceil(total / limit) };
  }

  async findOne(id: string) {
    return this.prisma.auditLog.findUniqueOrThrow({
      where: { id },
      include: { user: { select: USER_SELECT } },
    });
  }

  async history(entity: string, entityId: string) {
    return this.prisma.auditLog.findMany({
      where: { entity, entityId },
      include: { user: { select: USER_SELECT } },
      orderBy: { createdAt: 'asc' },
    });
  }

  async getDistinctEntities() {
    const rows = await this.prisma.auditLog.findMany({
      select: { entity: true },
      distinct: ['entity'],
      orderBy: { entity: 'asc' },
    });
    return rows.map((r) => r.entity);
  }

  async getDistinctActions() {
    const rows = await this.prisma.auditLog.findMany({
      select: { action: true },
      distinct: ['action'],
      orderBy: { action: 'asc' },
    });
    return rows.map((r) => r.action);
  }

  async stats(user: JwtPayload) {
    const where = this.buildWhere({}, user);
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const [total, last30days, byAction, topUsers] = await Promise.all([
      this.prisma.auditLog.count({ where }),
      this.prisma.auditLog.count({ where: { ...where, createdAt: { gte: thirtyDaysAgo } } }),
      this.prisma.auditLog.groupBy({
        by: ['action'],
        where: { ...where, createdAt: { gte: thirtyDaysAgo } },
        _count: { action: true },
        orderBy: { _count: { action: 'desc' } },
        take: 10,
      }),
      this.prisma.auditLog.groupBy({
        by: ['userId'],
        where: { ...where, createdAt: { gte: thirtyDaysAgo }, userId: { not: null } },
        _count: { userId: true },
        orderBy: { _count: { userId: 'desc' } },
        take: 5,
      }),
    ]);

    return { total, last30days, byAction, topUsers };
  }

  async exportCsv(filters: AuditLogFilters, user: JwtPayload): Promise<string> {
    const where = this.buildWhere(filters, user);
    const rows = await this.prisma.auditLog.findMany({
      where,
      include: { user: { select: USER_SELECT } },
      orderBy: { createdAt: 'desc' },
      take: 5000,
    });

    const header = 'Data,Hora,Usuário,E-mail,Ação,Entidade,EntityId\n';
    const lines = rows.map((r) => {
      const dt = new Date(r.createdAt);
      const date = dt.toLocaleDateString('pt-BR');
      const time = dt.toLocaleTimeString('pt-BR');
      const name = (r.user?.name ?? '—').replace(/,/g, ' ');
      const email = (r.user?.email ?? '—').replace(/,/g, ' ');
      return `${date},${time},${name},${email},${r.action},${r.entity},${r.entityId ?? ''}`;
    });

    return header + lines.join('\n');
  }

  async exportPdf(filters: AuditLogFilters, user: JwtPayload): Promise<Buffer> {
    const where = this.buildWhere(filters, user);
    const rows = await this.prisma.auditLog.findMany({
      where,
      include: { user: { select: USER_SELECT } },
      orderBy: { createdAt: 'desc' },
      take: 500,
    });

    const now = new Date().toLocaleString('pt-BR');
    const periodFrom = filters.dateFrom
      ? new Date(filters.dateFrom).toLocaleDateString('pt-BR')
      : '—';
    const periodTo = filters.dateTo
      ? new Date(filters.dateTo).toLocaleDateString('pt-BR')
      : '—';

    const hashContent = `audit|${user.sub}|${rows.length}|${now}`;
    const hash = createHash('sha256').update(hashContent).digest('hex').substring(0, 12);

    return new Promise((resolve, reject) => {
      const chunks: Buffer[] = [];
      const doc = new PDFDocument({ margin: 40, size: 'A4' });

      doc.on('data', (c: Buffer) => chunks.push(c));
      doc.on('end', () => resolve(Buffer.concat(chunks)));
      doc.on('error', reject);

      doc.fontSize(14).font('Helvetica-Bold').text('Relatório de Auditoria — FarmaGest', { align: 'center' });
      doc.fontSize(9).font('Helvetica').text(`Período: ${periodFrom} até ${periodTo}  |  Total: ${rows.length} registros  |  Gerado em: ${now}`, { align: 'center' });
      doc.moveDown(0.5);
      doc.text('═'.repeat(100), { align: 'center' });
      doc.moveDown(0.3);

      const colW = [80, 85, 85, 70, 70, 100];
      const headers = ['Data/Hora', 'Usuário', 'E-mail', 'Ação', 'Entidade', 'EntityId'];

      doc.fontSize(8).font('Helvetica-Bold');
      let x = 40;
      const y0 = doc.y;
      for (let i = 0; i < headers.length; i++) {
        doc.text(headers[i], x, y0, { width: colW[i], lineBreak: false });
        x += colW[i];
      }
      doc.moveDown(0.4);
      doc.font('Helvetica');

      for (const row of rows) {
        if (doc.y > 750) {
          doc.addPage();
          doc.fontSize(8).font('Helvetica');
        }
        const dt = new Date(row.createdAt).toLocaleString('pt-BR');
        const cols = [
          dt,
          (row.user?.name ?? '—').substring(0, 14),
          (row.user?.email ?? '—').substring(0, 20),
          row.action.substring(0, 12),
          row.entity.substring(0, 12),
          (row.entityId ?? '—').substring(0, 18),
        ];
        x = 40;
        const y = doc.y;
        for (let i = 0; i < cols.length; i++) {
          doc.text(cols[i], x, y, { width: colW[i], lineBreak: false });
          x += colW[i];
        }
        doc.moveDown(0.35);
      }

      doc.moveDown(0.5);
      doc.fontSize(7).fillColor('#888888').text(
        `FarmaGest — Hash: ${hash} — ${now}`,
        { align: 'center' },
      );

      doc.end();
    });
  }
}
