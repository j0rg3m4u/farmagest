import { MovementType } from '../enums';

export interface Movement {
  id: string;
  type: MovementType;
  itemId: string;
  item?: { id: string; code: string; description: string };
  lotId: string;
  lot?: { id: string; lotNumber: string; expirationDate: string };
  sectorId: string;
  quantity: string;
  unitValue: string | null;
  balanceAfter: string;
  unitId: string | null;
  unit?: { id: string; name: string } | null;
  invoiceNumber: string | null;
  partnerExchangeId: string | null;
  reason: string | null;
  reversalOfId: string | null;
  createdById: string;
  createdBy?: { id: string; name: string };
  createdAt: string;
}

export interface FefoAllocation {
  lotId: string;
  lotNumber: string;
  expirationDate: string;
  quantity: number;
  available: number;
}

export interface FefoSuggestion {
  allocation: FefoAllocation[];
  fullyAllocated: boolean;
  shortBy: number;
  totalAvailable: number;
}
