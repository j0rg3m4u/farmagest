import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ForbiddenException,
  ConflictException,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { ExchangeStatus } from '@farmagest/shared';
import { PrismaService } from '../../common/prisma/prisma.service';
import type {
  JwtPayload,
  CreateExchangeInput,
  UpdateExchangeInput,
  AddExchangeOutputInput,
  AddExchangeInputInput,
  UpdateExchangeOutputInput,
  UpdateExchangeInputInput,
} from '@farmagest/shared';

const OUTPUT_SELECT = {
  id: true,
  exchangeId: true,
  itemId: true,
  item: { select: { id: true, code: true, description: true, unitValue: true } },
  lotId: true,
  lot: { select: { id: true, lotNumber: true, expirationDate: true, currentBalance: true } },
  quantity: true,
  unitValue: true,
  subtotal: true,
  executedAt: true,
  movementId: true,
  notes: true,
  createdAt: true,
} as const;

const INPUT_SELECT = {
  id: true,
  exchangeId: true,
  itemId: true,
  item: { select: { id: true, code: true, description: true, unitValue: true } },
  lotId: true,
  lot: { select: { id: true, lotNumber: true, expirationDate: true, currentBalance: true } },
  declaredLotNumber: true,
  declaredExpiration: true,
  quantity: true,
  unitValue: true,
  subtotal: true,
  executedAt: true,
  movementId: true,
  notes: true,
  createdAt: true,
} as const;

const EXCHANGE_SELECT = {
  id: true,
  code: true,
  sequence: true,
  date: true,
  status: true,
  justification: true,
  tolerancePct: true,
  partnerId: true,
  partner: { select: { id: true, name: true, responsibleName: true } },
  sectorId: true,
  sector: { select: { id: true, name: true } },
  createdById: true,
  createdBy: { select: { id: true, name: true } },
  approvedById: true,
  approvedBy: { select: { id: true, name: true } },
  approvedAt: true,
  rejectionReason: true,
  cancelledAt: true,
  cancellationReason: true,
  outputs: { select: OUTPUT_SELECT },
  inputs: { select: INPUT_SELECT },
  createdAt: true,
  updatedAt: true,
} as const;

export interface ExchangesFilter {
  status?: string;
  partnerId?: string;
  sectorId?: string;
  dateFrom?: string;
  dateTo?: string;
  page?: string;
  limit?: string;
}

export interface BalanceResult {
  totalOutput: number;
  totalInput: number;
  difference: number;
  differencePct: number;
  tolerance: number;
  isBalanced: boolean;
  hasOutputs: boolean;
  hasInputs: boolean;
}

@Injectable()
export class ExchangesService {
  constructor(private prisma: PrismaService) {}

  // ─── Private helpers ────────────────────────────────────────────────────────

  private assertEditable(status: string, action = 'editada') {
    const editable = [ExchangeStatus.DRAFT, ExchangeStatus.READY];
    if (!editable.includes(status as ExchangeStatus)) {
      throw new BadRequestException(`Troca não pode ser ${action} neste estado (${status})`);
    }
  }

  private assertSectorAccess(exchangeSectorId: string, user: JwtPayload) {
    if (user.role === 'MANAGER') return;
    if (user.sectorId !== exchangeSectorId) {
      throw new ForbiddenException('Troca pertence a outro setor');
    }
  }

  private computeBalance(
    outputs: Array<{ subtotal: unknown }>,
    inputs: Array<{ subtotal: unknown }>,
    tolerancePct: unknown,
  ): BalanceResult {
    const totalOutput = outputs.reduce((s, o) => s + Number(o.subtotal), 0);
    const totalInput = inputs.reduce((s, i) => s + Number(i.subtotal), 0);
    const difference = Math.abs(totalOutput - totalInput);
    const base = Math.max(totalOutput, totalInput);
    const differencePct = base > 0 ? (difference / base) * 100 : 0;
    const tolerance = Number(tolerancePct);
    return {
      totalOutput,
      totalInput,
      difference,
      differencePct: Number(differencePct.toFixed(2)),
      tolerance,
      isBalanced: differencePct <= tolerance,
      hasOutputs: outputs.length > 0,
      hasInputs: inputs.length > 0,
    };
  }

  private async createMovementInTx(
    tx: Prisma.TransactionClient,
    data: {
      type: 'EXIT_EXCHANGE' | 'ENTRY_EXCHANGE';
      itemId: string;
      lotId: string;
      sectorId: string;
      quantity: Prisma.Decimal | number;
      unitValue: Prisma.Decimal | number;
      partnerExchangeId: string;
      reason: string;
      createdById: string;
    },
  ) {
    const lot = await tx.lot.findUniqueOrThrow({ where: { id: data.lotId } });
    const current = Number(lot.currentBalance);
    const qty = Number(data.quantity);
    const isEntry = data.type === 'ENTRY_EXCHANGE';
    const balanceAfter = isEntry ? current + qty : current - qty;

    if (balanceAfter < 0) {
      throw new BadRequestException(
        `Saldo insuficiente. Lote tem ${current}, tentou retirar ${qty}`,
      );
    }

    const movement = await tx.movement.create({
      data: {
        type: data.type,
        itemId: data.itemId,
        lotId: data.lotId,
        sectorId: data.sectorId,
        quantity: qty,
        unitValue: Number(data.unitValue),
        balanceAfter,
        partnerExchangeId: data.partnerExchangeId,
        reason: data.reason,
        createdById: data.createdById,
      },
    });

    await tx.lot.update({
      where: { id: data.lotId },
      data: { currentBalance: balanceAfter },
    });

    return movement;
  }

  private async updateExchangeStatus(tx: Prisma.TransactionClient, exchangeId: string) {
    const exchange = await tx.exchange.findUniqueOrThrow({
      where: { id: exchangeId },
      include: { outputs: true, inputs: true },
    });

    const total = exchange.outputs.length + exchange.inputs.length;
    const executed = [...exchange.outputs, ...exchange.inputs].filter((r) => r.executedAt !== null).length;

    let newStatus: ExchangeStatus = exchange.status as ExchangeStatus;
    if (total === 0) return;
    if (executed === total) {
      newStatus = ExchangeStatus.COMPLETED;
    } else if (executed > 0) {
      newStatus = ExchangeStatus.EXECUTED;
    }

    if (newStatus !== exchange.status) {
      await tx.exchange.update({ where: { id: exchangeId }, data: { status: newStatus } });
    }
  }

  // ─── CRUD ────────────────────────────────────────────────────────────────────

  async findAll(filter: ExchangesFilter, user: JwtPayload) {
    const page = Math.max(1, parseInt(filter.page ?? '1', 10));
    const limit = Math.min(100, Math.max(1, parseInt(filter.limit ?? '20', 10)));
    const skip = (page - 1) * limit;

    const where: Prisma.ExchangeWhereInput = { deletedAt: null };

    if (user.role !== 'MANAGER') where.sectorId = user.sectorId ?? undefined;
    else if (filter.sectorId) where.sectorId = filter.sectorId;

    if (filter.status) where.status = filter.status as ExchangeStatus;
    if (filter.partnerId) where.partnerId = filter.partnerId;

    if (filter.dateFrom || filter.dateTo) {
      where.date = {};
      if (filter.dateFrom) where.date.gte = new Date(filter.dateFrom);
      if (filter.dateTo) where.date.lte = new Date(filter.dateTo);
    }

    const [data, total] = await Promise.all([
      this.prisma.exchange.findMany({
        where,
        skip,
        take: limit,
        select: EXCHANGE_SELECT,
        orderBy: { sequence: 'desc' },
      }),
      this.prisma.exchange.count({ where }),
    ]);

    const enriched = data.map((e) => ({
      ...e,
      ...this.computeBalance(e.outputs, e.inputs, e.tolerancePct),
    }));

    return { data: enriched, total, page, limit, totalPages: Math.ceil(total / limit) };
  }

  async findOne(id: string) {
    const exchange = await this.prisma.exchange.findFirst({
      where: { id, deletedAt: null },
      select: EXCHANGE_SELECT,
    });
    if (!exchange) throw new NotFoundException('Troca não encontrada');
    return { ...exchange, ...this.computeBalance(exchange.outputs, exchange.inputs, exchange.tolerancePct) };
  }

  async create(dto: CreateExchangeInput, user: JwtPayload) {
    return this.prisma.$transaction(async (tx) => {
      const setting = await tx.setting.findUniqueOrThrow({ where: { id: 'singleton' } });
      const newSeq = setting.exchangeSequence + 1;
      const code = `TRC-${String(newSeq).padStart(4, '0')}`;

      await tx.setting.update({
        where: { id: 'singleton' },
        data: { exchangeSequence: newSeq },
      });

      return tx.exchange.create({
        data: {
          code,
          sequence: newSeq,
          partnerId: dto.partnerId,
          sectorId: dto.sectorId,
          date: dto.date ? new Date(dto.date) : new Date(),
          justification: dto.justification,
          tolerancePct: Number(setting.exchangeTolerancePct),
          createdById: user.sub,
          status: ExchangeStatus.DRAFT,
        },
        select: EXCHANGE_SELECT,
      });
    });
  }

  async update(id: string, dto: UpdateExchangeInput, user: JwtPayload) {
    const exchange = await this.findOne(id);
    this.assertEditable(exchange.status);
    this.assertSectorAccess(exchange.sectorId, user);

    return this.prisma.exchange.update({
      where: { id },
      data: {
        ...(dto.partnerId && { partnerId: dto.partnerId }),
        ...(dto.justification && { justification: dto.justification }),
        ...(dto.date && { date: new Date(dto.date) }),
        status: ExchangeStatus.DRAFT,
      },
      select: EXCHANGE_SELECT,
    });
  }

  // ─── Outputs ─────────────────────────────────────────────────────────────────

  async addOutput(exchangeId: string, dto: AddExchangeOutputInput, user: JwtPayload) {
    return this.prisma.$transaction(async (tx) => {
      const exchange = await tx.exchange.findFirst({ where: { id: exchangeId, deletedAt: null } });
      if (!exchange) throw new NotFoundException('Troca não encontrada');
      this.assertEditable(exchange.status, 'editada');
      this.assertSectorAccess(exchange.sectorId, user);

      const item = await tx.item.findUniqueOrThrow({ where: { id: dto.itemId } });
      if (item.sectorId !== exchange.sectorId) {
        throw new BadRequestException('Item não pertence ao setor da troca');
      }

      const lot = await tx.lot.findUniqueOrThrow({ where: { id: dto.lotId } });
      if (lot.itemId !== dto.itemId) {
        throw new BadRequestException('Lote não pertence ao item informado');
      }
      if (Number(lot.currentBalance) < dto.quantity) {
        throw new BadRequestException(
          `Saldo insuficiente. Lote tem ${lot.currentBalance}, precisa de ${dto.quantity}`,
        );
      }

      const unitValue = dto.unitValue ?? Number(item.unitValue ?? 0);
      if (unitValue <= 0) {
        throw new BadRequestException(
          `Item ${item.code} não tem valor unitário cadastrado. Defina o valor antes de usar em trocas.`,
        );
      }

      const subtotal = dto.quantity * unitValue;
      const output = await tx.exchangeOutput.create({
        data: {
          exchangeId,
          itemId: dto.itemId,
          lotId: dto.lotId,
          quantity: dto.quantity,
          unitValue,
          subtotal,
          notes: dto.notes ?? null,
        },
        select: OUTPUT_SELECT,
      });

      if (exchange.status === ExchangeStatus.READY) {
        await tx.exchange.update({ where: { id: exchangeId }, data: { status: ExchangeStatus.DRAFT } });
      }

      return output;
    });
  }

  async updateOutput(exchangeId: string, outputId: string, dto: UpdateExchangeOutputInput, user: JwtPayload) {
    return this.prisma.$transaction(async (tx) => {
      const exchange = await tx.exchange.findFirst({ where: { id: exchangeId, deletedAt: null } });
      if (!exchange) throw new NotFoundException('Troca não encontrada');
      this.assertEditable(exchange.status, 'editada');
      this.assertSectorAccess(exchange.sectorId, user);

      const output = await tx.exchangeOutput.findUniqueOrThrow({ where: { id: outputId } });
      if (output.executedAt) throw new BadRequestException('Saída já executada, não pode ser editada');

      const quantity = dto.quantity ?? Number(output.quantity);
      const unitValue = dto.unitValue ?? Number(output.unitValue);
      const subtotal = quantity * unitValue;

      const lot = await tx.lot.findUniqueOrThrow({ where: { id: output.lotId } });
      if (Number(lot.currentBalance) < quantity) {
        throw new BadRequestException(`Saldo insuficiente. Lote tem ${lot.currentBalance}, precisa de ${quantity}`);
      }

      return tx.exchangeOutput.update({
        where: { id: outputId },
        data: { quantity, unitValue, subtotal, notes: dto.notes ?? output.notes },
        select: OUTPUT_SELECT,
      });
    });
  }

  async removeOutput(exchangeId: string, outputId: string, user: JwtPayload) {
    const exchange = await this.findOne(exchangeId);
    this.assertEditable(exchange.status, 'editada');
    this.assertSectorAccess(exchange.sectorId, user);

    const output = await this.prisma.exchangeOutput.findUniqueOrThrow({ where: { id: outputId } });
    if (output.executedAt) throw new BadRequestException('Saída já executada, não pode ser removida');

    await this.prisma.exchangeOutput.delete({ where: { id: outputId } });
  }

  // ─── Inputs ──────────────────────────────────────────────────────────────────

  async addInput(exchangeId: string, dto: AddExchangeInputInput, user: JwtPayload) {
    return this.prisma.$transaction(async (tx) => {
      const exchange = await tx.exchange.findFirst({ where: { id: exchangeId, deletedAt: null } });
      if (!exchange) throw new NotFoundException('Troca não encontrada');
      this.assertEditable(exchange.status, 'editada');
      this.assertSectorAccess(exchange.sectorId, user);

      await tx.item.findUniqueOrThrow({ where: { id: dto.itemId } });

      const subtotal = dto.quantity * dto.unitValue;
      return tx.exchangeInput.create({
        data: {
          exchangeId,
          itemId: dto.itemId,
          declaredLotNumber: dto.declaredLotNumber ?? null,
          declaredExpiration: dto.declaredExpiration ? new Date(dto.declaredExpiration) : null,
          quantity: dto.quantity,
          unitValue: dto.unitValue,
          subtotal,
          notes: dto.notes ?? null,
        },
        select: INPUT_SELECT,
      });
    });
  }

  async updateInput(exchangeId: string, inputId: string, dto: UpdateExchangeInputInput, user: JwtPayload) {
    const exchange = await this.findOne(exchangeId);
    this.assertEditable(exchange.status, 'editada');
    this.assertSectorAccess(exchange.sectorId, user);

    const input = await this.prisma.exchangeInput.findUniqueOrThrow({ where: { id: inputId } });
    if (input.executedAt) throw new BadRequestException('Entrada já executada, não pode ser editada');

    const quantity = dto.quantity ?? Number(input.quantity);
    const unitValue = dto.unitValue ?? Number(input.unitValue);
    const subtotal = quantity * unitValue;

    return this.prisma.exchangeInput.update({
      where: { id: inputId },
      data: {
        quantity,
        unitValue,
        subtotal,
        declaredLotNumber: dto.declaredLotNumber !== undefined ? dto.declaredLotNumber : input.declaredLotNumber,
        declaredExpiration: dto.declaredExpiration !== undefined
          ? (dto.declaredExpiration ? new Date(dto.declaredExpiration) : null)
          : input.declaredExpiration,
        notes: dto.notes !== undefined ? dto.notes : input.notes,
      },
      select: INPUT_SELECT,
    });
  }

  async removeInput(exchangeId: string, inputId: string, user: JwtPayload) {
    const exchange = await this.findOne(exchangeId);
    this.assertEditable(exchange.status, 'editada');
    this.assertSectorAccess(exchange.sectorId, user);

    const input = await this.prisma.exchangeInput.findUniqueOrThrow({ where: { id: inputId } });
    if (input.executedAt) throw new BadRequestException('Entrada já executada, não pode ser removida');

    await this.prisma.exchangeInput.delete({ where: { id: inputId } });
  }

  // ─── Fluxo de estado ─────────────────────────────────────────────────────────

  async checkBalance(exchangeId: string): Promise<BalanceResult> {
    const exchange = await this.prisma.exchange.findFirst({
      where: { id: exchangeId, deletedAt: null },
      include: { outputs: true, inputs: true },
    });
    if (!exchange) throw new NotFoundException('Troca não encontrada');
    return this.computeBalance(exchange.outputs, exchange.inputs, exchange.tolerancePct);
  }

  async markReady(exchangeId: string, user: JwtPayload) {
    return this.prisma.$transaction(async (tx) => {
      const exchange = await tx.exchange.findFirst({
        where: { id: exchangeId, deletedAt: null },
        include: { outputs: true, inputs: true },
      });
      if (!exchange) throw new NotFoundException('Troca não encontrada');

      if (exchange.status !== ExchangeStatus.DRAFT) {
        throw new BadRequestException('Troca não está em rascunho');
      }
      this.assertSectorAccess(exchange.sectorId, user);

      if (exchange.outputs.length === 0) throw new BadRequestException('Adicione pelo menos um item de saída');
      if (exchange.inputs.length === 0) throw new BadRequestException('Adicione pelo menos um item de entrada');

      const balance = this.computeBalance(exchange.outputs, exchange.inputs, exchange.tolerancePct);
      if (!balance.isBalanced) {
        throw new BadRequestException(
          `Balanço fora da tolerância de ${balance.tolerance}%. ` +
            `Diferença atual: ${balance.differencePct}% (R$ ${balance.difference.toFixed(2)})`,
        );
      }

      const setting = await tx.setting.findUniqueOrThrow({ where: { id: 'singleton' } });
      if (setting.requireExchangeApproval) {
        const threshold = Number(setting.exchangeApprovalThreshold);
        if (balance.totalOutput >= threshold) {
          return tx.exchange.update({
            where: { id: exchangeId },
            data: { status: ExchangeStatus.PENDING },
            select: EXCHANGE_SELECT,
          });
        }
      }

      return tx.exchange.update({
        where: { id: exchangeId },
        data: { status: ExchangeStatus.READY },
        select: EXCHANGE_SELECT,
      });
    });
  }

  async approve(exchangeId: string, user: JwtPayload) {
    if (user.role !== 'MANAGER') throw new ForbiddenException('Somente MANAGER pode aprovar trocas');
    const exchange = await this.findOne(exchangeId);
    if (exchange.status !== ExchangeStatus.PENDING) {
      throw new BadRequestException('Troca não está pendente de aprovação');
    }
    return this.prisma.exchange.update({
      where: { id: exchangeId },
      data: { status: ExchangeStatus.APPROVED, approvedById: user.sub, approvedAt: new Date() },
      select: EXCHANGE_SELECT,
    });
  }

  async reject(exchangeId: string, reason: string, user: JwtPayload) {
    if (user.role !== 'MANAGER') throw new ForbiddenException('Somente MANAGER pode rejeitar trocas');
    const exchange = await this.findOne(exchangeId);
    if (exchange.status !== ExchangeStatus.PENDING) {
      throw new BadRequestException('Troca não está pendente de aprovação');
    }
    return this.prisma.exchange.update({
      where: { id: exchangeId },
      data: {
        status: ExchangeStatus.REJECTED,
        rejectionReason: reason,
        approvedById: user.sub,
        approvedAt: new Date(),
      },
      select: EXCHANGE_SELECT,
    });
  }

  async cancel(exchangeId: string, reason: string, user: JwtPayload) {
    const exchange = await this.findOne(exchangeId);
    this.assertSectorAccess(exchange.sectorId, user);

    const cancellableStatuses = [
      ExchangeStatus.DRAFT,
      ExchangeStatus.READY,
      ExchangeStatus.PENDING,
      ExchangeStatus.APPROVED,
    ];
    if (!cancellableStatuses.includes(exchange.status as ExchangeStatus)) {
      throw new BadRequestException('Troca não pode ser cancelada — já iniciou execução');
    }
    const hasExecuted = [...exchange.outputs, ...exchange.inputs].some((r) => r.executedAt !== null);
    if (hasExecuted) {
      throw new ConflictException('Troca não pode ser cancelada — já tem registros executados');
    }

    return this.prisma.exchange.update({
      where: { id: exchangeId },
      data: {
        status: ExchangeStatus.CANCELLED,
        cancelledAt: new Date(),
        cancellationReason: reason,
      },
      select: EXCHANGE_SELECT,
    });
  }

  // ─── Execução ────────────────────────────────────────────────────────────────

  async executeOutput(exchangeId: string, outputId: string, user: JwtPayload) {
    return this.prisma.$transaction(async (tx) => {
      const exchange = await tx.exchange.findFirst({ where: { id: exchangeId, deletedAt: null } });
      if (!exchange) throw new NotFoundException('Troca não encontrada');
      this.assertSectorAccess(exchange.sectorId, user);

      const executionStatuses = [ExchangeStatus.READY, ExchangeStatus.EXECUTED, ExchangeStatus.APPROVED];
      if (!executionStatuses.includes(exchange.status as ExchangeStatus)) {
        throw new BadRequestException('Troca não está pronta para execução');
      }

      const output = await tx.exchangeOutput.findUniqueOrThrow({ where: { id: outputId } });
      if (output.exchangeId !== exchangeId) throw new BadRequestException('Saída não pertence a esta troca');
      if (output.executedAt) throw new BadRequestException('Saída já foi executada');

      const movement = await this.createMovementInTx(tx, {
        type: 'EXIT_EXCHANGE',
        itemId: output.itemId,
        lotId: output.lotId,
        sectorId: exchange.sectorId,
        quantity: output.quantity,
        unitValue: output.unitValue,
        partnerExchangeId: exchangeId,
        reason: `Troca ${exchange.code} — saída`,
        createdById: user.sub,
      });

      await tx.exchangeOutput.update({
        where: { id: outputId },
        data: { executedAt: new Date(), movementId: movement.id },
      });

      await this.updateExchangeStatus(tx, exchangeId);

      return movement;
    });
  }

  async executeInput(exchangeId: string, inputId: string, user: JwtPayload) {
    return this.prisma.$transaction(async (tx) => {
      const exchange = await tx.exchange.findFirst({ where: { id: exchangeId, deletedAt: null } });
      if (!exchange) throw new NotFoundException('Troca não encontrada');
      this.assertSectorAccess(exchange.sectorId, user);

      const executionStatuses = [ExchangeStatus.READY, ExchangeStatus.EXECUTED, ExchangeStatus.APPROVED];
      if (!executionStatuses.includes(exchange.status as ExchangeStatus)) {
        throw new BadRequestException('Troca não está pronta para execução');
      }

      const input = await tx.exchangeInput.findUniqueOrThrow({ where: { id: inputId } });
      if (input.exchangeId !== exchangeId) throw new BadRequestException('Entrada não pertence a esta troca');
      if (input.executedAt) throw new BadRequestException('Entrada já foi executada');

      let lotId: string;

      if (input.lotId) {
        lotId = input.lotId;
        const lot = await tx.lot.findUniqueOrThrow({ where: { id: lotId } });
        await tx.lot.update({ where: { id: lotId }, data: { currentBalance: { increment: input.quantity } } });
        const movement = await tx.movement.create({
          data: {
            type: 'ENTRY_EXCHANGE',
            itemId: input.itemId,
            lotId,
            sectorId: exchange.sectorId,
            quantity: Number(input.quantity),
            unitValue: Number(input.unitValue),
            balanceAfter: Number(lot.currentBalance) + Number(input.quantity),
            partnerExchangeId: exchangeId,
            reason: `Troca ${exchange.code} — entrada`,
            createdById: user.sub,
          },
        });
        await tx.exchangeInput.update({ where: { id: inputId }, data: { executedAt: new Date(), movementId: movement.id, lotId } });
        await this.updateExchangeStatus(tx, exchangeId);
        return movement;
      }

      if (!input.declaredLotNumber) {
        throw new BadRequestException('Antes de executar a entrada, informe o número do lote recebido');
      }

      const existing = await tx.lot.findFirst({
        where: { itemId: input.itemId, lotNumber: input.declaredLotNumber, deletedAt: null },
      });

      if (existing) {
        lotId = existing.id;
        const newBalance = Number(existing.currentBalance) + Number(input.quantity);
        await tx.lot.update({ where: { id: lotId }, data: { currentBalance: newBalance } });

        const movement = await tx.movement.create({
          data: {
            type: 'ENTRY_EXCHANGE',
            itemId: input.itemId,
            lotId,
            sectorId: exchange.sectorId,
            quantity: Number(input.quantity),
            unitValue: Number(input.unitValue),
            balanceAfter: newBalance,
            partnerExchangeId: exchangeId,
            reason: `Troca ${exchange.code} — entrada`,
            createdById: user.sub,
          },
        });

        await tx.exchangeInput.update({ where: { id: inputId }, data: { executedAt: new Date(), movementId: movement.id, lotId } });
        await this.updateExchangeStatus(tx, exchangeId);
        return movement;
      }

      if (!input.declaredExpiration) {
        throw new BadRequestException('Para criar lote novo, declare a data de validade');
      }

      const newLot = await tx.lot.create({
        data: {
          itemId: input.itemId,
          lotNumber: input.declaredLotNumber,
          expirationDate: input.declaredExpiration,
          initialQuantity: Number(input.quantity),
          currentBalance: Number(input.quantity),
          supplier: `Troca ${exchange.code}`,
          unitCost: Number(input.unitValue),
        },
      });
      lotId = newLot.id;

      const movement = await tx.movement.create({
        data: {
          type: 'ENTRY_EXCHANGE',
          itemId: input.itemId,
          lotId,
          sectorId: exchange.sectorId,
          quantity: Number(input.quantity),
          unitValue: Number(input.unitValue),
          balanceAfter: Number(input.quantity),
          partnerExchangeId: exchangeId,
          reason: `Troca ${exchange.code} — entrada (lote novo)`,
          createdById: user.sub,
        },
      });

      await tx.exchangeInput.update({ where: { id: inputId }, data: { executedAt: new Date(), movementId: movement.id, lotId } });
      await this.updateExchangeStatus(tx, exchangeId);
      return movement;
    });
  }

  async executeAll(exchangeId: string, user: JwtPayload) {
    const exchange = await this.findOne(exchangeId);
    this.assertSectorAccess(exchange.sectorId, user);

    const pendingOutputs = exchange.outputs.filter((o) => !o.executedAt);
    const pendingInputs = exchange.inputs.filter((i) => !i.executedAt);

    const results: unknown[] = [];

    for (const output of pendingOutputs) {
      const m = await this.executeOutput(exchangeId, output.id, user);
      results.push({ type: 'output', movementId: m.id });
    }

    for (const input of pendingInputs) {
      const m = await this.executeInput(exchangeId, input.id, user);
      results.push({ type: 'input', movementId: m.id });
    }

    return { executed: results.length, details: results };
  }
}
