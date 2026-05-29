import {
  Controller,
  Get,
  Query,
  UseGuards,
  Res,
} from '@nestjs/common';
import type { Response } from 'express';
import { JwtGuard } from '../auth/guards/jwt.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { UserRole, reportPeriodSchema, type ReportFilters, type JwtPayload } from '@farmagest/shared';
import { MovementsReportService } from './services/movements.report';
import { ConsumptionReportService } from './services/consumption.report';
import { LossesReportService } from './services/losses.report';
import { ExpirationReportService } from './services/expiration.report';
import { ExchangesReportService } from './services/exchanges.report';
import { GeraReportService } from './services/gera.report';
import { StockPositionReportService } from './services/stock-position.report';
import { ExecutiveReportService } from './services/executive.report';
import { AuditReportService } from './services/audit.report';
import { generatePdfReport } from './exporters/pdf.exporter';
import { generateExcelFromRows } from './exporters/excel.exporter';

function parseFilters(query: Record<string, string>): ReportFilters {
  return reportPeriodSchema.parse({
    dateFrom: query['dateFrom'],
    dateTo: query['dateTo'],
    preset: query['preset'],
    sectorId: query['sectorId'],
    unitId: query['unitId'],
    itemId: query['itemId'],
    format: query['format'] ?? 'json',
  });
}

function fmtPeriod(from: Date, to: Date) {
  return `${from.toLocaleDateString('pt-BR')} a ${to.toLocaleDateString('pt-BR')}`;
}

function excelHeaders(rows: Record<string, unknown>[], exclude: (k: string) => boolean = () => false) {
  return Object.keys(rows[0] ?? {}).filter((k) => !exclude(k));
}

function xlsxHeaders(label: string) {
  return {
    'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    'Content-Disposition': `attachment; filename="${label}.xlsx"`,
  };
}

@Controller('reports')
@UseGuards(JwtGuard, RolesGuard)
export class ReportsController {
  constructor(
    private movements: MovementsReportService,
    private consumption: ConsumptionReportService,
    private losses: LossesReportService,
    private expiration: ExpirationReportService,
    private exchanges: ExchangesReportService,
    private gera: GeraReportService,
    private stockPosition: StockPositionReportService,
    private executive: ExecutiveReportService,
    private audit: AuditReportService,
  ) {}

  // R01 — Movimentações por período
  @Get('movements')
  @Roles(UserRole.MANAGER, UserRole.COORDINATION, UserRole.ASSISTANT)
  async getMovements(
    @Query() query: Record<string, string>,
    @CurrentUser() user: JwtPayload,
    @Res({ passthrough: true }) res: Response,
  ) {
    const filters = parseFilters(query);
    const data = await this.movements.getData(filters, user);
    if (filters.format === 'json') return data;

    const headers = excelHeaders(data.rows);
    if (filters.format === 'excel') {
      const buf = await generateExcelFromRows({
        title: 'R01 — Movimentações por Período',
        sheetName: 'Movimentações',
        filters: [`Período: ${fmtPeriod(data.meta.from, data.meta.to)}`],
        generatedBy: user.email,
        generatedAt: new Date(),
        headers,
        rows: data.rows,
        totalsRow: data.totals,
      });
      Object.entries(xlsxHeaders('r01-movimentacoes')).forEach(([k, v]) => res.setHeader(k, v));
      return res.send(buf);
    }
    const buf = await generatePdfReport({
      title: 'R01 — Movimentações por Período',
      subtitle: `Período: ${fmtPeriod(data.meta.from, data.meta.to)}`,
      filters: [],
      generatedBy: user.email,
      generatedAt: new Date(),
      columns: [
        { header: 'Data/Hora', width: 90 },
        { header: 'Tipo', width: 110 },
        { header: 'Código', width: 60 },
        { header: 'Item', width: 130 },
        { header: 'Lote', width: 70 },
        { header: 'Validade', width: 60 },
        { header: 'Quantidade', width: 60, align: 'right' },
        { header: 'Unidade', width: 80 },
        { header: 'Responsável', width: 80 },
      ],
      rows: data.rows,
      totals: data.totals,
    });
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', 'attachment; filename="r01-movimentacoes.pdf"');
    return res.send(buf);
  }

  // R02 — Consumo por item
  @Get('consumption/by-item')
  @Roles(UserRole.MANAGER, UserRole.COORDINATION, UserRole.ASSISTANT)
  async getConsumptionByItem(
    @Query() query: Record<string, string>,
    @CurrentUser() user: JwtPayload,
    @Res({ passthrough: true }) res: Response,
  ) {
    const filters = parseFilters(query);
    const data = await this.consumption.getByItem(filters, user);
    if (filters.format === 'json') return data;

    const headers = excelHeaders(data.rows, (k) => k.startsWith('_'));
    if (filters.format === 'excel') {
      const buf = await generateExcelFromRows({
        title: 'R02 — Consumo por Item',
        sheetName: 'Consumo por Item',
        filters: [`Período: ${fmtPeriod(data.meta.from, data.meta.to)}`],
        generatedBy: user.email,
        generatedAt: new Date(),
        headers,
        rows: data.rows,
        totalsRow: data.totals,
      });
      Object.entries(xlsxHeaders('r02-consumo-por-item')).forEach(([k, v]) => res.setHeader(k, v));
      return res.send(buf);
    }
    const buf = await generatePdfReport({
      title: 'R02 — Consumo por Item',
      subtitle: `Período: ${fmtPeriod(data.meta.from, data.meta.to)}`,
      filters: [],
      generatedBy: user.email,
      generatedAt: new Date(),
      columns: [
        { header: 'Código', width: 70 },
        { header: 'Item', width: 200 },
        { header: 'Qtd. consumida', width: 90, align: 'right' },
        { header: 'Qtd. saídas', width: 80, align: 'right' },
        { header: 'Valor total (R$)', width: 100, align: 'right' },
        { header: 'Ticket médio (R$)', width: 100, align: 'right' },
        { header: 'Lotes usados', width: 80, align: 'right' },
      ],
      rows: data.rows,
      totals: data.totals,
    });
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', 'attachment; filename="r02-consumo-por-item.pdf"');
    return res.send(buf);
  }

  // R03 — Consumo por unidade
  @Get('consumption/by-unit')
  @Roles(UserRole.MANAGER, UserRole.COORDINATION, UserRole.ASSISTANT)
  async getConsumptionByUnit(
    @Query() query: Record<string, string>,
    @CurrentUser() user: JwtPayload,
    @Res({ passthrough: true }) res: Response,
  ) {
    const filters = parseFilters(query);
    const data = await this.consumption.getByUnit(filters, user);
    if (filters.format === 'json') return data;

    const headers = excelHeaders(data.rows, (k) => k.startsWith('_'));
    if (filters.format === 'excel') {
      const buf = await generateExcelFromRows({
        title: 'R03 — Consumo por Unidade',
        sheetName: 'Consumo por Unidade',
        filters: [`Período: ${fmtPeriod(data.meta.from, data.meta.to)}`],
        generatedBy: user.email,
        generatedAt: new Date(),
        headers,
        rows: data.rows,
      });
      Object.entries(xlsxHeaders('r03-consumo-por-unidade')).forEach(([k, v]) => res.setHeader(k, v));
      return res.send(buf);
    }
    const buf = await generatePdfReport({
      title: 'R03 — Consumo por Unidade',
      subtitle: `Período: ${fmtPeriod(data.meta.from, data.meta.to)}`,
      filters: [],
      generatedBy: user.email,
      generatedAt: new Date(),
      columns: [
        { header: 'Unidade', width: 200 },
        { header: 'Saídas', width: 70, align: 'right' },
        { header: 'Itens distintos', width: 90, align: 'right' },
        { header: 'Qtd. total', width: 90, align: 'right' },
        { header: 'Valor total (R$)', width: 100, align: 'right' },
        { header: 'Ticket médio (R$)', width: 110, align: 'right' },
      ],
      rows: data.rows,
    });
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', 'attachment; filename="r03-consumo-por-unidade.pdf"');
    return res.send(buf);
  }

  // R04 — Perdas e descartes
  @Get('losses')
  @Roles(UserRole.MANAGER, UserRole.COORDINATION, UserRole.ASSISTANT)
  async getLosses(
    @Query() query: Record<string, string>,
    @CurrentUser() user: JwtPayload,
    @Res({ passthrough: true }) res: Response,
  ) {
    const filters = parseFilters(query);
    const data = await this.losses.getData(filters, user);
    if (filters.format === 'json') return data;

    const headers = excelHeaders(data.rows, (k) => k.startsWith('_'));
    if (filters.format === 'excel') {
      const buf = await generateExcelFromRows({
        title: 'R04 — Perdas e Descartes',
        sheetName: 'Perdas',
        filters: [`Período: ${fmtPeriod(data.meta.from, data.meta.to)}`],
        generatedBy: user.email,
        generatedAt: new Date(),
        headers,
        rows: data.rows,
        totalsRow: data.totals,
      });
      Object.entries(xlsxHeaders('r04-perdas')).forEach(([k, v]) => res.setHeader(k, v));
      return res.send(buf);
    }
    const buf = await generatePdfReport({
      title: 'R04 — Perdas e Descartes',
      subtitle: `Período: ${fmtPeriod(data.meta.from, data.meta.to)}`,
      filters: [],
      generatedBy: user.email,
      generatedAt: new Date(),
      columns: [
        { header: 'Data', width: 90 },
        { header: 'Código', width: 60 },
        { header: 'Item', width: 150 },
        { header: 'Lote', width: 70 },
        { header: 'Validade', width: 60 },
        { header: 'Qtd descartada', width: 80, align: 'right' },
        { header: 'Valor unitário', width: 80, align: 'right' },
        { header: 'Perda total (R$)', width: 90, align: 'right' },
        { header: 'Responsável', width: 80 },
      ],
      rows: data.rows,
      totals: data.totals,
    });
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', 'attachment; filename="r04-perdas.pdf"');
    return res.send(buf);
  }

  // R05 — Validades a expirar
  @Get('expiration')
  @Roles(UserRole.MANAGER, UserRole.COORDINATION, UserRole.ASSISTANT)
  async getExpiration(
    @Query() query: Record<string, string>,
    @CurrentUser() user: JwtPayload,
    @Res({ passthrough: true }) res: Response,
  ) {
    const filters = parseFilters(query);
    const days = parseInt(query['days'] ?? '30', 10);
    const sectorId = user.role !== UserRole.MANAGER ? (user.sectorId ?? undefined) : (filters.sectorId ?? undefined);
    const data = await this.expiration.getData(days, user, sectorId);
    if (filters.format === 'json') return data;

    const headers = excelHeaders(data.rows, (k) => k.startsWith('_'));
    if (filters.format === 'excel') {
      const buf = await generateExcelFromRows({
        title: 'R05 — Validades a Expirar',
        sheetName: 'Validades',
        filters: [`Próximos ${data.meta.days} dias`],
        generatedBy: user.email,
        generatedAt: new Date(),
        headers,
        rows: data.rows,
      });
      Object.entries(xlsxHeaders('r05-validades')).forEach(([k, v]) => res.setHeader(k, v));
      return res.send(buf);
    }
    const buf = await generatePdfReport({
      title: 'R05 — Validades a Expirar',
      subtitle: `Próximos ${data.meta.days} dias`,
      filters: [],
      generatedBy: user.email,
      generatedAt: new Date(),
      columns: [
        { header: 'Código', width: 70 },
        { header: 'Item', width: 170 },
        { header: 'Lote', width: 70 },
        { header: 'Validade', width: 70 },
        { header: 'Dias restantes', width: 80, align: 'right' },
        { header: 'Saldo', width: 70, align: 'right' },
        { header: 'Valor em risco (R$)', width: 100, align: 'right' },
        { header: 'Urgência', width: 110 },
      ],
      rows: data.rows,
    });
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', 'attachment; filename="r05-validades.pdf"');
    return res.send(buf);
  }

  // R06 — Trocas intermunicipais
  @Get('exchanges')
  @Roles(UserRole.MANAGER, UserRole.COORDINATION, UserRole.ASSISTANT)
  async getExchanges(
    @Query() query: Record<string, string>,
    @CurrentUser() user: JwtPayload,
    @Res({ passthrough: true }) res: Response,
  ) {
    const filters = parseFilters(query);
    const data = await this.exchanges.getData(filters, user);
    if (filters.format === 'json') return data;

    const headers = excelHeaders(data.rows, (k) => k.startsWith('_'));
    if (filters.format === 'excel') {
      const buf = await generateExcelFromRows({
        title: 'R06 — Trocas Intermunicipais',
        sheetName: 'Trocas',
        filters: [`Período: ${fmtPeriod(data.meta.from, data.meta.to)}`],
        generatedBy: user.email,
        generatedAt: new Date(),
        headers,
        rows: data.rows,
        totalsRow: data.totals,
      });
      Object.entries(xlsxHeaders('r06-trocas')).forEach(([k, v]) => res.setHeader(k, v));
      return res.send(buf);
    }
    const buf = await generatePdfReport({
      title: 'R06 — Trocas Intermunicipais',
      subtitle: `Período: ${fmtPeriod(data.meta.from, data.meta.to)}`,
      filters: [],
      generatedBy: user.email,
      generatedAt: new Date(),
      columns: [
        { header: 'Código', width: 70 },
        { header: 'Data', width: 70 },
        { header: 'Município Parceiro', width: 130 },
        { header: 'Itens enviados', width: 80, align: 'right' },
        { header: 'Valor enviado (R$)', width: 100, align: 'right' },
        { header: 'Itens recebidos', width: 80, align: 'right' },
        { header: 'Valor recebido (R$)', width: 100, align: 'right' },
        { header: 'Diferença (R$)', width: 90, align: 'right' },
        { header: 'Responsável', width: 80 },
      ],
      rows: data.rows,
      totals: data.totals,
    });
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', 'attachment; filename="r06-trocas.pdf"');
    return res.send(buf);
  }

  // R07 — Atendimento GERAs
  @Get('geras')
  @Roles(UserRole.MANAGER, UserRole.COORDINATION, UserRole.ASSISTANT)
  async getGeras(
    @Query() query: Record<string, string>,
    @CurrentUser() user: JwtPayload,
    @Res({ passthrough: true }) res: Response,
  ) {
    const filters = parseFilters(query);
    const data = await this.gera.getData(filters, user);
    if (filters.format === 'json') return data;

    const headers = Object.keys(data.rows[0] ?? {});
    if (filters.format === 'excel') {
      const buf = await generateExcelFromRows({
        title: 'R07 — Atendimento de GERAs',
        sheetName: 'GERAs',
        filters: [`Período: ${fmtPeriod(data.meta.from, data.meta.to)}`],
        generatedBy: user.email,
        generatedAt: new Date(),
        headers,
        rows: data.rows,
        totalsRow: data.totals,
      });
      Object.entries(xlsxHeaders('r07-geras')).forEach(([k, v]) => res.setHeader(k, v));
      return res.send(buf);
    }
    const buf = await generatePdfReport({
      title: 'R07 — Atendimento de GERAs',
      subtitle: `Período: ${fmtPeriod(data.meta.from, data.meta.to)}`,
      filters: [],
      generatedBy: user.email,
      generatedAt: new Date(),
      columns: [
        { header: 'GERA', width: 80 },
        { header: 'Nº Original', width: 90 },
        { header: 'Unidade', width: 130 },
        { header: 'Data', width: 70 },
        { header: 'Itens solicit.', width: 80, align: 'right' },
        { header: 'Atendidos', width: 70, align: 'right' },
        { header: 'Parciais', width: 70, align: 'right' },
        { header: 'Negados', width: 70, align: 'right' },
        { header: 'Taxa atend.', width: 80, align: 'right' },
      ],
      rows: data.rows,
      totals: data.totals,
    });
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', 'attachment; filename="r07-geras.pdf"');
    return res.send(buf);
  }

  // R08 — Posição de estoque
  @Get('stock-position')
  @Roles(UserRole.MANAGER, UserRole.COORDINATION, UserRole.ASSISTANT)
  async getStockPosition(
    @Query() query: Record<string, string>,
    @CurrentUser() user: JwtPayload,
    @Res({ passthrough: true }) res: Response,
  ) {
    const filters = parseFilters(query);
    const sectorId = user.role !== UserRole.MANAGER ? (user.sectorId ?? undefined) : (filters.sectorId ?? undefined);
    const data = await this.stockPosition.getData(user, sectorId);
    if (filters.format === 'json') return data;

    const headers = excelHeaders(data.rows, (k) => k.startsWith('_'));
    if (filters.format === 'excel') {
      const buf = await generateExcelFromRows({
        title: 'R08 — Posição de Estoque',
        sheetName: 'Estoque',
        filters: [],
        generatedBy: user.email,
        generatedAt: new Date(),
        headers,
        rows: data.rows,
      });
      Object.entries(xlsxHeaders('r08-estoque')).forEach(([k, v]) => res.setHeader(k, v));
      return res.send(buf);
    }
    const buf = await generatePdfReport({
      title: 'R08 — Posição de Estoque Atual',
      subtitle: `Gerado em ${new Date().toLocaleDateString('pt-BR')}`,
      filters: [],
      generatedBy: user.email,
      generatedAt: new Date(),
      columns: [
        { header: 'Código', width: 70 },
        { header: 'Item', width: 200 },
        { header: 'Situação', width: 70 },
        { header: 'Lotes ativos', width: 70, align: 'right' },
        { header: 'Saldo total', width: 80, align: 'right' },
        { header: 'Próx. vencimento', width: 90 },
        { header: 'Valor em estoque (R$)', width: 110, align: 'right' },
      ],
      rows: data.rows,
    });
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', 'attachment; filename="r08-estoque.pdf"');
    return res.send(buf);
  }

  // R09 — Painel executivo (só MANAGER)
  @Get('executive')
  @Roles(UserRole.MANAGER)
  async getExecutive(
    @Query() query: Record<string, string>,
  ) {
    const filters = parseFilters(query);
    return this.executive.getData(filters);
  }

  // R10 — Trilha de auditoria (só MANAGER)
  @Get('audit')
  @Roles(UserRole.MANAGER)
  async getAudit(
    @Query() query: Record<string, string>,
    @CurrentUser() user: JwtPayload,
    @Res({ passthrough: true }) res: Response,
  ) {
    const filters = parseFilters(query);
    const data = await this.audit.getData({
      ...filters,
      userId: query['userId'],
      action: query['action'],
      entity: query['entity'],
    });
    if (filters.format === 'json') return data;

    const headers = excelHeaders(data.rows, (k) => k === '_raw');
    if (filters.format === 'excel') {
      const buf = await generateExcelFromRows({
        title: 'R10 — Trilha de Auditoria',
        sheetName: 'Auditoria',
        filters: [`Período: ${fmtPeriod(data.meta.from, data.meta.to)}`],
        generatedBy: user.email,
        generatedAt: new Date(),
        headers,
        rows: data.rows,
      });
      Object.entries(xlsxHeaders('r10-auditoria')).forEach(([k, v]) => res.setHeader(k, v));
      return res.send(buf);
    }
    const buf = await generatePdfReport({
      title: 'R10 — Trilha de Auditoria',
      subtitle: `Período: ${fmtPeriod(data.meta.from, data.meta.to)}${data.meta.truncated ? ' (limitado a 2000 registros)' : ''}`,
      filters: [],
      generatedBy: user.email,
      generatedAt: new Date(),
      columns: [
        { header: 'Data/Hora', width: 90 },
        { header: 'Usuário', width: 100 },
        { header: 'Perfil', width: 80 },
        { header: 'Ação', width: 70 },
        { header: 'Entidade', width: 80 },
        { header: 'ID da Entidade', width: 90 },
        { header: 'Setor', width: 80 },
        { header: 'Detalhe', width: 160 },
      ],
      rows: data.rows,
    });
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', 'attachment; filename="r10-auditoria.pdf"');
    return res.send(buf);
  }
}
