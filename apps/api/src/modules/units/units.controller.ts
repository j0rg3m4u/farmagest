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
  ForbiddenException,
} from '@nestjs/common';
import { UnitsService } from './units.service';
import { JwtGuard } from '../auth/guards/jwt.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { ZodValidationPipe } from '../../common/pipes/zod-validation.pipe';
import { createUnitSchema, updateUnitSchema, UserRole, type CreateUnitInput, type UpdateUnitInput, type JwtPayload } from '@farmagest/shared';

@Controller('units')
@UseGuards(JwtGuard, RolesGuard)
export class UnitsController {
  constructor(private units: UnitsService) {}

  @Get()
  findAll(@Query() query: Record<string, string>) {
    return this.units.findAll(query);
  }

  @Get(':id')
  findOne(@Param('id') id: string, @CurrentUser() user: JwtPayload) {
    if (user.role === UserRole.UNIT && user.unitId !== id) {
      throw new ForbiddenException('Acesso negado');
    }
    return this.units.findOne(id);
  }

  @Post()
  @Roles(UserRole.COORDINATION)
  create(@Body(new ZodValidationPipe(createUnitSchema)) dto: CreateUnitInput) {
    return this.units.create(dto);
  }

  @Patch(':id')
  @Roles(UserRole.COORDINATION)
  update(
    @Param('id') id: string,
    @Body(new ZodValidationPipe(updateUnitSchema)) dto: UpdateUnitInput,
  ) {
    return this.units.update(id, dto);
  }

  @Delete(':id')
  @Roles(UserRole.COORDINATION)
  @HttpCode(HttpStatus.NO_CONTENT)
  remove(@Param('id') id: string) {
    return this.units.remove(id);
  }
}
