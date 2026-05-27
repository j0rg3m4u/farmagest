import { UnitType } from '../enums';

export interface Unit {
  id: string;
  name: string;
  type: UnitType;
  address: string | null;
  responsible: string;
  contact: string | null;
  active: boolean;
  createdAt: string;
  updatedAt: string;
}
