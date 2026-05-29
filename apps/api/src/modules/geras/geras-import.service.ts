import { Injectable, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../common/prisma/prisma.service';
import { GerasService } from './geras.service';
import { parseGeraPdf, type GeraHeaderParsed } from './parsers/gera-pdf.parser';
import { GeraType } from '@farmagest/shared';
import type { JwtPayload } from '@farmagest/shared';

// Jaccard similarity — igual ao usado na Sprint 2.1
function jaccardSimilarity(a: string, b: string): number {
  const tokenize = (s: string) =>
    new Set(s.toLowerCase().replace(/[^a-z0-9]/g, ' ').split(/\s+/).filter(Boolean));
  const sa = tokenize(a);
  const sb = tokenize(b);
  const intersection = new Set([...sa].filter((x) => sb.has(x)));
  const union = new Set([...sa, ...sb]);
  return union.size === 0 ? 0 : intersection.size / union.size;
}

function mapTypeString(t: string | null): GeraType {
  if (!t) return GeraType.MONTHLY;
  const lower = t.toLowerCase();
  if (lower.includes('extraordin')) return GeraType.EXTRAORDINARY;
  if (lower.includes('urgent')) return GeraType.URGENT;
  return GeraType.MONTHLY;
}

@Injectable()
export class GerasImportService {
  constructor(
    private prisma: PrismaService,
    private gerasService: GerasService,
  ) {}

  private async findUnitByName(name: string) {
    const units = await this.prisma.unit.findMany({
      where: { active: true },
      select: { id: true, name: true, type: true },
    });

    if (!units.length) return null;

    const scored = units.map((u) => ({
      unit: u,
      score: jaccardSimilarity(u.name, name),
    }));
    scored.sort((a, b) => b.score - a.score);

    const best = scored[0];
    return best.score > 0.35 ? best.unit : null;
  }

  async previewPdf(buffer: Buffer) {
    const parsed = await parseGeraPdf(buffer);
    const { header, items } = parsed;

    // Tentar identificar unidade
    const unitMatch = header.unitName
      ? await this.findUnitByName(header.unitName)
      : null;

    // Verificar quais itens já têm mapeamento
    const externalCodes = items
      .map((i) => i.externalCode)
      .filter(Boolean) as string[];

    const existingMappings = await this.prisma.externalCodeMapping.findMany({
      where: { externalCode: { in: externalCodes } },
      include: { item: { select: { id: true, code: true, description: true, sectorId: true } } },
    });

    const mappingMap = new Map(existingMappings.map((m) => [m.externalCode, m]));

    const enrichedItems = items.map((item) => {
      const mapping = mappingMap.get(item.externalCode);
      return {
        ...item,
        mapped: !!mapping,
        item: mapping?.item ?? null,
      };
    });

    const mapped = enrichedItems.filter((i) => i.mapped).length;
    const unmapped = enrichedItems.length - mapped;

    return {
      header,
      unitMatch: {
        found: !!unitMatch,
        unit: unitMatch,
        nameInPdf: header.unitName,
      },
      items: enrichedItems,
      summary: {
        total: items.length,
        mapped,
        unmapped,
        parseErrors: parsed.errors.length,
      },
      errors: parsed.errors,
    };
  }

  async confirmImport(
    buffer: Buffer,
    overrides: {
      unitId?: string;
      externalNumber?: string;
    },
    user: JwtPayload,
  ) {
    const parsed = await parseGeraPdf(buffer);
    const { header, items } = parsed;

    if (!items.length) {
      throw new BadRequestException('Nenhum item encontrado no PDF');
    }

    // Resolver unidade
    let unitId = overrides.unitId;
    if (!unitId) {
      const unit = header.unitName ? await this.findUnitByName(header.unitName) : null;
      if (!unit) {
        throw new BadRequestException(
          'Unidade não identificada. Informe o unitId manualmente.',
        );
      }
      unitId = unit.id;
    }

    const requestedAt = header.requestedAt?.toISOString() ?? new Date().toISOString();
    const expectedDelivery = header.expectedDelivery?.toISOString() ?? undefined;
    const deadline = header.deadline?.toISOString() ?? undefined;

    return this.gerasService.createFromImport(
      {
        externalNumber: overrides.externalNumber ?? header.externalNumber ?? undefined,
        type: mapTypeString(header.type),
        unitId,
        requestedAt,
        expectedDelivery,
        deadline,
        items: items.map((i) => ({
          externalCode: i.externalCode,
          description: i.description,
          declaredBalance: i.declaredBalance ?? undefined,
          consumption: i.consumption ?? undefined,
          requested: i.requested,
        })),
      },
      'pdf',
      user,
    );
  }
}
