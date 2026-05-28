import { z } from 'zod';

export const createExternalPartnerSchema = z.object({
  name: z.string().min(2).max(120),
  cnpj: z
    .string()
    .regex(/^\d{14}$/, 'CNPJ deve ter 14 dígitos')
    .nullable()
    .optional(),
  responsibleName: z.string().min(2).max(120),
  contact: z.string().max(200).nullable().optional(),
  notes: z.string().max(500).nullable().optional(),
});

export const updateExternalPartnerSchema = createExternalPartnerSchema
  .partial()
  .extend({
    active: z.boolean().optional(),
  });

export type CreateExternalPartnerInput = z.infer<typeof createExternalPartnerSchema>;
export type UpdateExternalPartnerInput = z.infer<typeof updateExternalPartnerSchema>;
