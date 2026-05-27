import { ItemCategory } from '../enums';

export interface Item {
  id: string;
  code: string;
  description: string;
  category: ItemCategory;
  unitOfMeasure: string;
  manufacturer: string | null;
  controlled344: boolean;
  active: boolean;
  sectorId: string;
  sector?: { id: string; name: string; code: string };
  createdAt: string;
  updatedAt: string;
}
