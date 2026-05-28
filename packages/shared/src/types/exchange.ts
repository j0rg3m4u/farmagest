import { ExchangeStatus } from '../enums';
import type { Item } from './item';
import type { Lot } from './lot';

export interface ExternalPartner {
  id: string;
  name: string;
  cnpj: string | null;
  responsibleName: string;
  contact: string | null;
  notes: string | null;
  active: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface ExchangeOutput {
  id: string;
  exchangeId: string;
  itemId: string;
  item?: Item;
  lotId: string;
  lot?: Lot;
  quantity: string;
  unitValue: string;
  subtotal: string;
  executedAt: string | null;
  movementId: string | null;
  notes: string | null;
  createdAt: string;
}

export interface ExchangeInput {
  id: string;
  exchangeId: string;
  itemId: string;
  item?: Item;
  lotId: string | null;
  lot?: Lot | null;
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
  status: ExchangeStatus;
  justification: string;
  tolerancePct: string;
  partnerId: string;
  partner?: ExternalPartner;
  sectorId: string;
  createdById: string;
  approvedById: string | null;
  approvedAt: string | null;
  rejectionReason: string | null;
  cancelledAt: string | null;
  cancellationReason: string | null;
  outputs: ExchangeOutput[];
  inputs: ExchangeInput[];
  totalOutput?: string;
  totalInput?: string;
  difference?: string;
  differencePct?: string;
  isBalanced?: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface Setting {
  id: string;
  requireExchangeApproval: boolean;
  exchangeTolerancePct: string;
  exchangeApprovalThreshold: string;
  exchangeSequence: number;
  updatedAt: string;
  updatedById: string | null;
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
