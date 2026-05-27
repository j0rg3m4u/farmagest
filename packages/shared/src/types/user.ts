import { UserRole } from '../enums';
import type { Sector } from './sector';

export interface User {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  unitId: string | null;
  sectorId: string | null;
  sector?: Pick<Sector, 'id' | 'name' | 'code'> | null;
  active: boolean;
  lastLoginAt: string | null;
  createdAt: string;
  updatedAt: string;
}
