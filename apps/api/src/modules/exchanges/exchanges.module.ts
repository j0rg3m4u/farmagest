import { Module } from '@nestjs/common';
import { ExchangesService } from './exchanges.service';
import { ExchangesPdfService } from './exchanges-pdf.service';
import { ExchangesController } from './exchanges.controller';

@Module({
  controllers: [ExchangesController],
  providers: [ExchangesService, ExchangesPdfService],
  exports: [ExchangesService],
})
export class ExchangesModule {}
