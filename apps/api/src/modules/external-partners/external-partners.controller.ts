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
import { ExternalPartnersService } from './external-partners.service';
import { JwtGuard } from '../auth/guards/jwt.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { ZodValidationPipe } from '../../common/pipes/zod-validation.pipe';
import {
  UserRole,
  createExternalPartnerSchema,
  updateExternalPartnerSchema,
  type CreateExternalPartnerInput,
  type UpdateExternalPartnerInput,
} from '@farmagest/shared';
import type { PartnersFilter } from './external-partners.service';

@Controller('partners')
@UseGuards(JwtGuard, RolesGuard)
export class ExternalPartnersController {
  constructor(private partners: ExternalPartnersService) {}

  @Get()
  findAll(@Query() query: PartnersFilter) {
    return this.partners.findAll(query);
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.partners.findOne(id);
  }

  @Post()
  @Roles(UserRole.COORDINATION, UserRole.MANAGER)
  create(
    @Body(new ZodValidationPipe(createExternalPartnerSchema)) dto: CreateExternalPartnerInput,
  ) {
    return this.partners.create(dto);
  }

  @Patch(':id')
  @Roles(UserRole.COORDINATION, UserRole.MANAGER)
  update(
    @Param('id') id: string,
    @Body(new ZodValidationPipe(updateExternalPartnerSchema)) dto: UpdateExternalPartnerInput,
  ) {
    return this.partners.update(id, dto);
  }

  @Delete(':id')
  @Roles(UserRole.MANAGER)
  @HttpCode(HttpStatus.NO_CONTENT)
  remove(@Param('id') id: string) {
    return this.partners.remove(id);
  }
}
