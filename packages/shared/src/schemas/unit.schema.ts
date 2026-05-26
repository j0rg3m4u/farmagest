import { z } from 'zod';
import { UnitType } from '../enums';

export const createUnitSchema = z.object({
  name: z.string().min(2).max(180),
  type: z.nativeEnum(UnitType),
  address: z.string().max(300).nullable().optional(),
  responsible: z.string().min(2).max(120),
  contact: z.string().max(60).nullable().optional(),
});

export const updateUnitSchema = createUnitSchema.partial().extend({
  active: z.boolean().optional(),
});

export type CreateUnitInput = z.infer<typeof createUnitSchema>;
export type UpdateUnitInput = z.infer<typeof updateUnitSchema>;
