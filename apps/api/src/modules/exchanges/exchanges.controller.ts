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
  Res,
} from '@nestjs/common';
import type { Response } from 'express';
import { ExchangesService, ExchangesFilter } from './exchanges.service';
import { ExchangesPdfService } from './exchanges-pdf.service';
import { JwtGuard } from '../auth/guards/jwt.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { ZodValidationPipe } from '../../common/pipes/zod-validation.pipe';
import {
  UserRole,
  createExchangeSchema,
  updateExchangeSchema,
  addExchangeOutputSchema,
  addExchangeInputSchema,
  updateExchangeOutputSchema,
  updateExchangeInputSchema,
  type CreateExchangeInput,
  type UpdateExchangeInput,
  type AddExchangeOutputInput,
  type AddExchangeInputInput,
  type UpdateExchangeOutputInput,
  type UpdateExchangeInputInput,
  type JwtPayload,
} from '@farmagest/shared';
import { z } from 'zod';

const reasonSchema = z.object({ reason: z.string().min(5).max(300) });

@Controller('exchanges')
@UseGuards(JwtGuard, RolesGuard)
export class ExchangesController {
  constructor(
    private exchanges: ExchangesService,
    private pdf: ExchangesPdfService,
  ) {}

  @Get()
  findAll(@Query() query: ExchangesFilter, @CurrentUser() user: JwtPayload) {
    return this.exchanges.findAll(query, user);
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.exchanges.findOne(id);
  }

  @Post()
  @Roles(UserRole.COORDINATION, UserRole.MANAGER)
  create(
    @Body(new ZodValidationPipe(createExchangeSchema)) dto: CreateExchangeInput,
    @CurrentUser() user: JwtPayload,
  ) {
    return this.exchanges.create(dto, user);
  }

  @Patch(':id')
  @Roles(UserRole.COORDINATION, UserRole.MANAGER)
  update(
    @Param('id') id: string,
    @Body(new ZodValidationPipe(updateExchangeSchema)) dto: UpdateExchangeInput,
    @CurrentUser() user: JwtPayload,
  ) {
    return this.exchanges.update(id, dto, user);
  }

  // ─── Outputs ─────────────────────────────────────────────────────────────────

  @Post(':id/outputs')
  @Roles(UserRole.COORDINATION, UserRole.MANAGER)
  addOutput(
    @Param('id') id: string,
    @Body(new ZodValidationPipe(addExchangeOutputSchema)) dto: AddExchangeOutputInput,
    @CurrentUser() user: JwtPayload,
  ) {
    return this.exchanges.addOutput(id, dto, user);
  }

  @Patch(':id/outputs/:outputId')
  @Roles(UserRole.COORDINATION, UserRole.MANAGER)
  updateOutput(
    @Param('id') id: string,
    @Param('outputId') outputId: string,
    @Body(new ZodValidationPipe(updateExchangeOutputSchema)) dto: UpdateExchangeOutputInput,
    @CurrentUser() user: JwtPayload,
  ) {
    return this.exchanges.updateOutput(id, outputId, dto, user);
  }

  @Delete(':id/outputs/:outputId')
  @Roles(UserRole.COORDINATION, UserRole.MANAGER)
  @HttpCode(HttpStatus.NO_CONTENT)
  removeOutput(
    @Param('id') id: string,
    @Param('outputId') outputId: string,
    @CurrentUser() user: JwtPayload,
  ) {
    return this.exchanges.removeOutput(id, outputId, user);
  }

  // ─── Inputs ──────────────────────────────────────────────────────────────────

  @Post(':id/inputs')
  @Roles(UserRole.COORDINATION, UserRole.MANAGER)
  addInput(
    @Param('id') id: string,
    @Body(new ZodValidationPipe(addExchangeInputSchema)) dto: AddExchangeInputInput,
    @CurrentUser() user: JwtPayload,
  ) {
    return this.exchanges.addInput(id, dto, user);
  }

  @Patch(':id/inputs/:inputId')
  @Roles(UserRole.COORDINATION, UserRole.MANAGER)
  updateInput(
    @Param('id') id: string,
    @Param('inputId') inputId: string,
    @Body(new ZodValidationPipe(updateExchangeInputSchema)) dto: UpdateExchangeInputInput,
    @CurrentUser() user: JwtPayload,
  ) {
    return this.exchanges.updateInput(id, inputId, dto, user);
  }

  @Delete(':id/inputs/:inputId')
  @Roles(UserRole.COORDINATION, UserRole.MANAGER)
  @HttpCode(HttpStatus.NO_CONTENT)
  removeInput(
    @Param('id') id: string,
    @Param('inputId') inputId: string,
    @CurrentUser() user: JwtPayload,
  ) {
    return this.exchanges.removeInput(id, inputId, user);
  }

  // ─── Fluxo de estado ─────────────────────────────────────────────────────────

  @Post(':id/check-balance')
  checkBalance(@Param('id') id: string) {
    return this.exchanges.checkBalance(id);
  }

  @Post(':id/mark-ready')
  @Roles(UserRole.COORDINATION, UserRole.MANAGER)
  markReady(@Param('id') id: string, @CurrentUser() user: JwtPayload) {
    return this.exchanges.markReady(id, user);
  }

  @Post(':id/approve')
  @Roles(UserRole.MANAGER)
  approve(@Param('id') id: string, @CurrentUser() user: JwtPayload) {
    return this.exchanges.approve(id, user);
  }

  @Post(':id/reject')
  @Roles(UserRole.MANAGER)
  reject(
    @Param('id') id: string,
    @Body(new ZodValidationPipe(reasonSchema)) body: { reason: string },
    @CurrentUser() user: JwtPayload,
  ) {
    return this.exchanges.reject(id, body.reason, user);
  }

  @Post(':id/cancel')
  @Roles(UserRole.COORDINATION, UserRole.MANAGER)
  cancel(
    @Param('id') id: string,
    @Body(new ZodValidationPipe(reasonSchema)) body: { reason: string },
    @CurrentUser() user: JwtPayload,
  ) {
    return this.exchanges.cancel(id, body.reason, user);
  }

  // ─── Execução ────────────────────────────────────────────────────────────────

  @Post(':id/execute-output/:outputId')
  @Roles(UserRole.COORDINATION, UserRole.MANAGER)
  executeOutput(
    @Param('id') id: string,
    @Param('outputId') outputId: string,
    @CurrentUser() user: JwtPayload,
  ) {
    return this.exchanges.executeOutput(id, outputId, user);
  }

  @Post(':id/execute-input/:inputId')
  @Roles(UserRole.COORDINATION, UserRole.MANAGER)
  executeInput(
    @Param('id') id: string,
    @Param('inputId') inputId: string,
    @CurrentUser() user: JwtPayload,
  ) {
    return this.exchanges.executeInput(id, inputId, user);
  }

  @Post(':id/execute-all')
  @Roles(UserRole.COORDINATION, UserRole.MANAGER)
  executeAll(@Param('id') id: string, @CurrentUser() user: JwtPayload) {
    return this.exchanges.executeAll(id, user);
  }

  @Get(':id/pdf')
  async downloadPdf(@Param('id') id: string, @Res() res: Response) {
    const buffer = await this.pdf.generatePdf(id);
    res.set({
      'Content-Type': 'application/pdf',
      'Content-Disposition': `attachment; filename="${id}-acordo.pdf"`,
      'Content-Length': buffer.length,
    });
    res.end(buffer);
  }
}
