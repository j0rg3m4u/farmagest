import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { LotsService } from './lots.service';
import { JwtGuard } from '../auth/guards/jwt.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { ZodValidationPipe } from '../../common/pipes/zod-validation.pipe';
import {
  createLotSchema,
  updateLotSchema,
  type CreateLotInput,
  type UpdateLotInput,
  type JwtPayload,
} from '@farmagest/shared';

@UseGuards(JwtGuard, RolesGuard)
@Controller()
export class LotsController {
  constructor(private lots: LotsService) {}

  @Get('items/:itemId/lots')
  listByItem(
    @Param('itemId') itemId: string,
    @Query() query: Record<string, string>,
    @CurrentUser() user: JwtPayload,
  ) {
    return this.lots.listByItem(itemId, query, user);
  }

  @Get('lots/:id')
  findOne(@Param('id') id: string, @CurrentUser() user: JwtPayload) {
    return this.lots.findOne(id, user);
  }

  @Post('items/:itemId/lots')
  create(
    @Param('itemId') itemId: string,
    @Body(new ZodValidationPipe(createLotSchema)) dto: CreateLotInput,
    @CurrentUser() user: JwtPayload,
  ) {
    return this.lots.create(itemId, dto, user);
  }

  @Patch('lots/:id')
  update(
    @Param('id') id: string,
    @Body(new ZodValidationPipe(updateLotSchema)) dto: UpdateLotInput,
    @CurrentUser() user: JwtPayload,
  ) {
    return this.lots.update(id, dto, user);
  }

  @Delete('lots/:id')
  @HttpCode(HttpStatus.NO_CONTENT)
  remove(@Param('id') id: string, @CurrentUser() user: JwtPayload) {
    return this.lots.remove(id, user);
  }
}
