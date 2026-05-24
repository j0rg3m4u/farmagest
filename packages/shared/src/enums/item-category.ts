export enum ItemCategory {
  MEDICATION = 'MEDICATION',
  CORRELATE = 'CORRELATE',
}

export const ITEM_CATEGORY_LABELS: Record<ItemCategory, string> = {
  [ItemCategory.MEDICATION]: 'Medicamento',
  [ItemCategory.CORRELATE]: 'Correlato',
};
