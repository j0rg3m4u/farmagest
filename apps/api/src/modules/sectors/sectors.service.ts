import {
  Injectable,
  NotFoundException,
  ConflictException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../../common/prisma/prisma.service';
import type { CreateSectorInput, UpdateSectorInput } from '@farmagest/shared';

const SECTOR_SELECT = {
  id: true,
  name: true,
  code: true,
  responsible: true,
  description: true,
  active: true,
  createdAt: true,
  updatedAt: true,
} as const;

export interface SectorsFilter {
  active?: string;
  search?: string;
  page?: string;
  limit?: string;
}

@Injectable()
export class SectorsService {
  constructor(private prisma: PrismaService) {}

  async findAll(filter: SectorsFilter) {
    const page = Math.max(1, parseInt(filter.page ?? '1', 10));
    const limit = Math.min(100, Math.max(1, parseInt(filter.limit ?? '20', 10)));
    const skip = (page - 1) * limit;

    const where: Record<string, unknown> = { deletedAt: null };
    if (filter.active !== undefined) where.active = filter.active === 'true';
    if (filter.search) {
      where.OR = [
        { name: { contains: filter.search, mode: 'insensitive' } },
        { code: { contains: filter.search, mode: 'insensitive' } },
        { responsible: { contains: filter.search, mode: 'insensitive' } },
      ];
    }

    const [data, total] = await Promise.all([
      this.prisma.sector.findMany({
        where,
        skip,
        take: limit,
        select: SECTOR_SELECT,
        orderBy: { name: 'asc' },
      }),
      this.prisma.sector.count({ where }),
    ]);

    return { data, total, page, limit, totalPages: Math.ceil(total / limit) };
  }

  async findOne(id: string) {
    const sector = await this.prisma.sector.findFirst({
      where: { id, deletedAt: null },
      select: SECTOR_SELECT,
    });
    if (!sector) throw new NotFoundException('Setor não encontrado');
    return sector;
  }

  async create(dto: CreateSectorInput) {
    const existing = await this.prisma.sector.findFirst({
      where: { OR: [{ name: dto.name }, { code: dto.code }], deletedAt: null },
    });
    if (existing) {
      throw new ConflictException(
        existing.name === dto.name ? 'Nome já cadastrado' : 'Código já cadastrado',
      );
    }

    return this.prisma.sector.create({ data: dto, select: SECTOR_SELECT });
  }

  async update(id: string, dto: UpdateSectorInput) {
    await this.findOne(id);

    if (dto.name) {
      const conflict = await this.prisma.sector.findFirst({
        where: { AND: [{ id: { not: id } }, { deletedAt: null }, { name: dto.name }] },
      });
      if (conflict) {
        throw new ConflictException('Nome já cadastrado');
      }
    }

    return this.prisma.sector.update({ where: { id }, data: dto, select: SECTOR_SELECT });
  }

  async remove(id: string) {
    await this.findOne(id);

    const activeUsers = await this.prisma.user.count({
      where: { sectorId: id, deletedAt: null, active: true },
    });
    if (activeUsers > 0) {
      throw new BadRequestException('Não é possível excluir setor com usuários ativos');
    }

    return this.prisma.sector.update({
      where: { id },
      data: { deletedAt: new Date(), active: false },
    });
  }
}
