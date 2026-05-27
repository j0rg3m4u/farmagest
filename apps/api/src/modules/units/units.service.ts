import {
  Injectable,
  NotFoundException,
  ConflictException,
  BadRequestException,
  UnprocessableEntityException,
} from '@nestjs/common';
import * as XLSX from 'xlsx';
import { PrismaService } from '../../common/prisma/prisma.service';
import { UnitType } from '@farmagest/shared';
import type { CreateUnitInput, UpdateUnitInput } from '@farmagest/shared';
import { inferUnitType } from './utils/infer-unit-type';

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

  async importFromFile(
    fileBuffer: Buffer,
    mode: 'list' | 'matrix',
    matrixOptions?: { headerRow?: number; startColumn?: number; endColumn?: number },
  ): Promise<{ imported: number; units: { id: string; name: string; type: UnitType }[] }> {
    const workbook = XLSX.read(fileBuffer, { type: 'buffer' });
    const sheet = workbook.Sheets[workbook.SheetNames[0]];

    if (mode === 'matrix') {
      return this.importMatrix(sheet, matrixOptions ?? {});
    }
    return this.importList(sheet);
  }

  private async importList(sheet: XLSX.WorkSheet) {
    const rows: Record<string, unknown>[] = XLSX.utils.sheet_to_json(sheet);
    if (rows.length === 0) throw new BadRequestException('Planilha vazia');
    if (rows.length > 500) throw new BadRequestException('Máximo de 500 unidades por importação');

    const VALID_TYPES = Object.values(UnitType);
    const errors: string[] = [];
    const parsed: CreateUnitInput[] = [];

    for (let i = 0; i < rows.length; i++) {
      const row = rows[i];
      const rowNum = i + 2;
      const name = String(row['nome'] ?? '').trim();
      const type = String(row['tipo'] ?? '').trim().toUpperCase();
      const responsible = String(row['responsavel'] ?? '').trim();
      const address = row['endereco'] ? String(row['endereco']).trim() : null;
      const contact = row['contato'] ? String(row['contato']).trim() : null;

      if (!name) { errors.push(`Linha ${rowNum}: nome obrigatório`); continue; }
      if (name.length > 180) { errors.push(`Linha ${rowNum}: nome excede 180 caracteres`); continue; }
      if (!VALID_TYPES.includes(type as UnitType)) { errors.push(`Linha ${rowNum}: tipo inválido "${row['tipo']}" (use UBS, UPA, HOSPITAL, CAPS, OTHER)`); continue; }
      if (!responsible) { errors.push(`Linha ${rowNum}: responsavel obrigatório`); continue; }

      parsed.push({ name, type: type as UnitType, responsible, address: address || null, contact: contact || null });
    }

    if (errors.length > 0) throw new UnprocessableEntityException({ errors, message: 'Planilha contém erros' });

    return this.prisma.$transaction(async (tx) => {
      const created: { id: string; name: string; type: UnitType }[] = [];
      for (const dto of parsed) {
        const unit = await tx.unit.create({ data: dto });
        created.push({ id: unit.id, name: unit.name, type: unit.type as UnitType });
      }
      return { imported: created.length, units: created };
    });
  }

  private async importMatrix(
    sheet: XLSX.WorkSheet,
    opts: { headerRow?: number; startColumn?: number; endColumn?: number },
  ) {
    const headerRowIdx = (opts.headerRow ?? 1) - 1;
    const startColIdx = (opts.startColumn ?? 3) - 1;

    const range = XLSX.utils.decode_range(sheet['!ref'] ?? 'A1');
    const endColIdx = opts.endColumn != null ? opts.endColumn - 1 : range.e.c;

    const names: string[] = [];
    for (let c = startColIdx; c <= endColIdx; c++) {
      const addr = XLSX.utils.encode_cell({ r: headerRowIdx, c });
      const cell = sheet[addr];
      if (!cell) continue;
      const val = String(cell.v ?? '').trim().replace(/\s+/g, ' ');
      if (val) names.push(val);
    }

    if (names.length === 0) throw new BadRequestException('Nenhuma unidade encontrada no cabeçalho');
    if (names.length > 500) throw new BadRequestException('Máximo de 500 unidades por importação');

    return this.prisma.$transaction(async (tx) => {
      const created: { id: string; name: string; type: UnitType }[] = [];
      for (const name of names) {
        const type = inferUnitType(name);
        const unit = await tx.unit.create({
          data: { name, type, responsible: 'A definir', address: null, contact: null },
        });
        created.push({ id: unit.id, name: unit.name, type: unit.type as UnitType });
      }
      return { imported: created.length, units: created };
    });
  }

  buildListTemplate(): Buffer {
    const data = [
      ['nome', 'tipo', 'responsavel', 'endereco', 'contato'],
      ['UBS Jardim Primavera', 'UBS', 'Dr. João Silva', 'Rua das Flores, 100', '(21) 99999-0001'],
      ['UPA Saracuruna', 'UPA', 'Dra. Maria Santos', 'Av. Principal, 200', '(21) 99999-0002'],
      ['Hospital São Lucas', 'HOSPITAL', 'Dr. Carlos Souza', 'Rua do Hospital, 50', null],
    ];
    const ws = XLSX.utils.aoa_to_sheet(data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Unidades');
    return XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' }) as Buffer;
  }
}
