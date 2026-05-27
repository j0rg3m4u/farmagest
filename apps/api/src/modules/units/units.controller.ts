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
  BadRequestException,
  UseInterceptors,
  UploadedFile,
  Res,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import type { Response } from 'express';
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
  @Roles(UserRole.COORDINATION, UserRole.MANAGER)
  create(@Body(new ZodValidationPipe(createUnitSchema)) dto: CreateUnitInput) {
    return this.units.create(dto);
  }

  @Patch(':id')
  @Roles(UserRole.COORDINATION, UserRole.MANAGER)
  update(
    @Param('id') id: string,
    @Body(new ZodValidationPipe(updateUnitSchema)) dto: UpdateUnitInput,
  ) {
    return this.units.update(id, dto);
  }

  @Delete(':id')
  @Roles(UserRole.COORDINATION, UserRole.MANAGER)
  @HttpCode(HttpStatus.NO_CONTENT)
  remove(@Param('id') id: string) {
    return this.units.remove(id);
  }

  @Get('import/template')
  getTemplate(@Res() res: Response) {
    const buffer = this.units.buildListTemplate();
    res.set({
      'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'Content-Disposition': 'attachment; filename="modelo-importacao-unidades.xlsx"',
    });
    res.send(buffer);
  }

  @Post('import')
  @Roles(UserRole.COORDINATION, UserRole.MANAGER)
  @UseInterceptors(FileInterceptor('file', { limits: { fileSize: 10 * 1024 * 1024 } }))
  import(
    @UploadedFile() file: Express.Multer.File,
    @Body('mode') mode: string,
    @Body('headerRow') headerRow: string,
    @Body('startColumn') startColumn: string,
    @Body('endColumn') endColumn: string,
  ) {
    if (!file) throw new BadRequestException('Arquivo obrigatório');
    const resolvedMode = mode === 'matrix' ? 'matrix' : 'list';
    return this.units.importFromFile(file.buffer, resolvedMode, {
      headerRow: headerRow ? parseInt(headerRow, 10) : undefined,
      startColumn: startColumn ? parseInt(startColumn, 10) : undefined,
      endColumn: endColumn ? parseInt(endColumn, 10) : undefined,
    });
  }
}
