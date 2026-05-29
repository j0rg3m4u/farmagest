import {
  Injectable,
  ForbiddenException,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { PrismaService } from '../../common/prisma/prisma.service';
import type { JwtPayload } from '@farmagest/shared';

@Injectable()
export class AdminService {
  constructor(
    private prisma: PrismaService,
    private jwt: JwtService,
  ) {}

  // ─── Settings ────────────────────────────────────────────────────────────────

  async getSettings() {
    return this.prisma.setting.findUniqueOrThrow({ where: { id: 'singleton' } });
  }

  async updateSettings(dto: {
    requireExchangeApproval?: boolean;
    exchangeTolerancePct?: number;
    exchangeApprovalThreshold?: number;
  }) {
    return this.prisma.setting.update({
      where: { id: 'singleton' },
      data: {
        ...(dto.requireExchangeApproval !== undefined ? { requireExchangeApproval: dto.requireExchangeApproval } : {}),
        ...(dto.exchangeTolerancePct !== undefined ? { exchangeTolerancePct: dto.exchangeTolerancePct } : {}),
        ...(dto.exchangeApprovalThreshold !== undefined ? { exchangeApprovalThreshold: dto.exchangeApprovalThreshold } : {}),
      },
    });
  }

  // ─── Recálculo de saldos ─────────────────────────────────────────────────────

  async recalculateBalances(sectorId?: string) {
    const lots = await this.prisma.lot.findMany({
      where: {
        deletedAt: null,
        ...(sectorId ? { item: { sectorId } } : {}),
      },
      select: { id: true, initialQuantity: true },
    });

    let divergencias = 0;
    let recalculados = 0;

    for (const lot of lots) {
      const movements = await this.prisma.movement.aggregate({
        where: { lotId: lot.id },
        _sum: { quantity: true },
      });

      const entradas = await this.prisma.movement.aggregate({
        where: { lotId: lot.id, type: { in: ['ENTRY_PURCHASE', 'ENTRY_EXCHANGE', 'ENTRY_ADJUSTMENT', 'ENTRY_RETURN'] } },
        _sum: { quantity: true },
      });
      const saidas = await this.prisma.movement.aggregate({
        where: { lotId: lot.id, type: { in: ['EXIT_SUPPLY', 'EXIT_DISPOSAL', 'EXIT_EXCHANGE', 'EXIT_ADJUSTMENT'] } },
        _sum: { quantity: true },
      });

      const calculatedBalance =
        Number(lot.initialQuantity) +
        Number(entradas._sum.quantity ?? 0) -
        Number(saidas._sum.quantity ?? 0);

      const currentLot = await this.prisma.lot.findUnique({
        where: { id: lot.id },
        select: { currentBalance: true },
      });

      if (!currentLot) continue;

      const currentBalance = Number(currentLot.currentBalance);
      if (Math.abs(calculatedBalance - currentBalance) > 0.001) {
        divergencias++;
        await this.prisma.lot.update({
          where: { id: lot.id },
          data: { currentBalance: calculatedBalance },
        });
      }
      recalculados++;
    }

    return { recalculados, divergencias };
  }

  // ─── Impersonação ─────────────────────────────────────────────────────────────

  async impersonate(targetUserId: string, superadmin: JwtPayload) {
    const target = await this.prisma.user.findUnique({
      where: { id: targetUserId },
      select: { id: true, name: true, email: true, role: true, sectorId: true, active: true },
    });
    if (!target) throw new NotFoundException('Usuário não encontrado');
    if (target.role === 'SUPERADMIN') {
      throw new ForbiddenException('Não é possível impersonar outro SUPERADMIN');
    }
    if (!target.active) throw new BadRequestException('Usuário inativo');

    const payload: JwtPayload & { impersonatedBy: string } = {
      sub: target.id,
      email: target.email,
      role: target.role,
      sectorId: target.sectorId,
      unitId: null,
      impersonatedBy: superadmin.sub,
    };

    const accessToken = this.jwt.sign(payload, { expiresIn: '1h' });

    await this.prisma.auditLog.create({
      data: {
        userId: superadmin.sub,
        action: 'IMPERSONATE',
        entity: 'User',
        entityId: target.id,
        sectorId: null,
        payload: { targetEmail: target.email, targetRole: target.role },
      },
    });

    return { accessToken, impersonatedUser: target };
  }

  // ─── Limpeza ──────────────────────────────────────────────────────────────────

  async cleanup(target: 'movements' | 'geras' | 'items' | 'all') {
    if (process.env.NODE_ENV === 'production') {
      throw new ForbiddenException('Operação não permitida em produção');
    }

    if (target === 'movements' || target === 'all') {
      await this.prisma.geraItem.updateMany({ data: { movementId: null } });
      await this.prisma.movement.deleteMany();
    }
    if (target === 'geras' || target === 'all') {
      await this.prisma.geraItem.deleteMany();
      await this.prisma.gera.deleteMany();
    }
    if (target === 'items' || target === 'all') {
      await this.prisma.lot.deleteMany();
      await this.prisma.item.deleteMany();
    }

    return { ok: true, target };
  }

  // ─── Status do banco ─────────────────────────────────────────────────────────

  async getDatabaseStatus() {
    const [users, items, lots, movements, geras, exchanges, auditLogs] = await Promise.all([
      this.prisma.user.count(),
      this.prisma.item.count(),
      this.prisma.lot.count(),
      this.prisma.movement.count(),
      this.prisma.gera.count(),
      this.prisma.exchange.count(),
      this.prisma.auditLog.count(),
    ]);

    return {
      users,
      items,
      lots,
      movements,
      geras,
      exchanges,
      auditLogs,
      uptimeSeconds: Math.round(process.uptime()),
      nodeVersion: process.version,
      environment: process.env.NODE_ENV ?? 'development',
    };
  }
}
