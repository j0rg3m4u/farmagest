import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ForbiddenException,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { MovementType, isEntryType } from '@farmagest/shared';
import { PrismaService } from '../../common/prisma/prisma.service';
import type {
  JwtPayload,
  EntryPurchaseInput,
  ExitSupplyInput,
  AdjustmentInput,
  DisposalInput,
  ReversalInput,
} from '@farmagest/shared';

const MOVEMENT_SELECT = {
  id: true,
  type: true,
  itemId: true,
  item: { select: { id: true, code: true, description: true } },
  lotId: true,
  lot: { select: { id: true, lotNumber: true, expirationDate: true } },
  sectorId: true,
  quantity: true,
  unitValue: true,
  balanceAfter: true,
  unitId: true,
  unit: { select: { id: true, name: true } },
  invoiceNumber: true,
  partnerExchangeId: true,
  reason: true,
  reversalOfId: true,
  createdById: true,
  createdBy: { select: { id: true, name: true } },
  createdAt: true,
} as const;

export interface MovementsFilter {
  itemId?: string;
  lotId?: string;
  sectorId?: string;
  unitId?: string;
  type?: string;
  dateFrom?: string;
  dateTo?: string;
  page?: string;
  limit?: string;
}

@Injectable()
export class MovementsService {
  constructor(private prisma: PrismaService) {}

  // ─── Helpers privados ───────────────────────────────────────────────────────

  private assertSectorAccess(itemSectorId: string, user: JwtPayload): void {
    if (user.role === 'MANAGER') return;
    if (user.sectorId !== itemSectorId) {
      throw new ForbiddenException('Sem acesso ao setor deste item');
    }
  }

  private async createMovement(
    tx: Prisma.TransactionClient,
    data: {
      type: MovementType;
      itemId: string;
      lotId: string;
      sectorId: string;
      quantity: number;
      unitValue?: number;
      unitId?: string;
      invoiceNumber?: string;
      reason?: string;
      partnerExchangeId?: string;
      reversalOfId?: string;
      createdById: string;
    },
  ) {
    const lot = await tx.lot.findUniqueOrThrow({ where: { id: data.lotId } });
    const current = Number(lot.currentBalance);
    const delta = isEntryType(data.type) ? data.quantity : -data.quantity;
    const balanceAfter = current + delta;

    if (balanceAfter < 0) {
      throw new BadRequestException(
        `Saldo insuficiente. Lote tem ${current}, tentou retirar ${data.quantity}`,
      );
    }

    const movement = await tx.movement.create({
      data: {
        type: data.type,
        itemId: data.itemId,
        lotId: data.lotId,
        sectorId: data.sectorId,
        quantity: data.quantity,
        unitValue: data.unitValue,
        balanceAfter,
        unitId: data.unitId,
        invoiceNumber: data.invoiceNumber,
        reason: data.reason,
        partnerExchangeId: data.partnerExchangeId,
        reversalOfId: data.reversalOfId,
        createdById: data.createdById,
      },
      select: MOVEMENT_SELECT,
    });

    await tx.lot.update({
      where: { id: data.lotId },
      data: { currentBalance: balanceAfter },
    });

    return movement;
  }

  // ─── Listagem ────────────────────────────────────────────────────────────────

  async findAll(filter: MovementsFilter, user: JwtPayload) {
    const page = Math.max(1, parseInt(filter.page ?? '1', 10));
    const limit = Math.min(100, Math.max(1, parseInt(filter.limit ?? '20', 10)));
    const skip = (page - 1) * limit;

    const where: Prisma.MovementWhereInput = {};

    if (user.role !== 'MANAGER') {
      where.sectorId = user.sectorId ?? undefined;
    } else if (filter.sectorId) {
      where.sectorId = filter.sectorId;
    }

    if (filter.itemId) where.itemId = filter.itemId;
    if (filter.lotId) where.lotId = filter.lotId;
    if (filter.unitId) where.unitId = filter.unitId;
    if (filter.type) where.type = filter.type as MovementType;
    if (filter.dateFrom || filter.dateTo) {
      where.createdAt = {};
      if (filter.dateFrom) where.createdAt.gte = new Date(filter.dateFrom);
      if (filter.dateTo) where.createdAt.lte = new Date(filter.dateTo);
    }

    const [data, total] = await Promise.all([
      this.prisma.movement.findMany({
        where,
        skip,
        take: limit,
        select: MOVEMENT_SELECT,
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.movement.count({ where }),
    ]);

    return { data, total, page, limit, totalPages: Math.ceil(total / limit) };
  }

  async findOne(id: string) {
    const movement = await this.prisma.movement.findUnique({
      where: { id },
      select: MOVEMENT_SELECT,
    });
    if (!movement) throw new NotFoundException('Movimentação não encontrada');
    return movement;
  }

  // ─── FEFO ────────────────────────────────────────────────────────────────────

  async suggestFefo(itemId: string, quantity: number, user: JwtPayload) {
    const item = await this.prisma.item.findFirst({
      where: { id: itemId, deletedAt: null },
    });
    if (!item) throw new NotFoundException('Item não encontrado');
    this.assertSectorAccess(item.sectorId, user);

    const lots = await this.prisma.lot.findMany({
      where: { itemId, active: true, deletedAt: null, currentBalance: { gt: 0 } },
      orderBy: { expirationDate: 'asc' },
    });

    const allocation: Array<{
      lotId: string;
      lotNumber: string;
      expirationDate: Date;
      quantity: number;
      available: number;
    }> = [];
    let remaining = quantity;

    for (const lot of lots) {
      if (remaining <= 0) break;
      const available = Number(lot.currentBalance);
      const take = Math.min(available, remaining);
      allocation.push({ lotId: lot.id, lotNumber: lot.lotNumber, expirationDate: lot.expirationDate, quantity: take, available });
      remaining -= take;
    }

    const totalAvailable = lots.reduce((s, l) => s + Number(l.currentBalance), 0);
    return { allocation, fullyAllocated: remaining <= 0, shortBy: Math.max(0, remaining), totalAvailable };
  }

  // ─── Entrada por compra ──────────────────────────────────────────────────────

  async entryPurchase(dto: EntryPurchaseInput, user: JwtPayload) {
    return this.prisma.$transaction(async (tx) => {
      const item = await tx.item.findFirst({ where: { id: dto.itemId, deletedAt: null } });
      if (!item) throw new NotFoundException('Item não encontrado');
      this.assertSectorAccess(item.sectorId, user);

      const lot = await tx.lot.findFirst({ where: { id: dto.lotId, deletedAt: null } });
      if (!lot) throw new NotFoundException('Lote não encontrado');
      if (lot.itemId !== dto.itemId) throw new BadRequestException('Lote não pertence ao item');

      const movement = await this.createMovement(tx, {
        type: MovementType.ENTRY_PURCHASE,
        itemId: dto.itemId,
        lotId: dto.lotId,
        sectorId: item.sectorId,
        quantity: dto.quantity,
        unitValue: dto.unitValue,
        invoiceNumber: dto.invoiceNumber ?? undefined,
        reason: dto.reason ?? undefined,
        createdById: user.sub,
      });

      if (dto.unitValue) {
        await tx.item.update({ where: { id: dto.itemId }, data: { unitValue: dto.unitValue } });
      }

      return movement;
    });
  }

  // ─── Saída por abastecimento (com FEFO) ─────────────────────────────────────

  async exitSupply(dto: ExitSupplyInput, user: JwtPayload) {
    return this.prisma.$transaction(async (tx) => {
      const item = await tx.item.findFirst({ where: { id: dto.itemId, deletedAt: null } });
      if (!item) throw new NotFoundException('Item não encontrado');
      this.assertSectorAccess(item.sectorId, user);

      await tx.unit.findFirstOrThrow({ where: { id: dto.unitId } }).catch(() => {
        throw new NotFoundException('Unidade não encontrada');
      });

      if (dto.lotId) {
        const lot = await tx.lot.findFirst({ where: { id: dto.lotId, deletedAt: null } });
        if (!lot) throw new NotFoundException('Lote não encontrado');
        if (lot.itemId !== dto.itemId) throw new BadRequestException('Lote não pertence ao item');

        return [
          await this.createMovement(tx, {
            type: MovementType.EXIT_SUPPLY,
            itemId: dto.itemId,
            lotId: dto.lotId,
            sectorId: item.sectorId,
            quantity: dto.quantity,
            unitId: dto.unitId,
            reason: dto.reason ?? undefined,
            createdById: user.sub,
          }),
        ];
      }

      // FEFO automático
      const lots = await tx.lot.findMany({
        where: { itemId: dto.itemId, active: true, deletedAt: null, currentBalance: { gt: 0 } },
        orderBy: { expirationDate: 'asc' },
      });

      const totalAvailable = lots.reduce((s, l) => s + Number(l.currentBalance), 0);
      if (totalAvailable < dto.quantity) {
        throw new BadRequestException(
          `Saldo insuficiente. Disponível: ${totalAvailable}, solicitado: ${dto.quantity}`,
        );
      }

      const movements = [];
      let remaining = dto.quantity;
      for (const lot of lots) {
        if (remaining <= 0) break;
        const take = Math.min(Number(lot.currentBalance), remaining);
        const m = await this.createMovement(tx, {
          type: MovementType.EXIT_SUPPLY,
          itemId: dto.itemId,
          lotId: lot.id,
          sectorId: item.sectorId,
          quantity: take,
          unitId: dto.unitId,
          reason: dto.reason ?? undefined,
          createdById: user.sub,
        });
        movements.push(m);
        remaining -= take;
      }
      return movements;
    });
  }

  // ─── Ajuste de inventário ────────────────────────────────────────────────────

  async adjustment(dto: AdjustmentInput, user: JwtPayload) {
    return this.prisma.$transaction(async (tx) => {
      const item = await tx.item.findFirst({ where: { id: dto.itemId, deletedAt: null } });
      if (!item) throw new NotFoundException('Item não encontrado');
      this.assertSectorAccess(item.sectorId, user);

      const lot = await tx.lot.findFirst({ where: { id: dto.lotId, deletedAt: null } });
      if (!lot) throw new NotFoundException('Lote não encontrado');
      if (lot.itemId !== dto.itemId) throw new BadRequestException('Lote não pertence ao item');

      const type = dto.direction === 'ENTRY' ? MovementType.ENTRY_ADJUSTMENT : MovementType.EXIT_ADJUSTMENT;

      return this.createMovement(tx, {
        type,
        itemId: dto.itemId,
        lotId: dto.lotId,
        sectorId: item.sectorId,
        quantity: dto.quantity,
        reason: dto.reason,
        createdById: user.sub,
      });
    });
  }

  // ─── Descarte ────────────────────────────────────────────────────────────────

  async disposal(dto: DisposalInput, user: JwtPayload) {
    return this.prisma.$transaction(async (tx) => {
      const item = await tx.item.findFirst({ where: { id: dto.itemId, deletedAt: null } });
      if (!item) throw new NotFoundException('Item não encontrado');
      this.assertSectorAccess(item.sectorId, user);

      const lot = await tx.lot.findFirst({ where: { id: dto.lotId, deletedAt: null } });
      if (!lot) throw new NotFoundException('Lote não encontrado');
      if (lot.itemId !== dto.itemId) throw new BadRequestException('Lote não pertence ao item');

      return this.createMovement(tx, {
        type: MovementType.EXIT_DISPOSAL,
        itemId: dto.itemId,
        lotId: dto.lotId,
        sectorId: item.sectorId,
        quantity: dto.quantity,
        reason: dto.reason,
        createdById: user.sub,
      });
    });
  }

  // ─── Estorno ─────────────────────────────────────────────────────────────────

  async reversal(movementId: string, dto: ReversalInput, user: JwtPayload) {
    return this.prisma.$transaction(async (tx) => {
      const original = await tx.movement.findUnique({ where: { id: movementId } });
      if (!original) throw new NotFoundException('Movimentação não encontrada');

      if (original.reversalOfId) {
        throw new BadRequestException('Não é possível estornar um estorno');
      }
      const alreadyReversed = await tx.movement.findFirst({ where: { reversalOfId: movementId } });
      if (alreadyReversed) {
        throw new BadRequestException('Esta movimentação já foi estornada');
      }

      this.assertSectorAccess(original.sectorId, user);

      const type = isEntryType(original.type as MovementType)
        ? MovementType.EXIT_ADJUSTMENT
        : MovementType.ENTRY_ADJUSTMENT;

      return this.createMovement(tx, {
        type,
        itemId: original.itemId,
        lotId: original.lotId,
        sectorId: original.sectorId,
        quantity: Number(original.quantity),
        reason: `Estorno de ${original.id}: ${dto.reason}`,
        reversalOfId: original.id,
        createdById: user.sub,
      });
    });
  }

  // ─── Recálculo de saldo (auditoria) ──────────────────────────────────────────

  async recalculateBalance(lotId: string) {
    const lot = await this.prisma.lot.findFirst({ where: { id: lotId, deletedAt: null } });
    if (!lot) throw new NotFoundException('Lote não encontrado');

    const movements = await this.prisma.movement.findMany({
      where: { lotId },
      orderBy: { createdAt: 'asc' },
    });

    let balance = 0;
    for (const m of movements) {
      balance += isEntryType(m.type as MovementType) ? Number(m.quantity) : -Number(m.quantity);
    }

    const stored = Number(lot.currentBalance);
    const divergence = balance - stored;

    if (divergence !== 0) {
      await this.prisma.lot.update({ where: { id: lotId }, data: { currentBalance: balance } });
    }

    return { recalculated: balance, stored, divergence, corrected: divergence !== 0 };
  }
}
