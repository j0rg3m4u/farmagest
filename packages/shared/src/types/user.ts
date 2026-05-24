import { UserRole } from '../enums';

export interface User {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  unitId: string | null;
  active: boolean;
  lastLoginAt: string | null;
  createdAt: string;
  updatedAt: string;
}
