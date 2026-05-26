import {
  Injectable,
  NotFoundException,
  ConflictException,
  ForbiddenException,
  UnauthorizedException,
} from '@nestjs/common';
import * as bcrypt from 'bcrypt';
import { PrismaService } from '../../common/prisma/prisma.service';
import { UserRole, type CreateUserInput, type UpdateUserInput, type ChangePasswordInput } from '@farmagest/shared';

const USER_SELECT = {
  id: true,
  name: true,
  email: true,
  role: true,
  unitId: true,
  active: true,
  lastLoginAt: true,
  createdAt: true,
  updatedAt: true,
} as const;

export interface UsersFilter {
  role?: string;
  unitId?: string;
  active?: string;
  search?: string;
  page?: string;
  limit?: string;
}

@Injectable()
export class UsersService {
  constructor(private prisma: PrismaService) {}

  async findAll(filter: UsersFilter) {
    const page = Math.max(1, parseInt(filter.page ?? '1', 10));
    const limit = Math.min(100, Math.max(1, parseInt(filter.limit ?? '20', 10)));
    const skip = (page - 1) * limit;

    const where: Record<string, unknown> = { deletedAt: null };
    if (filter.role) where.role = filter.role;
    if (filter.unitId) where.unitId = filter.unitId;
    if (filter.active !== undefined) where.active = filter.active === 'true';
    if (filter.search) {
      where.OR = [
        { name: { contains: filter.search, mode: 'insensitive' } },
        { email: { contains: filter.search, mode: 'insensitive' } },
      ];
    }

    const [data, total] = await Promise.all([
      this.prisma.user.findMany({ where, skip, take: limit, select: USER_SELECT, orderBy: { name: 'asc' } }),
      this.prisma.user.count({ where }),
    ]);

    return { data, total, page, limit, totalPages: Math.ceil(total / limit) };
  }

  async findOne(id: string) {
    const user = await this.prisma.user.findFirst({ where: { id, deletedAt: null }, select: USER_SELECT });
    if (!user) throw new NotFoundException('Usuário não encontrado');
    return user;
  }

  async create(dto: CreateUserInput) {
    const existing = await this.prisma.user.findUnique({ where: { email: dto.email } });
    if (existing) throw new ConflictException('E-mail já cadastrado');

    const passwordHash = await bcrypt.hash(dto.password, 10);
    const { password: _, ...rest } = dto;

    return this.prisma.user.create({
      data: { ...rest, passwordHash },
      select: USER_SELECT,
    });
  }

  async update(id: string, dto: UpdateUserInput, requesterId: string, requesterRole: UserRole) {
    await this.findOne(id);

    if (requesterId === id && dto.role && requesterRole === UserRole.COORDINATION) {
      const roleOrder = [UserRole.COORDINATION, UserRole.MANAGER, UserRole.ADMIN, UserRole.ASSISTANT, UserRole.UNIT];
      if (roleOrder.indexOf(dto.role as UserRole) > roleOrder.indexOf(requesterRole)) {
        throw new ForbiddenException('Não é possível rebaixar o próprio perfil');
      }
    }

    return this.prisma.user.update({ where: { id }, data: dto, select: USER_SELECT });
  }

  async remove(id: string, requesterId: string) {
    if (id === requesterId) throw new ForbiddenException('Não é possível excluir o próprio usuário');
    await this.findOne(id);
    return this.prisma.user.update({
      where: { id },
      data: { deletedAt: new Date(), active: false },
    });
  }

  async changePassword(id: string, dto: ChangePasswordInput, requesterId: string, requesterRole: UserRole) {
    const isSelf = id === requesterId;
    const isCoordination = requesterRole === UserRole.COORDINATION;

    if (!isSelf && !isCoordination) {
      throw new ForbiddenException('Sem permissão para alterar esta senha');
    }

    const user = await this.prisma.user.findUnique({ where: { id } });
    if (!user) throw new NotFoundException('Usuário não encontrado');

    if (isSelf) {
      const valid = await bcrypt.compare(dto.currentPassword, user.passwordHash);
      if (!valid) throw new UnauthorizedException('Senha atual incorreta');
    }

    const passwordHash = await bcrypt.hash(dto.newPassword, 10);
    await this.prisma.user.update({ where: { id }, data: { passwordHash } });
  }
}
