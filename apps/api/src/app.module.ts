import { Module } from '@nestjs/common';
import { APP_INTERCEPTOR } from '@nestjs/core';
import { ConfigModule } from '@nestjs/config';
import { PrismaModule } from './common/prisma/prisma.module';
import { AuditInterceptor } from './common/interceptors/audit.interceptor';
import { HealthModule } from './modules/health/health.module';
import { AuthModule } from './modules/auth/auth.module';
import { UsersModule } from './modules/users/users.module';
import { UnitsModule } from './modules/units/units.module';
import { SectorsModule } from './modules/sectors/sectors.module';
import { ItemsModule } from './modules/items/items.module';
import { LotsModule } from './modules/lots/lots.module';
import { MovementsModule } from './modules/movements/movements.module';
import { AlertsModule } from './modules/alerts/alerts.module';
import { ExternalPartnersModule } from './modules/external-partners/external-partners.module';
import { ExchangesModule } from './modules/exchanges/exchanges.module';
import { AuditLogsModule } from './modules/audit-logs/audit-logs.module';
import { GerasModule } from './modules/geras/geras.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    PrismaModule,
    HealthModule,
    AuthModule,
    UsersModule,
    UnitsModule,
    SectorsModule,
    ItemsModule,
    LotsModule,
    MovementsModule,
    AlertsModule,
    ExternalPartnersModule,
    ExchangesModule,
    AuditLogsModule,
    GerasModule,
  ],
  providers: [
    {
      provide: APP_INTERCEPTOR,
      useClass: AuditInterceptor,
    },
  ],
})
export class AppModule {}
