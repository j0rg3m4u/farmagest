import { Controller, Post, Get, Body, UseGuards, HttpCode, HttpStatus } from '@nestjs/common';
import { AuthService } from './auth.service';
import { JwtGuard } from './guards/jwt.guard';
import { CurrentUser } from './decorators/current-user.decorator';
import { ZodValidationPipe } from '../../common/pipes/zod-validation.pipe';
import { loginSchema, refreshTokenSchema, type LoginInput, type RefreshTokenInput, type JwtPayload } from '@farmagest/shared';

@Controller('auth')
export class AuthController {
  constructor(private auth: AuthService) {}

  @Post('login')
  @HttpCode(HttpStatus.OK)
  login(@Body(new ZodValidationPipe(loginSchema)) dto: LoginInput) {
    return this.auth.login(dto);
  }

  @Post('refresh')
  @HttpCode(HttpStatus.OK)
  refresh(@Body(new ZodValidationPipe(refreshTokenSchema)) dto: RefreshTokenInput) {
    return this.auth.refresh(dto);
  }

  @Post('logout')
  @HttpCode(HttpStatus.NO_CONTENT)
  @UseGuards(JwtGuard)
  logout(@Body(new ZodValidationPipe(refreshTokenSchema)) dto: RefreshTokenInput) {
    return this.auth.logout(dto);
  }

  @Get('me')
  @UseGuards(JwtGuard)
  me(@CurrentUser() user: JwtPayload) {
    return this.auth.me(user.sub);
  }
}
