import {
  Controller,
  Get,
  Param,
  Query,
  UseGuards,
  Res,
} from '@nestjs/common';
import type { Response } from 'express';
import { AuditLogsService, AuditLogFilters } from './audit-logs.service';
import { JwtGuard } from '../auth/guards/jwt.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { UserRole, type JwtPayload } from '@farmagest/shared';

@Controller('audit-logs')
@UseGuards(JwtGuard, RolesGuard)
@Roles(UserRole.MANAGER, UserRole.COORDINATION)
export class AuditLogsController {
  constructor(private auditLogs: AuditLogsService) {}

  @Get()
  list(@Query() query: AuditLogFilters, @CurrentUser() user: JwtPayload) {
    return this.auditLogs.list(query, user);
  }

  @Get('stats')
  stats(@CurrentUser() user: JwtPayload) {
    return this.auditLogs.stats(user);
  }

  @Get('entities')
  entities() {
    return this.auditLogs.getDistinctEntities();
  }

  @Get('actions')
  actions() {
    return this.auditLogs.getDistinctActions();
  }

  @Get('history/:entity/:entityId')
  history(@Param('entity') entity: string, @Param('entityId') entityId: string) {
    return this.auditLogs.history(entity, entityId);
  }

  @Get('export')
  @Roles(UserRole.MANAGER)
  async export(
    @Query() query: AuditLogFilters & { format?: string },
    @CurrentUser() user: JwtPayload,
    @Res() res: Response,
  ) {
    const format = query.format ?? 'csv';

    if (format === 'pdf') {
      const buffer = await this.auditLogs.exportPdf(query, user);
      res.set({
        'Content-Type': 'application/pdf',
        'Content-Disposition': 'attachment; filename="auditoria.pdf"',
        'Content-Length': buffer.length,
      });
      return res.end(buffer);
    }

    const csv = await this.auditLogs.exportCsv(query, user);
    res.set({
      'Content-Type': 'text/csv; charset=utf-8',
      'Content-Disposition': 'attachment; filename="auditoria.csv"',
    });
    return res.end('﻿' + csv); // BOM para Excel abrir corretamente
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.auditLogs.findOne(id);
  }
}
