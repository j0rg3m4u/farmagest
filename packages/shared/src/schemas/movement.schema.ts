import { z } from 'zod';

export const entryPurchaseSchema = z.object({
  itemId: z.string().cuid(),
  lotId: z.string().cuid(),
  quantity: z.number().positive('Quantidade deve ser positiva'),
  unitValue: z.number().nonnegative().optional(),
  invoiceNumber: z.string().max(50).nullable().optional(),
  reason: z.string().max(300).nullable().optional(),
});

export const exitSupplySchema = z.object({
  itemId: z.string().cuid(),
  lotId: z.string().cuid().optional(),
  unitId: z.string().cuid('Unidade obrigatória para abastecimento'),
  quantity: z.number().positive(),
  reason: z.string().max(300).nullable().optional(),
});

export const adjustmentSchema = z.object({
  itemId: z.string().cuid(),
  lotId: z.string().cuid(),
  direction: z.enum(['ENTRY', 'EXIT']),
  quantity: z.number().positive(),
  reason: z.string().min(5, 'Justificativa obrigatória para ajuste (mín. 5 caracteres)').max(300),
});

export const disposalSchema = z.object({
  itemId: z.string().cuid(),
  lotId: z.string().cuid(),
  quantity: z.number().positive(),
  reason: z.string().min(5, 'Justificativa obrigatória para descarte (mín. 5 caracteres)').max(300),
});

export const reversalSchema = z.object({
  reason: z.string().min(5, 'Justificativa obrigatória para estorno (mín. 5 caracteres)').max(300),
});

export type EntryPurchaseInput = z.infer<typeof entryPurchaseSchema>;
export type ExitSupplyInput = z.infer<typeof exitSupplySchema>;
export type AdjustmentInput = z.infer<typeof adjustmentSchema>;
export type DisposalInput = z.infer<typeof disposalSchema>;
export type ReversalInput = z.infer<typeof reversalSchema>;
