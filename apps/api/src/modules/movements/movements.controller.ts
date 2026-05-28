import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Query,
  UseGuards,
} from '@nestjs/common';
import { MovementsService } from './movements.service';
import { JwtGuard } from '../auth/guards/jwt.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { ZodValidationPipe } from '../../common/pipes/zod-validation.pipe';
import {
  UserRole,
  entryPurchaseSchema,
  exitSupplySchema,
  adjustmentSchema,
  disposalSchema,
  reversalSchema,
  type EntryPurchaseInput,
  type ExitSupplyInput,
  type AdjustmentInput,
  type DisposalInput,
  type ReversalInput,
  type JwtPayload,
} from '@farmagest/shared';
import type { MovementsFilter } from './movements.service';

@Controller('movements')
@UseGuards(JwtGuard, RolesGuard)
export class MovementsController {
  constructor(private movements: MovementsService) {}

  @Get()
  findAll(@Query() query: MovementsFilter, @CurrentUser() user: JwtPayload) {
    return this.movements.findAll(query, user);
  }

  @Get('fefo-suggestion/:itemId')
  suggestFefo(
    @Param('itemId') itemId: string,
    @Query('quantity') quantity: string,
    @CurrentUser() user: JwtPayload,
  ) {
    return this.movements.suggestFefo(itemId, parseFloat(quantity), user);
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.movements.findOne(id);
  }

  @Post('entry-purchase')
  @Roles(UserRole.COORDINATION, UserRole.ADMIN, UserRole.MANAGER)
  entryPurchase(
    @Body(new ZodValidationPipe(entryPurchaseSchema)) dto: EntryPurchaseInput,
    @CurrentUser() user: JwtPayload,
  ) {
    return this.movements.entryPurchase(dto, user);
  }

  @Post('exit-supply')
  @Roles(UserRole.COORDINATION, UserRole.ADMIN, UserRole.MANAGER)
  exitSupply(
    @Body(new ZodValidationPipe(exitSupplySchema)) dto: ExitSupplyInput,
    @CurrentUser() user: JwtPayload,
  ) {
    return this.movements.exitSupply(dto, user);
  }

  @Post('adjustment')
  @Roles(UserRole.COORDINATION, UserRole.MANAGER)
  adjustment(
    @Body(new ZodValidationPipe(adjustmentSchema)) dto: AdjustmentInput,
    @CurrentUser() user: JwtPayload,
  ) {
    return this.movements.adjustment(dto, user);
  }

  @Post('disposal')
  @Roles(UserRole.COORDINATION, UserRole.MANAGER)
  disposal(
    @Body(new ZodValidationPipe(disposalSchema)) dto: DisposalInput,
    @CurrentUser() user: JwtPayload,
  ) {
    return this.movements.disposal(dto, user);
  }

  @Post(':id/reversal')
  @Roles(UserRole.COORDINATION, UserRole.MANAGER)
  reversal(
    @Param('id') id: string,
    @Body(new ZodValidationPipe(reversalSchema)) dto: ReversalInput,
    @CurrentUser() user: JwtPayload,
  ) {
    return this.movements.reversal(id, dto, user);
  }

  @Post('lots/:lotId/recalculate')
  @Roles(UserRole.MANAGER)
  recalculateBalance(@Param('lotId') lotId: string) {
    return this.movements.recalculateBalance(lotId);
  }
}
