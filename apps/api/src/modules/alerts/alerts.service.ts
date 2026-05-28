import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../common/prisma/prisma.service';
import type { JwtPayload } from '@farmagest/shared';

@Injectable()
export class AlertsService {
  constructor(private prisma: PrismaService) {}

  private sectorFilter(user: JwtPayload): string | undefined {
    return user.role === 'MANAGER' ? undefined : (user.sectorId ?? undefined);
  }

  async getExpiration(days: number, user: JwtPayload) {
    const sectorId = this.sectorFilter(user);
    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() + days);

    const lots = await this.prisma.lot.findMany({
      where: {
        deletedAt: null,
        active: true,
        currentBalance: { gt: 0 },
        expirationDate: { lte: cutoff },
        item: {
          deletedAt: null,
          active: true,
          ...(sectorId ? { sectorId } : {}),
        },
      },
      select: {
        id: true,
        lotNumber: true,
        expirationDate: true,
        currentBalance: true,
        item: { select: { id: true, code: true, description: true, sectorId: true, sector: { select: { name: true } } } },
      },
      orderBy: { expirationDate: 'asc' },
    });

    return { days, total: lots.length, lots };
  }

  async getCritical(user: JwtPayload) {
    const sectorId = this.sectorFilter(user);

    const items = await this.prisma.item.findMany({
      where: {
        deletedAt: null,
        active: true,
        ...(sectorId ? { sectorId } : {}),
      },
      select: {
        id: true,
        code: true,
        description: true,
        unitOfMeasure: true,
        sectorId: true,
        sector: { select: { name: true } },
        lots: {
          where: { deletedAt: null, active: true },
          select: { currentBalance: true },
        },
      },
    });

    const critical = items
      .map((item) => ({
        ...item,
        totalBalance: item.lots.reduce((s, l) => s + Number(l.currentBalance), 0),
      }))
      .filter((item) => item.totalBalance === 0)
      .map(({ lots: _, ...item }) => item);

    return { total: critical.length, items: critical };
  }

  async getSummary(user: JwtPayload) {
    const sectorId = this.sectorFilter(user);
    const now = new Date();
    const firstOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const in30 = new Date(now); in30.setDate(now.getDate() + 30);
    const in60 = new Date(now); in60.setDate(now.getDate() + 60);
    const in90 = new Date(now); in90.setDate(now.getDate() + 90);

    const itemWhere = {
      deletedAt: null,
      active: true,
      ...(sectorId ? { sectorId } : {}),
    };

    const [
      expiringIn30,
      expiringIn31to60,
      expiringIn61to90,
      movementsThisMonth,
      criticalResult,
    ] = await Promise.all([
      this.prisma.lot.count({
        where: {
          deletedAt: null, active: true, currentBalance: { gt: 0 },
          expirationDate: { lte: in30 },
          item: itemWhere,
        },
      }),
      this.prisma.lot.count({
        where: {
          deletedAt: null, active: true, currentBalance: { gt: 0 },
          expirationDate: { gt: in30, lte: in60 },
          item: itemWhere,
        },
      }),
      this.prisma.lot.count({
        where: {
          deletedAt: null, active: true, currentBalance: { gt: 0 },
          expirationDate: { gt: in60, lte: in90 },
          item: itemWhere,
        },
      }),
      this.prisma.movement.count({
        where: {
          createdAt: { gte: firstOfMonth },
          ...(sectorId ? { sectorId } : {}),
        },
      }),
      this.getCritical(user),
    ]);

    return {
      zeroBalance: { count: criticalResult.total },
      expiringIn30: { count: expiringIn30 },
      expiringIn31to60: { count: expiringIn31to60 },
      expiringIn61to90: { count: expiringIn61to90 },
      movementsThisMonth,
    };
  }
}
