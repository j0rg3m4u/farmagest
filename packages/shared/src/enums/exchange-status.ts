export enum ExchangeStatus {
  DRAFT = 'DRAFT',
  PENDING = 'PENDING',
  APPROVED = 'APPROVED',
  REJECTED = 'REJECTED',
  READY = 'READY',
  EXECUTED = 'EXECUTED',
  COMPLETED = 'COMPLETED',
  CANCELLED = 'CANCELLED',
}

export const EXCHANGE_STATUS_LABELS: Record<ExchangeStatus, string> = {
  [ExchangeStatus.DRAFT]: 'Rascunho',
  [ExchangeStatus.PENDING]: 'Aguardando aprovação',
  [ExchangeStatus.APPROVED]: 'Aprovada',
  [ExchangeStatus.REJECTED]: 'Rejeitada',
  [ExchangeStatus.READY]: 'Pronta para executar',
  [ExchangeStatus.EXECUTED]: 'Executada parcialmente',
  [ExchangeStatus.COMPLETED]: 'Concluída',
  [ExchangeStatus.CANCELLED]: 'Cancelada',
};
