import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ForbiddenException,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { GeraStatus, GeraItemStatus } from '@farmagest/shared';
import { PrismaService } from '../../common/prisma/prisma.service';
import { MovementsService } from '../movements/movements.service';
import type {
  JwtPayload,
  CreateGeraInput,
  UpdateGeraInput,
  AddGeraItemInput,
  TriageItemInput,
  MapExternalCodeInput,
} from '@farmagest/shared';

const GERA_ITEM_SELECT = {
  id: true,
  geraId: true,
  externalCode: true,
  description: true,
  itemId: true,
  item: { select: { id: true, code: true, description: true, unitValue: true } },
  sectorId: true,
  sector: { select: { id: true, name: true, code: true } },
  declaredBalance: true,
  consumption: true,
  requested: true,
  status: true,
  approved: true,
  denialReason: true,
  triagedById: true,
  triagedBy: { select: { id: true, name: true } },
  triagedAt: true,
  movementId: true,
  lotId: true,
  lot: { select: { id: true, lotNumber: true, expirationDate: true, currentBalance: true } },
  createdAt: true,
  updatedAt: true,
} as const;

const GERA_SELECT = {
  id: true,
  code: true,
  externalNumber: true,
  status: true,
  type: true,
  unitId: true,
  unit: { select: { id: true, name: true, type: true } },
  requestedAt: true,
  expectedDelivery: true,
  deadline: true,
  importedFrom: true,
  importedFileUrl: true,
  registeredById: true,
  registeredBy: { select: { id: true, name: true } },
  createdAt: true,
  updatedAt: true,
} as const;

export interface GerasFilter {
  status?: string;
  unitId?: string;
  dateFrom?: string;
  dateTo?: string;
  type?: string;
  page?: string;
  limit?: string;
}

@Injectable()
export class GerasService {
  constructor(
    private prisma: PrismaService,
    private movements: MovementsService,
  ) {}

  // ─── Resolução de código externo → item do FarmaGest ─────────────────────────

  private async resolveItemByExternalCode(
    tx: Prisma.TransactionClient,
    externalCode: string,
  ): Promise<{ itemId: string; sectorId: string } | null> {
    const mapping = await tx.externalCodeMapping.findUnique({
      where: { externalCode },
      include: { item: { select: { id: true, sectorId: true } } },
    });
    if (!mapping) return null;
    return { itemId: mapping.itemId, sectorId: mapping.item.sectorId };
  }

  // ─── Status do GERA ──────────────────────────────────────────────────────────

  private async syncGeraStatus(
    tx: Prisma.TransactionClient,
    geraId: string,
  ): Promise<void> {
    const items = await tx.geraItem.findMany({
      where: { geraId },
      select: { status: true },
    });
    if (!items.length) return;

    const hasPending = items.some((i) => i.status === 'PENDING');
    const allDone = items.every((i) => i.status !== 'PENDING');

    let newStatus: GeraStatus;
    if (hasPending && items.some((i) => i.status !== 'PENDING')) {
      newStatus = GeraStatus.TRIAGING;
    } else if (allDone) {
      newStatus = GeraStatus.COMPLETED;
    } else {
      newStatus = GeraStatus.TRIAGING;
    }

    await tx.gera.update({
      where: { id: geraId },
      data: { status: newStatus },
    });
  }

  // ─── CRUD de GERA ────────────────────────────────────────────────────────────

  async findAll(filter: GerasFilter, user: JwtPayload) {
    const page = Math.max(1, parseInt(filter.page ?? '1', 10));
    const limit = Math.min(100, Math.max(1, parseInt(filter.limit ?? '20', 10)));
    const skip = (page - 1) * limit;

    const where: Prisma.GeraWhereInput = { deletedAt: null };

    if (filter.status) where.status = filter.status as GeraStatus;
    if (filter.unitId) where.unitId = filter.unitId;
    if (filter.type) where.type = filter.type as any;
    if (filter.dateFrom || filter.dateTo) {
      where.requestedAt = {};
      if (filter.dateFrom) where.requestedAt.gte = new Date(filter.dateFrom);
      if (filter.dateTo) where.requestedAt.lte = new Date(filter.dateTo);
    }

    const [data, total] = await Promise.all([
      this.prisma.gera.findMany({
        where,
        skip,
        take: limit,
        select: {
          ...GERA_SELECT,
          _count: { select: { items: true } },
        },
        orderBy: { requestedAt: 'desc' },
      }),
      this.prisma.gera.count({ where }),
    ]);

    return { data, total, page, limit, totalPages: Math.ceil(total / limit) };
  }

  async findOne(id: string) {
    const gera = await this.prisma.gera.findFirst({
      where: { id, deletedAt: null },
      select: {
        ...GERA_SELECT,
        items: { select: GERA_ITEM_SELECT, orderBy: { externalCode: 'asc' } },
      },
    });
    if (!gera) throw new NotFoundException('GERA não encontrado');
    return gera;
  }

  async create(dto: CreateGeraInput, user: JwtPayload) {
    return this.prisma.$transaction(async (tx) => {
      const setting = await tx.setting.findUniqueOrThrow({ where: { id: 'singleton' } });
      const seq = setting.geraSequence + 1;
      const code = `GER-${String(seq).padStart(4, '0')}`;
      await tx.setting.update({ where: { id: 'singleton' }, data: { geraSequence: seq } });

      const gera = await tx.gera.create({
        data: {
          code,
          externalNumber: dto.externalNumber ?? null,
          type: dto.type,
          unitId: dto.unitId,
          requestedAt: new Date(dto.requestedAt),
          expectedDelivery: dto.expectedDelivery ? new Date(dto.expectedDelivery) : null,
          deadline: dto.deadline ? new Date(dto.deadline) : null,
          importedFrom: 'manual',
          registeredById: user.sub,
        },
        select: GERA_SELECT,
      });

      if (dto.items?.length) {
        for (const item of dto.items) {
          const resolved = item.externalCode
            ? await this.resolveItemByExternalCode(tx, item.externalCode)
            : null;

          await tx.geraItem.create({
            data: {
              geraId: gera.id,
              externalCode: item.externalCode ?? null,
              description: item.description,
              itemId: resolved?.itemId ?? null,
              sectorId: resolved?.sectorId ?? null,
              declaredBalance: item.declaredBalance ?? null,
              consumption: item.consumption ?? null,
              requested: item.requested,
            },
          });
        }
      }

      return gera;
    });
  }

  // Variante usada pela importação (recebe importedFrom como parâmetro)
  async createFromImport(
    dto: CreateGeraInput & { items?: Array<{ externalCode?: string | null; description: string; declaredBalance?: number | null; consumption?: number | null; requested: number }> },
    importedFrom: string,
    user: JwtPayload,
  ) {
    return this.prisma.$transaction(async (tx) => {
      const setting = await tx.setting.findUniqueOrThrow({ where: { id: 'singleton' } });
      const seq = setting.geraSequence + 1;
      const code = `GER-${String(seq).padStart(4, '0')}`;
      await tx.setting.update({ where: { id: 'singleton' }, data: { geraSequence: seq } });

      const gera = await tx.gera.create({
        data: {
          code,
          externalNumber: dto.externalNumber ?? null,
          type: dto.type,
          unitId: dto.unitId,
          requestedAt: new Date(dto.requestedAt),
          expectedDelivery: dto.expectedDelivery ? new Date(dto.expectedDelivery) : null,
          deadline: dto.deadline ? new Date(dto.deadline) : null,
          importedFrom,
          registeredById: user.sub,
        },
        select: GERA_SELECT,
      });

      if (dto.items?.length) {
        for (const item of dto.items) {
          const resolved = item.externalCode
            ? await this.resolveItemByExternalCode(tx, item.externalCode)
            : null;

          await tx.geraItem.create({
            data: {
              geraId: gera.id,
              externalCode: item.externalCode ?? null,
              description: item.description,
              itemId: resolved?.itemId ?? null,
              sectorId: resolved?.sectorId ?? null,
              declaredBalance: item.declaredBalance ?? null,
              consumption: item.consumption ?? null,
              requested: item.requested,
            },
          });
        }
      }

      return this.prisma.gera.findUniqueOrThrow({
        where: { id: gera.id },
        select: {
          ...GERA_SELECT,
          _count: { select: { items: true } },
        },
      });
    });
  }

  async update(id: string, dto: UpdateGeraInput, user: JwtPayload) {
    const gera = await this.prisma.gera.findFirst({ where: { id, deletedAt: null } });
    if (!gera) throw new NotFoundException('GERA não encontrado');
    if (gera.status !== 'RECEIVED') {
      throw new BadRequestException('Só é possível editar o cabeçalho de um GERA recebido');
    }

    return this.prisma.gera.update({
      where: { id },
      data: {
        externalNumber: dto.externalNumber ?? undefined,
        type: dto.type ?? undefined,
        unitId: dto.unitId ?? undefined,
        requestedAt: dto.requestedAt ? new Date(dto.requestedAt) : undefined,
        expectedDelivery: dto.expectedDelivery ? new Date(dto.expectedDelivery) : undefined,
        deadline: dto.deadline ? new Date(dto.deadline) : undefined,
      },
      select: GERA_SELECT,
    });
  }

  async cancel(id: string, user: JwtPayload) {
    const gera = await this.prisma.gera.findFirst({ where: { id, deletedAt: null } });
    if (!gera) throw new NotFoundException('GERA não encontrado');
    if (gera.status === 'DISPATCHED') {
      throw new BadRequestException('Não é possível cancelar um GERA já despachado');
    }

    return this.prisma.gera.update({
      where: { id },
      data: { status: GeraStatus.CANCELLED, deletedAt: new Date() },
      select: GERA_SELECT,
    });
  }

  // ─── Itens do GERA ───────────────────────────────────────────────────────────

  async getItems(geraId: string, user: JwtPayload) {
    const gera = await this.prisma.gera.findFirst({ where: { id: geraId, deletedAt: null } });
    if (!gera) throw new NotFoundException('GERA não encontrado');

    const where: Prisma.GeraItemWhereInput = { geraId };
    if (user.role !== 'MANAGER') {
      where.sectorId = user.sectorId ?? undefined;
    }

    const items = await this.prisma.geraItem.findMany({
      where,
      select: GERA_ITEM_SELECT,
      orderBy: { externalCode: 'asc' },
    });

    // Enriquecer com saldo atual do item
    const enriched = await Promise.all(
      items.map(async (gi) => {
        if (!gi.itemId) return { ...gi, currentStock: null };
        const lots = await this.prisma.lot.findMany({
          where: { itemId: gi.itemId, active: true, deletedAt: null, currentBalance: { gt: 0 } },
          select: { currentBalance: true },
        });
        const currentStock = lots.reduce((s, l) => s + Number(l.currentBalance), 0);
        return { ...gi, currentStock };
      }),
    );

    return enriched;
  }

  async addItem(geraId: string, dto: AddGeraItemInput, user: JwtPayload) {
    const gera = await this.prisma.gera.findFirst({ where: { id: geraId, deletedAt: null } });
    if (!gera) throw new NotFoundException('GERA não encontrado');
    if (!['RECEIVED', 'TRIAGING'].includes(gera.status)) {
      throw new BadRequestException('Não é possível adicionar itens a um GERA neste status');
    }

    return this.prisma.$transaction(async (tx) => {
      let resolvedItemId: string | null = dto.itemId ?? null;
      let resolvedSectorId: string | null = null;

      if (!resolvedItemId && dto.externalCode) {
        const resolved = await this.resolveItemByExternalCode(tx, dto.externalCode);
        resolvedItemId = resolved?.itemId ?? null;
        resolvedSectorId = resolved?.sectorId ?? null;
      } else if (resolvedItemId) {
        const item = await tx.item.findFirst({ where: { id: resolvedItemId } });
        resolvedSectorId = item?.sectorId ?? null;
      }

      return tx.geraItem.create({
        data: {
          geraId,
          externalCode: dto.externalCode ?? null,
          description: dto.description,
          itemId: resolvedItemId,
          sectorId: resolvedSectorId,
          declaredBalance: dto.declaredBalance ?? null,
          consumption: dto.consumption ?? null,
          requested: dto.requested,
        },
        select: GERA_ITEM_SELECT,
      });
    });
  }

  async updateItem(geraId: string, itemId: string, dto: Partial<AddGeraItemInput>, user: JwtPayload) {
    const geraItem = await this.prisma.geraItem.findFirst({ where: { id: itemId, geraId } });
    if (!geraItem) throw new NotFoundException('Item do GERA não encontrado');
    if (geraItem.status !== 'PENDING') {
      throw new BadRequestException('Não é possível editar um item já triado');
    }

    return this.prisma.$transaction(async (tx) => {
      let sectorId = geraItem.sectorId;
      if (dto.itemId && dto.itemId !== geraItem.itemId) {
        const item = await tx.item.findFirst({ where: { id: dto.itemId } });
        sectorId = item?.sectorId ?? null;
      }

      return tx.geraItem.update({
        where: { id: itemId },
        data: {
          externalCode: dto.externalCode ?? undefined,
          description: dto.description ?? undefined,
          itemId: dto.itemId ?? undefined,
          sectorId: sectorId ?? undefined,
          declaredBalance: dto.declaredBalance ?? undefined,
          consumption: dto.consumption ?? undefined,
          requested: dto.requested ?? undefined,
        },
        select: GERA_ITEM_SELECT,
      });
    });
  }

  // ─── Triagem ─────────────────────────────────────────────────────────────────

  async triageItem(
    geraId: string,
    itemId: string,
    dto: TriageItemInput,
    user: JwtPayload,
  ) {
    return this.prisma.$transaction(async (tx) => {
      const geraItem = await tx.geraItem.findFirst({
        where: { id: itemId, geraId },
      });
      if (!geraItem) throw new NotFoundException('Item do GERA não encontrado');

      if (user.role !== 'MANAGER' && geraItem.sectorId !== user.sectorId) {
        throw new ForbiddenException('Item pertence a outro setor');
      }

      if (dto.status === GeraItemStatus.APPROVED) {
        if (!dto.approved || dto.approved <= 0) {
          throw new BadRequestException('Informe a quantidade a enviar');
        }
        if (dto.approved > Number(geraItem.requested)) {
          throw new BadRequestException('Não pode enviar mais do que foi solicitado');
        }
      }

      if (dto.status === GeraItemStatus.DENIED && !dto.denialReason) {
        throw new BadRequestException('Informe o motivo da negativa');
      }

      await tx.geraItem.update({
        where: { id: itemId },
        data: {
          status: dto.status,
          approved: dto.approved ?? null,
          denialReason: dto.denialReason ?? null,
          triagedById: user.sub,
          triagedAt: new Date(),
        },
      });

      await this.syncGeraStatus(tx, geraId);

      return tx.geraItem.findUniqueOrThrow({
        where: { id: itemId },
        select: GERA_ITEM_SELECT,
      });
    });
  }

  async triageBulk(
    geraId: string,
    items: Array<{ itemId: string } & TriageItemInput>,
    user: JwtPayload,
  ) {
    const results = [];
    for (const item of items) {
      const result = await this.triageItem(geraId, item.itemId, item, user);
      results.push(result);
    }
    return results;
  }

  // ─── Preview e Despacho ──────────────────────────────────────────────────────

  async dispatchPreview(geraId: string, user: JwtPayload) {
    const gera = await this.prisma.gera.findFirst({
      where: { id: geraId, deletedAt: null },
      select: { id: true, code: true, externalNumber: true, unitId: true, status: true },
    });
    if (!gera) throw new NotFoundException('GERA não encontrado');

    const where: Prisma.GeraItemWhereInput = {
      geraId,
      status: GeraItemStatus.APPROVED,
      movementId: null,
    };
    if (user.role !== 'MANAGER') where.sectorId = user.sectorId ?? undefined;

    const approvedItems = await this.prisma.geraItem.findMany({
      where,
      select: {
        id: true,
        itemId: true,
        description: true,
        externalCode: true,
        approved: true,
        item: { select: { id: true, code: true, description: true } },
      },
    });

    const preview = await Promise.all(
      approvedItems.map(async (gi) => {
        if (!gi.itemId) {
          return { geraItemId: gi.id, item: null, fefo: null, warning: 'Item não mapeado' };
        }
        const fefo = await this.movements.suggestFefo(gi.itemId, Number(gi.approved), user);
        return {
          geraItemId: gi.id,
          item: gi.item,
          fefo,
          warning: fefo.fullyAllocated ? null : `Saldo insuficiente: falta ${fefo.shortBy}`,
        };
      }),
    );

    return {
      items: preview,
      canDispatch: preview.length > 0 && preview.every((p) => p.warning === null),
      warnings: preview.filter((p) => p.warning).map((p) => p.warning),
      total: preview.length,
    };
  }

  async dispatch(geraId: string, user: JwtPayload) {
    const gera = await this.prisma.gera.findFirst({
      where: { id: geraId, deletedAt: null },
      select: { id: true, code: true, externalNumber: true, unitId: true, status: true },
    });
    if (!gera) throw new NotFoundException('GERA não encontrado');

    if (!['COMPLETED', 'TRIAGING'].includes(gera.status)) {
      throw new BadRequestException('GERA precisa ter triagem concluída antes do despacho');
    }

    const preview = await this.dispatchPreview(geraId, user);
    if (!preview.canDispatch) {
      throw new BadRequestException(
        `Não é possível despachar: ${preview.warnings.join('; ')}`,
      );
    }

    const approvedItems = await this.prisma.geraItem.findMany({
      where: {
        geraId,
        status: GeraItemStatus.APPROVED,
        movementId: null,
        ...(user.role !== 'MANAGER' ? { sectorId: user.sectorId ?? undefined } : {}),
      },
      select: { id: true, itemId: true, approved: true },
    });

    for (const gi of approvedItems) {
      if (!gi.itemId) continue;
      const movements = await this.movements.exitSupply(
        {
          itemId: gi.itemId,
          unitId: gera.unitId,
          quantity: Number(gi.approved),
          reason: `GERA ${gera.code}${gera.externalNumber ? ` (Nº ${gera.externalNumber})` : ''}`,
        },
        user,
      );
      const firstMovement = Array.isArray(movements) ? movements[0] : movements;
      await this.prisma.geraItem.update({
        where: { id: gi.id },
        data: { movementId: firstMovement.id, lotId: firstMovement.lotId },
      });
    }

    return this.prisma.gera.update({
      where: { id: geraId },
      data: { status: GeraStatus.DISPATCHED },
      select: GERA_SELECT,
    });
  }

  // ─── Itens não mapeados ───────────────────────────────────────────────────────

  async getUnmappedItems(geraId: string) {
    const gera = await this.prisma.gera.findFirst({ where: { id: geraId, deletedAt: null } });
    if (!gera) throw new NotFoundException('GERA não encontrado');

    return this.prisma.geraItem.findMany({
      where: { geraId, itemId: null },
      select: GERA_ITEM_SELECT,
      orderBy: { externalCode: 'asc' },
    });
  }

  // ─── Mapeamento de código externo ────────────────────────────────────────────

  async mapExternalCode(dto: MapExternalCodeInput, user: JwtPayload) {
    const item = await this.prisma.item.findFirst({ where: { id: dto.itemId, deletedAt: null } });
    if (!item) throw new NotFoundException('Item não encontrado');

    const mapping = await this.prisma.externalCodeMapping.upsert({
      where: { externalCode: dto.externalCode },
      create: {
        externalCode: dto.externalCode,
        itemId: dto.itemId,
        confirmedById: user.sub,
        confirmedAt: new Date(),
      },
      update: {
        itemId: dto.itemId,
        confirmedById: user.sub,
        confirmedAt: new Date(),
      },
      include: { item: { select: { id: true, code: true, description: true } } },
    });

    // Atualizar geraItems que usam este código externo e ainda estão sem vínculo
    await this.prisma.geraItem.updateMany({
      where: { externalCode: dto.externalCode, itemId: null },
      data: { itemId: dto.itemId, sectorId: item.sectorId },
    });

    return mapping;
  }

  async listExternalMappings() {
    return this.prisma.externalCodeMapping.findMany({
      include: { item: { select: { id: true, code: true, description: true, sectorId: true } } },
      orderBy: { externalCode: 'asc' },
    });
  }
}
