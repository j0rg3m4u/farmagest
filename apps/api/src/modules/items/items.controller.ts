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

  @Delete(':id')
  @Roles(UserRole.COORDINATION, UserRole.MANAGER)
  @HttpCode(HttpStatus.NO_CONTENT)
  remove(@Param('id') id: string, @CurrentUser() user: JwtPayload) {
    return this.items.remove(id, user);
  }
}
