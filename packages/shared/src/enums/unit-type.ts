export enum UnitType {
  UBS = 'UBS',
  UPA = 'UPA',
  HOSPITAL = 'HOSPITAL',
  CAPS = 'CAPS',
  OTHER = 'OTHER',
}

export const UNIT_TYPE_LABELS: Record<UnitType, string> = {
  [UnitType.UBS]: 'UBS',
  [UnitType.UPA]: 'UPA',
  [UnitType.HOSPITAL]: 'Hospital',
  [UnitType.CAPS]: 'CAPS',
  [UnitType.OTHER]: 'Outra',
};
