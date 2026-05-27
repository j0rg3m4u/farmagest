import { z } from 'zod';
import { ItemCategory } from '../enums';

export const createItemSchema = z.object({
  description: z.string().min(2, 'Descrição obrigatória').max(300),
  category: z.nativeEnum(ItemCategory, { errorMap: () => ({ message: 'Categoria inválida' }) }),
  unitOfMeasure: z.string().min(1, 'Unidade de medida obrigatória').max(30),
  manufacturer: z.string().max(120).nullable().optional(),
  controlled344: z.boolean().default(false),
  sectorId: z.string().cuid('Setor inválido'),
});

export const updateItemSchema = createItemSchema
  .omit({ sectorId: true })
  .partial()
  .extend({
    active: z.boolean().optional(),
  });

export type CreateItemInput = z.infer<typeof createItemSchema>;
export type UpdateItemInput = z.infer<typeof updateItemSchema>;
