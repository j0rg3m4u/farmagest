import { z } from 'zod';

const isoDate = z.string()
  .transform((v) => (/^\d{4}-\d{2}-\d{2}$/.test(v) ? v + 'T00:00:00.000Z' : v))
  .pipe(z.string().datetime({ message: 'Data inválida' }));

export const createLotSchema = z.object({
  itemId: z.string().cuid('Item inválido'),
  lotNumber: z.string().min(1, 'Número do lote obrigatório').max(50),
  manufacturingDate: isoDate.nullable().optional(),
  expirationDate: isoDate,
  initialQuantity: z.number().positive('Quantidade deve ser maior que zero'),
  supplier: z.string().max(200).nullable().optional(),
  invoiceNumber: z.string().max(50).nullable().optional(),
  notes: z.string().max(500).nullable().optional(),
});

export const updateLotSchema = z.object({
  supplier: z.string().max(200).nullable().optional(),
  invoiceNumber: z.string().max(50).nullable().optional(),
  notes: z.string().max(500).nullable().optional(),
  active: z.boolean().optional(),
});

export type CreateLotInput = z.infer<typeof createLotSchema>;
export type UpdateLotInput = z.infer<typeof updateLotSchema>;
