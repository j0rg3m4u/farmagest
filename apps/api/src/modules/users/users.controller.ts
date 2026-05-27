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
import { UsersService } from './users.service';
import { JwtGuard } from '../auth/guards/jwt.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { ZodValidationPipe } from '../../common/pipes/zod-validation.pipe';
import {
  createUserSchema,
  updateUserSchema,
  changePasswordSchema,
  UserRole,
  type CreateUserInput,
  type UpdateUserInput,
  type ChangePasswordInput,
  type JwtPayload,
} from '@farmagest/shared';

@Controller('users')
@UseGuards(JwtGuard, RolesGuard)
export class UsersController {
  constructor(private users: UsersService) {}

  @Get()
  @Roles(UserRole.COORDINATION, UserRole.MANAGER)
  findAll(@Query() query: Record<string, string>, @CurrentUser() user: JwtPayload) {
    const filter = { ...query };
    if (user.role !== UserRole.MANAGER && user.sectorId) {
      filter.sectorId = user.sectorId;
    }
    return this.users.findAll(filter);
  }

  @Get(':id')
  findOne(@Param('id') id: string, @CurrentUser() user: JwtPayload) {
    const isSelf = user.sub === id;
    const canSeeAll = [UserRole.COORDINATION as string, UserRole.MANAGER as string].includes(user.role);
    if (!isSelf && !canSeeAll) throw new ForbiddenException('Acesso negado');
    return this.users.findOne(id);
  }

  @Post()
  @Roles(UserRole.COORDINATION)
  create(@Body(new ZodValidationPipe(createUserSchema)) dto: CreateUserInput) {
    return this.users.create(dto);
  }

  @Patch(':id')
  @Roles(UserRole.COORDINATION)
  update(
    @Param('id') id: string,
    @Body(new ZodValidationPipe(updateUserSchema)) dto: UpdateUserInput,
    @CurrentUser() user: JwtPayload,
  ) {
    return this.users.update(id, dto, user.sub, user.role as UserRole);
  }

  @Delete(':id')
  @Roles(UserRole.COORDINATION)
  @HttpCode(HttpStatus.NO_CONTENT)
  remove(@Param('id') id: string, @CurrentUser() user: JwtPayload) {
    return this.users.remove(id, user.sub);
  }

  @Post(':id/change-password')
  @HttpCode(HttpStatus.NO_CONTENT)
  changePassword(
    @Param('id') id: string,
    @Body(new ZodValidationPipe(changePasswordSchema)) dto: ChangePasswordInput,
    @CurrentUser() user: JwtPayload,
  ) {
    return this.users.changePassword(id, dto, user.sub, user.role as UserRole);
  }
}
