import { z } from 'zod';

export const createSectorSchema = z.object({
  name: z.string().min(2, 'Nome deve ter pelo menos 2 caracteres').max(120),
  code: z
    .string()
    .min(2, 'Código deve ter pelo menos 2 caracteres')
    .max(10)
    .regex(/^[A-Z0-9]+$/, 'Código deve conter apenas letras maiúsculas e números'),
  responsible: z.string().min(2, 'Responsável deve ter pelo menos 2 caracteres').max(120),
  description: z.string().max(500).nullable().optional(),
});

export const updateSectorSchema = createSectorSchema.partial().extend({
  active: z.boolean().optional(),
});

export type CreateSectorInput = z.infer<typeof createSectorSchema>;
export type UpdateSectorInput = z.infer<typeof updateSectorSchema>;
