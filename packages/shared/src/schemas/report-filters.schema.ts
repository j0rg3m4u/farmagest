import { z } from 'zod';

export const reportPeriodSchema = z.object({
  dateFrom: z.string().optional(),
  dateTo: z.string().optional(),
  preset: z.enum([
    'this_month',
    'last_month',
    'last_30_days',
    'last_60_days',
    'last_90_days',
    'this_year',
    'custom',
  ]).optional(),
  sectorId: z.string().cuid().optional(),
  unitId: z.string().cuid().optional(),
  itemId: z.string().cuid().optional(),
  format: z.enum(['json', 'pdf', 'excel']).default('json'),
});

export type ReportFilters = z.infer<typeof reportPeriodSchema>;

// UTC-3 (Caxias do Sul)
const TZ_OFFSET_MS = 3 * 60 * 60 * 1000;

export function resolvePeriod(filters: ReportFilters): { from: Date; to: Date } {
  const now = new Date();
  // Trabalhar em horário local UTC-3
  const localNow = new Date(now.getTime() - TZ_OFFSET_MS);

  switch (filters.preset) {
    case 'this_month': {
      const from = new Date(Date.UTC(localNow.getUTCFullYear(), localNow.getUTCMonth(), 1) + TZ_OFFSET_MS);
      const to = new Date(Date.UTC(localNow.getUTCFullYear(), localNow.getUTCMonth() + 1, 0, 23, 59, 59) + TZ_OFFSET_MS);
      return { from, to };
    }
    case 'last_month': {
      const from = new Date(Date.UTC(localNow.getUTCFullYear(), localNow.getUTCMonth() - 1, 1) + TZ_OFFSET_MS);
      const to = new Date(Date.UTC(localNow.getUTCFullYear(), localNow.getUTCMonth(), 0, 23, 59, 59) + TZ_OFFSET_MS);
      return { from, to };
    }
    case 'last_30_days':
      return { from: new Date(Date.now() - 30 * 864e5), to: now };
    case 'last_60_days':
      return { from: new Date(Date.now() - 60 * 864e5), to: now };
    case 'last_90_days':
      return { from: new Date(Date.now() - 90 * 864e5), to: now };
    case 'this_year': {
      const from = new Date(Date.UTC(localNow.getUTCFullYear(), 0, 1) + TZ_OFFSET_MS);
      const to = new Date(Date.UTC(localNow.getUTCFullYear(), 11, 31, 23, 59, 59) + TZ_OFFSET_MS);
      return { from, to };
    }
    default:
      return {
        from: filters.dateFrom ? new Date(filters.dateFrom) : new Date(Date.now() - 30 * 864e5),
        to: filters.dateTo ? new Date(filters.dateTo) : now,
      };
  }
}
