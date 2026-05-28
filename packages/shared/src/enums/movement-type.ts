export enum MovementType {
  ENTRY_PURCHASE = 'ENTRY_PURCHASE',
  ENTRY_EXCHANGE = 'ENTRY_EXCHANGE',
  ENTRY_ADJUSTMENT = 'ENTRY_ADJUSTMENT',
  ENTRY_RETURN = 'ENTRY_RETURN',
  EXIT_SUPPLY = 'EXIT_SUPPLY',
  EXIT_EXCHANGE = 'EXIT_EXCHANGE',
  EXIT_ADJUSTMENT = 'EXIT_ADJUSTMENT',
  EXIT_DISPOSAL = 'EXIT_DISPOSAL',
}

export const MOVEMENT_TYPE_LABELS: Record<MovementType, string> = {
  [MovementType.ENTRY_PURCHASE]: 'Entrada — Compra',
  [MovementType.ENTRY_EXCHANGE]: 'Entrada — Troca',
  [MovementType.ENTRY_ADJUSTMENT]: 'Entrada — Ajuste',
  [MovementType.ENTRY_RETURN]: 'Entrada — Devolução',
  [MovementType.EXIT_SUPPLY]: 'Saída — Abastecimento',
  [MovementType.EXIT_EXCHANGE]: 'Saída — Troca',
  [MovementType.EXIT_ADJUSTMENT]: 'Saída — Ajuste',
  [MovementType.EXIT_DISPOSAL]: 'Saída — Descarte',
};

export const isEntryType = (type: MovementType): boolean => type.startsWith('ENTRY_');
export const isExitType = (type: MovementType): boolean => type.startsWith('EXIT_');
