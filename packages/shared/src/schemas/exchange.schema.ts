import { z } from 'zod';

export const createExchangeSchema = z.object({
  partnerId: z.string().cuid('Município parceiro inválido'),
  sectorId: z.string().cuid('Setor inválido'),
  date: z.string().datetime().optional(),
  justification: z.string().min(10, 'Descreva o motivo da troca (mín. 10 caracteres)').max(500),
});

export const updateExchangeSchema = createExchangeSchema
  .omit({ sectorId: true })
  .partial();

export const addExchangeOutputSchema = z.object({
  itemId: z.string().cuid(),
  lotId: z.string().cuid(),
  quantity: z.number().positive(),
  unitValue: z.number().positive().optional(),
  notes: z.string().max(300).nullable().optional(),
});

export const addExchangeInputSchema = z.object({
  itemId: z.string().cuid(),
  declaredLotNumber: z.string().max(50).nullable().optional(),
  declaredExpiration: z.string().datetime().nullable().optional(),
  quantity: z.number().positive(),
  unitValue: z.number().positive('Informe o valor unitário declarado'),
  notes: z.string().max(300).nullable().optional(),
});

export const updateExchangeOutputSchema = addExchangeOutputSchema
  .omit({ itemId: true, lotId: true })
  .partial();

export const updateExchangeInputSchema = addExchangeInputSchema
  .omit({ itemId: true })
  .partial();

export type CreateExchangeInput = z.infer<typeof createExchangeSchema>;
export type UpdateExchangeInput = z.infer<typeof updateExchangeSchema>;
export type AddExchangeOutputInput = z.infer<typeof addExchangeOutputSchema>;
export type AddExchangeInputInput = z.infer<typeof addExchangeInputSchema>;
export type UpdateExchangeOutputInput = z.infer<typeof updateExchangeOutputSchema>;
export type UpdateExchangeInputInput = z.infer<typeof updateExchangeInputSchema>;
