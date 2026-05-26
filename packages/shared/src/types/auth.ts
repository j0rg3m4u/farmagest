import { User } from './user';

export interface LoginResponse {
  accessToken: string;
  refreshToken: string;
  user: User;
}

export interface JwtPayload {
  sub: string;
  email: string;
  role: string;
  unitId: string | null;
  iat?: number;
  exp?: number;
}
