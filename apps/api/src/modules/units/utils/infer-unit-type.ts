import { UnitType } from '@farmagest/shared';

const PREFIX_RULES: Array<{ pattern: RegExp; type: UnitType }> = [
  { pattern: /^UBS\b/i,      type: UnitType.UBS },
  { pattern: /^UPA\b/i,      type: UnitType.UPA },
  { pattern: /^USF\b/i,      type: UnitType.UBS },
  { pattern: /^CF\b/i,       type: UnitType.UBS },
  { pattern: /^HOSPITAL\b/i, type: UnitType.HOSPITAL },
  { pattern: /^CAPS\b/i,     type: UnitType.CAPS },
];

export function inferUnitType(name: string): UnitType {
  const trimmed = name.trim();
  for (const rule of PREFIX_RULES) {
    if (rule.pattern.test(trimmed)) return rule.type;
  }
  return UnitType.OTHER;
}
