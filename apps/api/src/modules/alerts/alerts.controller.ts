import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { AlertsService } from './alerts.service';
import { JwtGuard } from '../auth/guards/jwt.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import type { JwtPayload } from '@farmagest/shared';

@Controller('alerts')
@UseGuards(JwtGuard, RolesGuard)
export class AlertsController {
  constructor(private alerts: AlertsService) {}

  @Get('summary')
  getSummary(@CurrentUser() user: JwtPayload) {
    return this.alerts.getSummary(user);
  }

  @Get('expiration')
  getExpiration(@Query('days') days = '30', @CurrentUser() user: JwtPayload) {
    return this.alerts.getExpiration(parseInt(days, 10), user);
  }

  @Get('critical')
  getCritical(@CurrentUser() user: JwtPayload) {
    return this.alerts.getCritical(user);
  }
}
