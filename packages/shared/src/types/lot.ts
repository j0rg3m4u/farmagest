import type { Item } from './item';

export interface Lot {
  id: string;
  itemId: string;
  item?: Item;
  lotNumber: string;
  manufacturingDate: string | null;
  expirationDate: string;
  initialQuantity: string;
  currentBalance: string;
  unitCost: string | null;
  supplier: string | null;
  invoiceNumber: string | null;
  notes: string | null;
  active: boolean;
  createdAt: string;
  updatedAt: string;
}
