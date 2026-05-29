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
  UploadedFile,
  UseInterceptors,
  Res,
} from '@nestjs/common';
import type { Response } from 'express';
import { FileInterceptor } from '@nestjs/platform-express';
import { GerasService, GerasFilter } from './geras.service';
import { GerasImportService } from './geras-import.service';
import { GerasReceiptService } from './geras-receipt.service';
import { JwtGuard } from '../auth/guards/jwt.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { ZodValidationPipe } from '../../common/pipes/zod-validation.pipe';
import {
  UserRole,
  GeraItemStatus,
  createGeraSchema,
  updateGeraSchema,
  addGeraItemSchema,
  triageItemSchema,
  mapExternalCodeSchema,
  type CreateGeraInput,
  type UpdateGeraInput,
  type AddGeraItemInput,
  type TriageItemInput,
  type MapExternalCodeInput,
  type JwtPayload,
} from '@farmagest/shared';
import { z } from 'zod';

const bulkTriageSchema = z.object({
  items: z.array(z.object({
    itemId: z.string().cuid(),
    status: z.nativeEnum(GeraItemStatus),
    approved: z.number().positive().nullable().optional(),
    denialReason: z.string().min(5).max(300).nullable().optional(),
  })),
});

@Controller('geras')
@UseGuards(JwtGuard, RolesGuard)
export class GerasController {
  constructor(
    private geras: GerasService,
    private gerasImport: GerasImportService,
    private gerasReceipt: GerasReceiptService,
  ) {}

  @Get()
  findAll(@Query() query: GerasFilter, @CurrentUser() user: JwtPayload) {
    return this.geras.findAll(query, user);
  }

  @Get('external-codes')
  @Roles(UserRole.MANAGER, UserRole.COORDINATION)
  listExternalMappings() {
    return this.geras.listExternalMappings();
  }

  @Get(':id')
  findOne(@Param('id') id: string, @CurrentUser() user: JwtPayload) {
    return this.geras.findOne(id);
  }

  @Post()
  @Roles(UserRole.MANAGER, UserRole.COORDINATION, UserRole.ASSISTANT)
  create(
    @Body(new ZodValidationPipe(createGeraSchema)) dto: CreateGeraInput,
    @CurrentUser() user: JwtPayload,
  ) {
    return this.geras.create(dto, user);
  }

  @Patch(':id')
  @Roles(UserRole.MANAGER, UserRole.COORDINATION, UserRole.ASSISTANT)
  update(
    @Param('id') id: string,
    @Body(new ZodValidationPipe(updateGeraSchema)) dto: UpdateGeraInput,
    @CurrentUser() user: JwtPayload,
  ) {
    return this.geras.update(id, dto, user);
  }

  @Delete(':id')
  @Roles(UserRole.MANAGER, UserRole.COORDINATION)
  @HttpCode(HttpStatus.NO_CONTENT)
  cancel(@Param('id') id: string, @CurrentUser() user: JwtPayload) {
    return this.geras.cancel(id, user);
  }

  // ─── Itens ───────────────────────────────────────────────────────────────────

  @Get(':id/items')
  getItems(@Param('id') id: string, @CurrentUser() user: JwtPayload) {
    return this.geras.getItems(id, user);
  }

  @Get(':id/items/unmapped')
  getUnmapped(@Param('id') id: string) {
    return this.geras.getUnmappedItems(id);
  }

  @Post(':id/items')
  @Roles(UserRole.MANAGER, UserRole.COORDINATION, UserRole.ASSISTANT)
  addItem(
    @Param('id') id: string,
    @Body(new ZodValidationPipe(addGeraItemSchema)) dto: AddGeraItemInput,
    @CurrentUser() user: JwtPayload,
  ) {
    return this.geras.addItem(id, dto, user);
  }

  @Patch(':id/items/:itemId')
  @Roles(UserRole.MANAGER, UserRole.COORDINATION, UserRole.ASSISTANT)
  updateItem(
    @Param('id') id: string,
    @Param('itemId') itemId: string,
    @Body(new ZodValidationPipe(addGeraItemSchema.partial())) dto: Partial<AddGeraItemInput>,
    @CurrentUser() user: JwtPayload,
  ) {
    return this.geras.updateItem(id, itemId, dto, user);
  }

  // ─── Triagem ─────────────────────────────────────────────────────────────────

  @Patch(':id/items/:itemId/triage')
  @Roles(UserRole.MANAGER, UserRole.COORDINATION)
  triageItem(
    @Param('id') id: string,
    @Param('itemId') itemId: string,
    @Body(new ZodValidationPipe(triageItemSchema)) dto: TriageItemInput,
    @CurrentUser() user: JwtPayload,
  ) {
    return this.geras.triageItem(id, itemId, dto, user);
  }

  @Post(':id/triage')
  @Roles(UserRole.MANAGER, UserRole.COORDINATION)
  triageBulk(
    @Param('id') id: string,
    @Body(new ZodValidationPipe(bulkTriageSchema)) body: { items: Array<{ itemId: string } & TriageItemInput> },
    @CurrentUser() user: JwtPayload,
  ) {
    return this.geras.triageBulk(id, body.items, user);
  }

  // ─── Despacho ────────────────────────────────────────────────────────────────

  @Get(':id/dispatch-preview')
  @Roles(UserRole.MANAGER, UserRole.COORDINATION)
  dispatchPreview(@Param('id') id: string, @CurrentUser() user: JwtPayload) {
    return this.geras.dispatchPreview(id, user);
  }

  @Post(':id/dispatch')
  @Roles(UserRole.MANAGER, UserRole.COORDINATION)
  dispatch(@Param('id') id: string, @CurrentUser() user: JwtPayload) {
    return this.geras.dispatch(id, user);
  }

  // ─── Comprovante de atendimento ──────────────────────────────────────────────

  @Get(':id/receipt')
  async downloadReceipt(@Param('id') id: string, @Res() res: Response) {
    const buffer = await this.gerasReceipt.generateReceipt(id);
    res.set({
      'Content-Type': 'application/pdf',
      'Content-Disposition': `attachment; filename="${id}-comprovante.pdf"`,
      'Content-Length': buffer.length,
    });
    res.end(buffer);
  }

  // ─── Importação de PDF ───────────────────────────────────────────────────────

  @Post('import/pdf/preview')
  @Roles(UserRole.MANAGER, UserRole.COORDINATION, UserRole.ASSISTANT)
  @UseInterceptors(FileInterceptor('file'))
  async importPdfPreview(
    @UploadedFile() file: Express.Multer.File,
  ) {
    if (!file) throw new Error('Arquivo PDF obrigatório');
    return this.gerasImport.previewPdf(file.buffer);
  }

  @Post('import/pdf/confirm')
  @Roles(UserRole.MANAGER, UserRole.COORDINATION, UserRole.ASSISTANT)
  @UseInterceptors(FileInterceptor('file'))
  async importPdfConfirm(
    @UploadedFile() file: Express.Multer.File,
    @Body() body: { unitId?: string; externalNumber?: string },
    @CurrentUser() user: JwtPayload,
  ) {
    if (!file) throw new Error('Arquivo PDF obrigatório');
    return this.gerasImport.confirmImport(file.buffer, body, user);
  }

  // ─── Mapeamento de código externo ─────────────────────────────────────────────

  @Post('external-codes/map')
  @Roles(UserRole.MANAGER, UserRole.COORDINATION)
  mapExternalCode(
    @Body(new ZodValidationPipe(mapExternalCodeSchema)) dto: MapExternalCodeInput,
    @CurrentUser() user: JwtPayload,
  ) {
    return this.geras.mapExternalCode(dto, user);
  }
}
