import {
  Injectable,
  NotFoundException,
  ConflictException,
} from '@nestjs/common';
import { PrismaService } from '../../common/prisma/prisma.service';
import type { CreateUnitInput, UpdateUnitInput } from '@farmagest/shared';

export interface UnitsFilter {
  type?: string;
  active?: string;
  search?: string;
  page?: string;
  limit?: string;
}

@Injectable()
export class UnitsService {
  constructor(private prisma: PrismaService) {}

  async findAll(filter: UnitsFilter) {
    const page = Math.max(1, parseInt(filter.page ?? '1', 10));
    const limit = Math.min(100, Math.max(1, parseInt(filter.limit ?? '20', 10)));
    const skip = (page - 1) * limit;

    const where: Record<string, unknown> = { deletedAt: null };
    if (filter.type) where.type = filter.type;
    if (filter.active !== undefined) where.active = filter.active === 'true';
    if (filter.search) {
      where.name = { contains: filter.search, mode: 'insensitive' };
    }

    const [data, total] = await Promise.all([
      this.prisma.unit.findMany({ where, skip, take: limit, orderBy: { name: 'asc' } }),
      this.prisma.unit.count({ where }),
    ]);

    return { data, total, page, limit, totalPages: Math.ceil(total / limit) };
  }

  async findOne(id: string) {
    const unit = await this.prisma.unit.findFirst({ where: { id, deletedAt: null } });
    if (!unit) throw new NotFoundException('Unidade não encontrada');
    return unit;
  }

  async create(dto: CreateUnitInput) {
    return this.prisma.unit.create({ data: dto });
  }

  async update(id: string, dto: UpdateUnitInput) {
    await this.findOne(id);
    return this.prisma.unit.update({ where: { id }, data: dto });
  }

  async remove(id: string) {
    await this.findOne(id);

    const activeUsers = await this.prisma.user.count({
      where: { unitId: id, active: true },
    });

    if (activeUsers > 0) {
      throw new ConflictException(
        `Não é possível excluir: ${activeUsers} usuário(s) ativo(s) vinculado(s) a esta unidade`,
      );
    }

    return this.prisma.unit.update({
      where: { id },
      data: { deletedAt: new Date(), active: false },
    });
  }
}
