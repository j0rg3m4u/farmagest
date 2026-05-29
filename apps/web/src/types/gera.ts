export interface GeraItem {
  id: string;
  geraId: string;
  externalCode: string | null;
  description: string;
  itemId: string | null;
  item: { id: string; code: string; description: string; unitValue: string | null } | null;
  sectorId: string | null;
  sector: { id: string; name: string; code: string } | null;
  declaredBalance: string | null;
  consumption: string | null;
  requested: string;
  status: 'PENDING' | 'APPROVED' | 'DENIED';
  approved: string | null;
  denialReason: string | null;
  triagedById: string | null;
  triagedBy: { id: string; name: string } | null;
  triagedAt: string | null;
  movementId: string | null;
  lotId: string | null;
  lot: { id: string; lotNumber: string; expirationDate: string; currentBalance: string } | null;
  currentStock?: number | null;
  createdAt: string;
  updatedAt: string;
}

export interface Gera {
  id: string;
  code: string;
  externalNumber: string | null;
  status: 'RECEIVED' | 'TRIAGING' | 'COMPLETED' | 'DISPATCHED' | 'CANCELLED';
  type: 'MONTHLY' | 'EXTRAORDINARY' | 'URGENT';
  unitId: string;
  unit: { id: string; name: string; type: string } | null;
  requestedAt: string;
  expectedDelivery: string | null;
  deadline: string | null;
  importedFrom: string | null;
  importedFileUrl: string | null;
  registeredById: string;
  registeredBy: { id: string; name: string } | null;
  _count?: { items: number };
  items?: GeraItem[];
  createdAt: string;
  updatedAt: string;
}

export interface GerasListResponse {
  data: Gera[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export interface DispatchPreview {
  items: Array<{
    geraItemId: string;
    item: { id: string; code: string; description: string } | null;
    fefo: {
      allocation: Array<{ lotId: string; lotNumber: string; quantity: number }>;
      fullyAllocated: boolean;
      shortBy: number;
      totalAvailable: number;
    } | null;
    warning: string | null;
  }>;
  canDispatch: boolean;
  warnings: Array<string | null>;
  total: number;
}

export interface ExternalCodeMapping {
  id: string;
  externalCode: string;
  itemId: string;
  item: { id: string; code: string; description: string; sectorId: string };
  confirmedById: string | null;
  confirmedAt: string | null;
  createdAt: string;
}
