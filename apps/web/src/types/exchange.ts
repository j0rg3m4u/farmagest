export interface ExchangeOutputItem {
  id: string;
  exchangeId: string;
  itemId: string;
  item: { id: string; code: string; description: string; unitValue: string | null };
  lotId: string;
  lot: { id: string; lotNumber: string; expirationDate: string; currentBalance: string };
  quantity: string;
  unitValue: string;
  subtotal: string;
  executedAt: string | null;
  movementId: string | null;
  notes: string | null;
  createdAt: string;
}

export interface ExchangeInputItem {
  id: string;
  exchangeId: string;
  itemId: string;
  item: { id: string; code: string; description: string; unitValue: string | null };
  lotId: string | null;
  lot: { id: string; lotNumber: string; expirationDate: string; currentBalance: string } | null;
  declaredLotNumber: string | null;
  declaredExpiration: string | null;
  quantity: string;
  unitValue: string;
  subtotal: string;
  executedAt: string | null;
  movementId: string | null;
  notes: string | null;
  createdAt: string;
}

export interface Exchange {
  id: string;
  code: string;
  sequence: number;
  date: string;
  status: string;
  justification: string;
  tolerancePct: string;
  partnerId: string;
  partner: { id: string; name: string; responsibleName: string } | null;
  sectorId: string;
  sector: { id: string; name: string } | null;
  createdById: string;
  createdBy: { id: string; name: string } | null;
  approvedById: string | null;
  approvedBy: { id: string; name: string } | null;
  approvedAt: string | null;
  rejectionReason: string | null;
  cancelledAt: string | null;
  cancellationReason: string | null;
  outputs: ExchangeOutputItem[];
  inputs: ExchangeInputItem[];
  totalOutput: number;
  totalInput: number;
  difference: number;
  differencePct: number;
  isBalanced: boolean;
  hasOutputs: boolean;
  hasInputs: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface BalanceResult {
  totalOutput: number;
  totalInput: number;
  difference: number;
  differencePct: number;
  tolerance: number;
  isBalanced: boolean;
  hasOutputs: boolean;
  hasInputs: boolean;
}

export interface ExchangesListResponse {
  data: Exchange[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}
