import {
  Injectable,
  NotFoundException,
  ConflictException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../../common/prisma/prisma.service';
import type { CreateExternalPartnerInput, UpdateExternalPartnerInput } from '@farmagest/shared';

const PARTNER_SELECT = {
  id: true,
  name: true,
  cnpj: true,
  responsibleName: true,
  contact: true,
  notes: true,
  active: true,
  createdAt: true,
  updatedAt: true,
} as const;

export interface PartnersFilter {
  search?: string;
  active?: string;
  page?: string;
  limit?: string;
}

@Injectable()
export class ExternalPartnersService {
  constructor(private prisma: PrismaService) {}

  async findAll(filter: PartnersFilter) {
    const page = Math.max(1, parseInt(filter.page ?? '1', 10));
    const limit = Math.min(100, Math.max(1, parseInt(filter.limit ?? '20', 10)));
    const skip = (page - 1) * limit;

    const where: Record<string, unknown> = { deletedAt: null };
    if (filter.active !== undefined) where.active = filter.active === 'true';
    if (filter.search) {
      where.OR = [
        { name: { contains: filter.search, mode: 'insensitive' } },
        { responsibleName: { contains: filter.search, mode: 'insensitive' } },
      ];
    }

    const [data, total] = await Promise.all([
      this.prisma.externalPartner.findMany({
        where,
        skip,
        take: limit,
        select: PARTNER_SELECT,
        orderBy: { name: 'asc' },
      }),
      this.prisma.externalPartner.count({ where }),
    ]);

    return { data, total, page, limit, totalPages: Math.ceil(total / limit) };
  }

  async findOne(id: string) {
    const partner = await this.prisma.externalPartner.findFirst({
      where: { id, deletedAt: null },
      select: PARTNER_SELECT,
    });
    if (!partner) throw new NotFoundException('Município parceiro não encontrado');
    return partner;
  }

  async create(dto: CreateExternalPartnerInput) {
    const existing = await this.prisma.externalPartner.findFirst({
      where: { name: dto.name, deletedAt: null },
    });
    if (existing) throw new ConflictException('Município já cadastrado');

    return this.prisma.externalPartner.create({ data: dto, select: PARTNER_SELECT });
  }

  async update(id: string, dto: UpdateExternalPartnerInput) {
    await this.findOne(id);

    if (dto.name) {
      const conflict = await this.prisma.externalPartner.findFirst({
        where: { name: dto.name, deletedAt: null, id: { not: id } },
      });
      if (conflict) throw new ConflictException('Nome já cadastrado');
    }

    return this.prisma.externalPartner.update({
      where: { id },
      data: dto,
      select: PARTNER_SELECT,
    });
  }

  async remove(id: string) {
    await this.findOne(id);

    const activeExchanges = await this.prisma.exchange.count({
      where: { partnerId: id, deletedAt: null, status: { notIn: ['CANCELLED', 'COMPLETED'] } },
    });
    if (activeExchanges > 0) {
      throw new BadRequestException('Não é possível excluir município com trocas ativas');
    }

    return this.prisma.externalPartner.update({
      where: { id },
      data: { deletedAt: new Date(), active: false },
    });
  }
}
