export enum OrderStatus {
  DRAFT = 'DRAFT',
  TRIAGE = 'TRIAGE',
  SEPARATION = 'SEPARATION',
  FULFILLED = 'FULFILLED',
  CANCELLED = 'CANCELLED',
}

export const ORDER_STATUS_LABELS: Record<OrderStatus, string> = {
  [OrderStatus.DRAFT]: 'Rascunho',
  [OrderStatus.TRIAGE]: 'Em triagem',
  [OrderStatus.SEPARATION]: 'Em separação',
  [OrderStatus.FULFILLED]: 'Atendido',
  [OrderStatus.CANCELLED]: 'Cancelado',
};
