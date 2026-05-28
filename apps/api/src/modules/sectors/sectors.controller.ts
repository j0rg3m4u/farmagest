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
import { SectorsService } from './sectors.service';
import { JwtGuard } from '../auth/guards/jwt.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { ZodValidationPipe } from '../../common/pipes/zod-validation.pipe';
import {
  createSectorSchema,
  updateSectorSchema,
  UserRole,
  type CreateSectorInput,
  type UpdateSectorInput,
} from '@farmagest/shared';

@Controller('sectors')
@UseGuards(JwtGuard, RolesGuard)
export class SectorsController {
  constructor(private sectors: SectorsService) {}

  @Get()
  findAll(@Query() query: Record<string, string>) {
    return this.sectors.findAll(query);
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.sectors.findOne(id);
  }

  @Post()
  @Roles(UserRole.MANAGER)
  create(@Body(new ZodValidationPipe(createSectorSchema)) dto: CreateSectorInput) {
    return this.sectors.create(dto);
  }

  @Patch(':id')
  @Roles(UserRole.MANAGER)
  update(
    @Param('id') id: string,
    @Body(new ZodValidationPipe(updateSectorSchema)) dto: UpdateSectorInput,
  ) {
    return this.sectors.update(id, dto);
  }

  @Delete(':id')
  @Roles(UserRole.MANAGER)
  @HttpCode(HttpStatus.NO_CONTENT)
  remove(@Param('id') id: string) {
    return this.sectors.remove(id);
  }
}
