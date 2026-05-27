import {
  Injectable,
  UnauthorizedException,
  ForbiddenException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import * as bcrypt from 'bcrypt';
import * as crypto from 'crypto';
import { PrismaService } from '../../common/prisma/prisma.service';
import type { LoginInput, RefreshTokenInput, JwtPayload, LoginResponse } from '@farmagest/shared';

@Injectable()
export class AuthService {
  constructor(
    private prisma: PrismaService,
    private jwt: JwtService,
    private config: ConfigService,
  ) {}

  async login(dto: LoginInput): Promise<LoginResponse> {
    const user = await this.prisma.user.findUnique({
      where: { email: dto.email },
    });

    const valid = user && (await bcrypt.compare(dto.password, user.passwordHash));
    if (!valid) {
      throw new UnauthorizedException('Credenciais inválidas');
    }

    if (!user.active) {
      throw new ForbiddenException('Usuário inativo');
    }

    await this.prisma.user.update({
      where: { id: user.id },
      data: { lastLoginAt: new Date() },
    });

    const payload: JwtPayload = {
      sub: user.id,
      email: user.email,
      role: user.role,
      unitId: user.unitId,
      sectorId: user.sectorId,
    };

    const accessToken = this.jwt.sign(payload, {
      expiresIn: this.config.get('JWT_EXPIRES_IN', '15m'),
    });

    const refreshToken = await this.createRefreshToken(user.id);

    return {
      accessToken,
      refreshToken,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role as any,
        unitId: user.unitId,
        sectorId: user.sectorId,
        active: user.active,
        lastLoginAt: user.lastLoginAt?.toISOString() ?? null,
        createdAt: user.createdAt.toISOString(),
        updatedAt: user.updatedAt.toISOString(),
      },
    };
  }

  async refresh(dto: RefreshTokenInput): Promise<{ accessToken: string }> {
    const stored = await this.prisma.refreshToken.findUnique({
      where: { token: dto.refreshToken },
      include: { user: true },
    });

    if (!stored || stored.revokedAt || stored.expiresAt < new Date()) {
      throw new UnauthorizedException('Refresh token inválido ou expirado');
    }

    if (!stored.user.active) {
      throw new ForbiddenException('Usuário inativo');
    }

    const payload: JwtPayload = {
      sub: stored.user.id,
      email: stored.user.email,
      role: stored.user.role,
      unitId: stored.user.unitId,
      sectorId: stored.user.sectorId,
    };

    const accessToken = this.jwt.sign(payload, {
      expiresIn: this.config.get('JWT_EXPIRES_IN', '15m'),
    });

    return { accessToken };
  }

  async logout(dto: RefreshTokenInput): Promise<void> {
    await this.prisma.refreshToken.updateMany({
      where: { token: dto.refreshToken, revokedAt: null },
      data: { revokedAt: new Date() },
    });
  }

  async me(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        unitId: true,
        sectorId: true,
        sector: { select: { id: true, name: true, code: true } },
        active: true,
        lastLoginAt: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    if (!user) throw new UnauthorizedException();

    return {
      ...user,
      lastLoginAt: user.lastLoginAt?.toISOString() ?? null,
      createdAt: user.createdAt.toISOString(),
      updatedAt: user.updatedAt.toISOString(),
    };
  }

  private async createRefreshToken(userId: string): Promise<string> {
    const token = crypto.randomBytes(40).toString('hex');
    const expiresInDays = parseInt(
      this.config.get('JWT_REFRESH_EXPIRES_IN', '7').replace(/\D/g, ''),
      10,
    );

    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + expiresInDays);

    await this.prisma.refreshToken.create({
      data: { userId, token, expiresAt },
    });

    return token;
  }
}
