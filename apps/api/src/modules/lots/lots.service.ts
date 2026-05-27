import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  ConflictException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../../common/prisma/prisma.service';
import type { CreateLotInput, UpdateLotInput, JwtPayload } from '@farmagest/shared';

const LOT_SELECT = {
  id: true,
  itemId: true,
  lotNumber: true,
  manufacturingDate: true,
  expirationDate: true,
  initialQuantity: true,
  currentBalance: true,
  supplier: true,
  invoiceNumber: true,
  notes: true,
  active: true,
  createdAt: true,
  updatedAt: true,
} as const;

export interface LotsFilter {
  active?: string;
  page?: string;
  limit?: string;
}

@Injectable()
export class LotsService {
  constructor(private prisma: PrismaService) {}

  private async resolveItemSector(itemId: string): Promise<string> {
    const item = await this.prisma.item.findFirst({
      where: { id: itemId, deletedAt: null },
      select: { sectorId: true, active: true },
    });
    if (!item) throw new NotFoundException('Item não encontrado');
    if (!item.active) throw new BadRequestException('Item está inativo');
    return item.sectorId;
  }

  private validateSectorAccess(sectorId: string, user: JwtPayload): void {
    if (user.role === 'MANAGER') return;
    if (user.sectorId !== sectorId) {
      throw new ForbiddenException('Item pertence a outro setor');
    }
  }

  async listByItem(itemId: string, filter: LotsFilter, user: JwtPayload) {
    const sectorId = await this.resolveItemSector(itemId);
    this.validateSectorAccess(sectorId, user);

    const page = Math.max(1, parseInt(filter.page ?? '1', 10));
    const limit = Math.min(100, Math.max(1, parseInt(filter.limit ?? '50', 10)));
    const skip = (page - 1) * limit;

    const where: Record<string, unknown> = { itemId, deletedAt: null };
    if (filter.active !== undefined) where.active = filter.active === 'true';

    const [data, total] = await Promise.all([
      this.prisma.lot.findMany({
        where,
        skip,
        take: limit,
        select: LOT_SELECT,
        orderBy: { expirationDate: 'asc' },
      }),
      this.prisma.lot.count({ where }),
    ]);

    return { data, total, page, limit, totalPages: Math.ceil(total / limit) };
  }

  async findOne(id: string, user: JwtPayload) {
    const lot = await this.prisma.lot.findFirst({
      where: { id, deletedAt: null },
      select: { ...LOT_SELECT, item: { select: { sectorId: true } } },
    });
    if (!lot) throw new NotFoundException('Lote não encontrado');
    this.validateSectorAccess(lot.item.sectorId, user);
    const { item: _, ...rest } = lot;
    return rest;
  }

  async create(itemId: string, dto: CreateLotInput, user: JwtPayload) {
    if (dto.itemId !== itemId) {
      throw new BadRequestException('itemId na URL e no body não conferem');
    }

    const sectorId = await this.resolveItemSector(itemId);

    if (!['COORDINATION', 'ADMIN', 'MANAGER'].includes(user.role)) {
      throw new ForbiddenException('Seu perfil não pode criar lotes');
    }
    this.validateSectorAccess(sectorId, user);

    const existing = await this.prisma.lot.findFirst({
      where: { itemId, lotNumber: dto.lotNumber, deletedAt: null },
    });
    if (existing) throw new ConflictException('Número de lote já cadastrado para este item');

    const { initialQuantity, ...rest } = dto;

    return this.prisma.lot.create({
      data: {
        ...rest,
        initialQuantity,
        currentBalance: initialQuantity,
        manufacturingDate: dto.manufacturingDate ? new Date(dto.manufacturingDate) : null,
        expirationDate: new Date(dto.expirationDate),
      },
      select: LOT_SELECT,
    });
  }

  async update(id: string, dto: UpdateLotInput, user: JwtPayload) {
    await this.findOne(id, user);

    if (!['COORDINATION', 'ADMIN', 'MANAGER'].includes(user.role)) {
      throw new ForbiddenException('Seu perfil não pode editar lotes');
    }

    return this.prisma.lot.update({ where: { id }, data: dto, select: LOT_SELECT });
  }

  async remove(id: string, user: JwtPayload) {
    const lot = await this.findOne(id, user);

    if (!['COORDINATION', 'MANAGER'].includes(user.role)) {
      throw new ForbiddenException('Apenas COORDINATION e MANAGER podem excluir lotes');
    }

    if (Number(lot.currentBalance) !== 0) {
      throw new BadRequestException('Lote só pode ser excluído com saldo zerado');
    }

    return this.prisma.lot.update({
      where: { id },
      data: { deletedAt: new Date(), active: false },
    });
  }
}
