import { Module } from '@nestjs/common';
import { MulterModule } from '@nestjs/platform-express';
import { GerasService } from './geras.service';
import { GerasImportService } from './geras-import.service';
import { GerasReceiptService } from './geras-receipt.service';
import { GerasController } from './geras.controller';
import { MovementsModule } from '../movements/movements.module';

@Module({
  imports: [
    MovementsModule,
    MulterModule.register({ limits: { fileSize: 10 * 1024 * 1024 } }),
  ],
  controllers: [GerasController],
  providers: [GerasService, GerasImportService, GerasReceiptService],
  exports: [GerasService],
})
export class GerasModule {}
