import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  BadRequestException,
  UnprocessableEntityException,
} from '@nestjs/common';
import * as XLSX from 'xlsx';
import { PrismaService } from '../../common/prisma/prisma.service';
import { ItemCategory } from '@prisma/client';
import type { CreateItemInput, UpdateItemInput, JwtPayload } from '@farmagest/shared';

const ITEM_SELECT = {
  id: true,
  code: true,
  description: true,
  category: true,
  unitOfMeasure: true,
  manufacturer: true,
  controlled344: true,
  active: true,
  sectorId: true,
  sector: { select: { id: true, name: true, code: true } },
  createdAt: true,
  updatedAt: true,
} as const;

export interface ItemsFilter {
  search?: string;
  category?: string;
  controlled344?: string;
  active?: string;
  sectorId?: string;
  page?: string;
  limit?: string;
}

@Injectable()
export class ItemsService {
  constructor(private prisma: PrismaService) {}

  async findAll(filter: ItemsFilter, user: JwtPayload) {
    const page = Math.max(1, parseInt(filter.page ?? '1', 10));
    const limit = Math.min(100, Math.max(1, parseInt(filter.limit ?? '20', 10)));
    const skip = (page - 1) * limit;

    const where: Record<string, unknown> = { deletedAt: null };

    if (filter.search) {
      where.OR = [
        { code: { contains: filter.search, mode: 'insensitive' } },
        { description: { contains: filter.search, mode: 'insensitive' } },
        { manufacturer: { contains: filter.search, mode: 'insensitive' } },
      ];
    }
    if (filter.category) where.category = filter.category;
    if (filter.controlled344 !== undefined) where.controlled344 = filter.controlled344 === 'true';
    if (filter.active !== undefined) where.active = filter.active === 'true';

    if (user.role !== 'MANAGER') {
      where.sectorId = user.sectorId;
    } else if (filter.sectorId) {
      where.sectorId = filter.sectorId;
    }

    const [data, total] = await Promise.all([
      this.prisma.item.findMany({
        where,
        skip,
        take: limit,
        select: ITEM_SELECT,
        orderBy: { code: 'asc' },
      }),
      this.prisma.item.count({ where }),
    ]);

    return { data, total, page, limit, totalPages: Math.ceil(total / limit) };
  }

  async findOne(id: string, user: JwtPayload) {
    const item = await this.prisma.item.findFirst({
      where: { id, deletedAt: null },
      select: ITEM_SELECT,
    });
    if (!item) throw new NotFoundException('Item não encontrado');

    if (user.role !== 'MANAGER' && item.sectorId !== user.sectorId) {
      throw new ForbiddenException('Item pertence a outro setor');
    }

    return item;
  }

  async create(dto: CreateItemInput, user: JwtPayload) {
    this.validateSectorAccess(dto.sectorId, user);

    return this.prisma.$transaction(async (tx) => {
      const sector = await tx.sector.findUnique({
        where: { id: dto.sectorId },
        select: { id: true, code: true, itemSequence: true, active: true },
      });
      if (!sector) throw new NotFoundException('Setor não encontrado');
      if (!sector.active) throw new BadRequestException('Setor está inativo');

      const newSequence = sector.itemSequence + 1;
      const code = `${sector.code}-${String(newSequence).padStart(4, '0')}`;

      await tx.sector.update({
        where: { id: sector.id },
        data: { itemSequence: newSequence },
      });

      return tx.item.create({
        data: { ...dto, code, sequence: newSequence },
        select: ITEM_SELECT,
      });
    });
  }

  async update(id: string, dto: UpdateItemInput, user: JwtPayload) {
    const item = await this.findOne(id, user);

    if (user.role !== 'MANAGER' && user.role !== 'COORDINATION') {
      if (user.role === 'ADMIN' && item.sectorId !== user.sectorId) {
        throw new ForbiddenException('Sem permissão para editar este item');
      }
    }

    return this.prisma.item.update({ where: { id }, data: dto, select: ITEM_SELECT });
  }

  async remove(id: string, user: JwtPayload) {
    const item = await this.findOne(id, user);

    if (!['COORDINATION', 'MANAGER'].includes(user.role)) {
      throw new ForbiddenException('Apenas COORDINATION e MANAGER podem desativar itens');
    }
    if (user.role === 'COORDINATION' && item.sectorId !== user.sectorId) {
      throw new ForbiddenException('Item pertence a outro setor');
    }

    return this.prisma.item.update({
      where: { id },
      data: { deletedAt: new Date(), active: false },
    });
  }

  async importFromFile(
    fileBuffer: Buffer,
    sectorId: string,
    user: JwtPayload,
  ): Promise<{ imported: number; codes: string[] }> {
    this.validateSectorAccess(sectorId, user);

    const workbook = XLSX.read(fileBuffer, { type: 'buffer' });
    const sheet = workbook.Sheets[workbook.SheetNames[0]];
    const rows: Record<string, unknown>[] = XLSX.utils.sheet_to_json(sheet);

    if (rows.length === 0) throw new BadRequestException('Planilha vazia');
    if (rows.length > 500) throw new BadRequestException('Máximo de 500 itens por importação');

    const VALID_CATEGORIES = ['MEDICATION', 'CORRELATE'];
    const errors: string[] = [];

    const parsed: Array<{ description: string; category: ItemCategory; unitOfMeasure: string; manufacturer: string | null; controlled344: boolean }> = [];

    for (let i = 0; i < rows.length; i++) {
      const row = rows[i];
      const rowNum = i + 2; // 1-indexed + header
      const desc = String(row['descricao'] ?? '').trim();
      const cat = String(row['categoria'] ?? '').trim().toUpperCase();
      const unit = String(row['unidade'] ?? '').trim();
      const manufacturer = row['fabricante'] ? String(row['fabricante']).trim() : null;
      const ctrl344Raw = String(row['controlado_344'] ?? 'NAO').trim().toUpperCase();

      if (!desc) { errors.push(`Linha ${rowNum}: descrição obrigatória`); continue; }
      if (desc.length > 200) { errors.push(`Linha ${rowNum}: descrição excede 200 caracteres`); continue; }
      if (!VALID_CATEGORIES.includes(cat)) { errors.push(`Linha ${rowNum}: categoria inválida "${row['categoria']}" (use MEDICATION ou CORRELATE)`); continue; }
      if (!unit) { errors.push(`Linha ${rowNum}: unidade obrigatória`); continue; }

      const controlled344 = ['SIM', 'TRUE', '1', 'YES'].includes(ctrl344Raw);

      parsed.push({
        description: desc,
        category: cat as ItemCategory,
        unitOfMeasure: unit,
        manufacturer: manufacturer || null,
        controlled344,
      });
    }

    if (errors.length > 0) {
      throw new UnprocessableEntityException({ errors, message: 'Planilha contém erros' });
    }

    return this.prisma.$transaction(async (tx) => {
      const sector = await tx.sector.findUnique({
        where: { id: sectorId },
        select: { id: true, code: true, itemSequence: true, active: true },
      });
      if (!sector) throw new NotFoundException('Setor não encontrado');
      if (!sector.active) throw new BadRequestException('Setor está inativo');

      const codes: string[] = [];
      let seq = sector.itemSequence;

      for (const item of parsed) {
        seq++;
        const code = `${sector.code}-${String(seq).padStart(4, '0')}`;
        await tx.item.create({
          data: { ...item, code, sequence: seq, sectorId },
        });
        codes.push(code);
      }

      await tx.sector.update({ where: { id: sectorId }, data: { itemSequence: seq } });

      return { imported: parsed.length, codes };
    });
  }

  buildTemplate(): Buffer {
    const data = [
      ['descricao', 'categoria', 'unidade', 'fabricante', 'controlado_344'],
      ['Dipirona 500mg cp', 'MEDICATION', 'cp', 'EMS', 'NAO'],
      ['Diazepam 10mg cp', 'MEDICATION', 'cp', 'EMS', 'SIM'],
      ['Seringa descartável 5ml', 'CORRELATE', 'un', 'BD', 'NAO'],
    ];
    const ws = XLSX.utils.aoa_to_sheet(data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Importação');
    return XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' }) as Buffer;
  }

  private validateSectorAccess(sectorId: string, user: JwtPayload): void {
    if (user.role === 'MANAGER') return;

    if (['COORDINATION', 'ADMIN'].includes(user.role)) {
      if (user.sectorId !== sectorId) {
        throw new ForbiddenException('Você só pode criar itens no seu próprio setor');
      }
      return;
    }

    throw new ForbiddenException('Seu perfil não pode criar itens');
  }
}
