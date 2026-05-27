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
  UseInterceptors,
  UploadedFile,
  Res,
  BadRequestException,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import type { Response } from 'express';
import { ItemsService } from './items.service';
import { JwtGuard } from '../auth/guards/jwt.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { ZodValidationPipe } from '../../common/pipes/zod-validation.pipe';
import {
  createItemSchema,
  updateItemSchema,
  UserRole,
  type CreateItemInput,
  type UpdateItemInput,
  type JwtPayload,
} from '@farmagest/shared';

@Controller('items')
@UseGuards(JwtGuard, RolesGuard)
export class ItemsController {
  constructor(private items: ItemsService) {}

  @Get()
  findAll(@Query() query: Record<string, string>, @CurrentUser() user: JwtPayload) {
    return this.items.findAll(query, user);
  }

  @Get(':id')
  findOne(@Param('id') id: string, @CurrentUser() user: JwtPayload) {
    return this.items.findOne(id, user);
  }

  @Post()
  @Roles(UserRole.COORDINATION, UserRole.ADMIN, UserRole.MANAGER)
  create(
    @Body(new ZodValidationPipe(createItemSchema)) dto: CreateItemInput,
    @CurrentUser() user: JwtPayload,
  ) {
    return this.items.create(dto, user);
  }

  @Patch(':id')
  @Roles(UserRole.COORDINATION, UserRole.ADMIN, UserRole.MANAGER)
  update(
    @Param('id') id: string,
    @Body(new ZodValidationPipe(updateItemSchema)) dto: UpdateItemInput,
    @CurrentUser() user: JwtPayload,
  ) {
    return this.items.update(id, dto, user);
  }

  @Delete('all')
  @Roles(UserRole.MANAGER)
  @HttpCode(HttpStatus.OK)
  deleteAll() {
    return this.items.deleteAll();
  }

  @Delete(':id')
  @Roles(UserRole.COORDINATION, UserRole.MANAGER)
  @HttpCode(HttpStatus.NO_CONTENT)
  remove(@Param('id') id: string, @CurrentUser() user: JwtPayload) {
    return this.items.remove(id, user);
  }

  @Patch('batch')
  @Roles(UserRole.COORDINATION, UserRole.ADMIN, UserRole.MANAGER)
  batchUpdate(
    @Body() body: { updates: Array<{ id: string } & Record<string, unknown>> },
    @CurrentUser() user: JwtPayload,
  ) {
    return this.items.batchUpdate(body.updates ?? [], user);
  }

  @Get('import/template')
  getTemplate(@Res() res: Response) {
    const buffer = this.items.buildTemplate();
    res.set({
      'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'Content-Disposition': 'attachment; filename="modelo-importacao-itens.xlsx"',
    });
    res.send(buffer);
  }

  @Post('import')
  @Roles(UserRole.COORDINATION, UserRole.ADMIN, UserRole.MANAGER)
  @UseInterceptors(FileInterceptor('file', { limits: { fileSize: 10 * 1024 * 1024 } }))
  import(
    @UploadedFile() file: Express.Multer.File,
    @Body('sectorId') sectorId: string,
    @Body('mode') mode: string,
    @Body('onDuplicate') onDuplicate: string,
    @Body('descriptionColumn') descriptionColumn: string,
    @Body('typeColumn') typeColumn: string,
    @Body('startRow') startRow: string,
    @CurrentUser() user: JwtPayload,
  ) {
    if (!file) throw new BadRequestException('Arquivo obrigatório');
    if (!sectorId) throw new BadRequestException('sectorId obrigatório');
    const resolvedMode = mode === 'matrix' ? 'matrix' : 'list';
    const resolvedOnDuplicate = (['skip', 'fail', 'update'] as const).includes(onDuplicate as any)
      ? (onDuplicate as 'skip' | 'fail' | 'update')
      : 'skip';
    return this.items.importFromFile(file.buffer, sectorId, user, resolvedMode, {
      descriptionColumn: descriptionColumn ? parseInt(descriptionColumn, 10) : undefined,
      typeColumn: typeColumn ? parseInt(typeColumn, 10) : undefined,
      startRow: startRow ? parseInt(startRow, 10) : undefined,
    }, resolvedOnDuplicate);
  }
}
