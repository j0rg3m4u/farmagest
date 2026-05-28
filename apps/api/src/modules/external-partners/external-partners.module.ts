import { Module } from '@nestjs/common';
import { ExternalPartnersService } from './external-partners.service';
import { ExternalPartnersController } from './external-partners.controller';

@Module({
  controllers: [ExternalPartnersController],
  providers: [ExternalPartnersService],
  exports: [ExternalPartnersService],
})
export class ExternalPartnersModule {}
