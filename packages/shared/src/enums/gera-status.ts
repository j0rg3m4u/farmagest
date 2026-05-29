export enum GeraStatus {
  RECEIVED = 'RECEIVED',
  TRIAGING = 'TRIAGING',
  COMPLETED = 'COMPLETED',
  DISPATCHED = 'DISPATCHED',
  CANCELLED = 'CANCELLED',
}

export const GERA_STATUS_LABELS: Record<GeraStatus, string> = {
  [GeraStatus.RECEIVED]: 'Recebido',
  [GeraStatus.TRIAGING]: 'Em triagem',
  [GeraStatus.COMPLETED]: 'Triagem concluída',
  [GeraStatus.DISPATCHED]: 'Despachado',
  [GeraStatus.CANCELLED]: 'Cancelado',
};

export enum GeraItemStatus {
  PENDING = 'PENDING',
  APPROVED = 'APPROVED',
  DENIED = 'DENIED',
}

export const GERA_ITEM_STATUS_LABELS: Record<GeraItemStatus, string> = {
  [GeraItemStatus.PENDING]: 'Pendente',
  [GeraItemStatus.APPROVED]: 'Atendido',
  [GeraItemStatus.DENIED]: 'Negado',
};

export enum GeraType {
  MONTHLY = 'MONTHLY',
  EXTRAORDINARY = 'EXTRAORDINARY',
  URGENT = 'URGENT',
}

export const GERA_TYPE_LABELS: Record<GeraType, string> = {
  [GeraType.MONTHLY]: 'Mensal',
  [GeraType.EXTRAORDINARY]: 'Extraordinário',
  [GeraType.URGENT]: 'Urgente',
};
