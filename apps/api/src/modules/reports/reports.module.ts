import { Module } from '@nestjs/common';
import { ReportsController } from './reports.controller';
import { MovementsReportService } from './services/movements.report';
import { ConsumptionReportService } from './services/consumption.report';
import { LossesReportService } from './services/losses.report';
import { ExpirationReportService } from './services/expiration.report';
import { ExchangesReportService } from './services/exchanges.report';
import { GeraReportService } from './services/gera.report';
import { StockPositionReportService } from './services/stock-position.report';
import { ExecutiveReportService } from './services/executive.report';
import { AuditReportService } from './services/audit.report';

@Module({
  controllers: [ReportsController],
  providers: [
    MovementsReportService,
    ConsumptionReportService,
    LossesReportService,
    ExpirationReportService,
    ExchangesReportService,
    GeraReportService,
    StockPositionReportService,
    ExecutiveReportService,
    AuditReportService,
  ],
})
export class ReportsModule {}
