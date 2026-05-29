import {
  Controller,
  Get,
  Post,
  Patch,
  Body,
  Param,
  Query,
  UseGuards,
} from '@nestjs/common';
import { AdminService } from './admin.service';
import { JwtGuard } from '../auth/guards/jwt.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { UserRole, type JwtPayload } from '@farmagest/shared';

@Controller('admin')
@UseGuards(JwtGuard, RolesGuard)
@Roles(UserRole.SUPERADMIN)
export class AdminController {
  constructor(private admin: AdminService) {}

  @Get('settings')
  getSettings() {
    return this.admin.getSettings();
  }

  @Patch('settings')
  updateSettings(@Body() body: {
    requireExchangeApproval?: boolean;
    exchangeTolerancePct?: number;
    exchangeApprovalThreshold?: number;
  }) {
    return this.admin.updateSettings(body);
  }

  @Post('recalculate-balances')
  recalculateBalances(@Query('sectorId') sectorId?: string) {
    return this.admin.recalculateBalances(sectorId);
  }

  @Post('impersonate/:userId')
  impersonate(@Param('userId') userId: string, @CurrentUser() user: JwtPayload) {
    return this.admin.impersonate(userId, user);
  }

  @Post('cleanup')
  cleanup(@Body() body: { target: 'movements' | 'geras' | 'items' | 'all' }) {
    return this.admin.cleanup(body.target);
  }

  @Get('database-status')
  getDatabaseStatus() {
    return this.admin.getDatabaseStatus();
  }
}
