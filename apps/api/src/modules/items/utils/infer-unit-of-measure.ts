const UNIT_PATTERNS: Array<{ pattern: RegExp; unit: string }> = [
  { pattern: /\bpct\b/i,     unit: 'pct' },
  { pattern: /\bpacote\b/i,  unit: 'pacote' },
  { pattern: /\bcaixa\b/i,   unit: 'caixa' },
  { pattern: /\bfrasco\b/i,  unit: 'frasco' },
  { pattern: /\brolo\b/i,    unit: 'rolo' },
  { pattern: /\btubo\b/i,    unit: 'tubo' },
  { pattern: /\bampola\b/i,  unit: 'ampola' },
  { pattern: /\bsache\b/i,   unit: 'sache' },
  { pattern: /\bcps\b/i,     unit: 'cps' },
  { pattern: /\bcap\b/i,     unit: 'cap' },
  { pattern: /\bcp\b/i,      unit: 'cp' },
  { pattern: /\bml\b/i,      unit: 'ml' },
];

export function inferUnitOfMeasure(description: string): string {
  for (const rule of UNIT_PATTERNS) {
    if (rule.pattern.test(description)) return rule.unit;
  }
  return 'un';
}
