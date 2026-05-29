import { z } from 'zod';
import { GeraType, GeraItemStatus } from '../enums/gera-status';

const isoDate = z.string()
  .transform((v) => (/^\d{4}-\d{2}-\d{2}$/.test(v) ? v + 'T00:00:00.000Z' : v))
  .pipe(z.string().datetime({ message: 'Data inválida' }));

export const createGeraSchema = z.object({
  externalNumber: z.string().max(20).nullable().optional(),
  type: z.nativeEnum(GeraType).default(GeraType.MONTHLY),
  unitId: z.string().cuid('Unidade inválida'),
  requestedAt: isoDate,
  expectedDelivery: isoDate.nullable().optional(),
  deadline: isoDate.nullable().optional(),
  items: z.array(z.object({
    externalCode: z.string().max(20).nullable().optional(),
    description: z.string().min(1).max(500),
    declaredBalance: z.number().nonnegative().nullable().optional(),
    consumption: z.number().nonnegative().nullable().optional(),
    requested: z.number().positive('Quantidade solicitada deve ser maior que zero'),
  })).optional(),
});

export const updateGeraSchema = createGeraSchema
  .omit({ items: true })
  .partial();

export const addGeraItemSchema = z.object({
  externalCode: z.string().max(20).nullable().optional(),
  description: z.string().min(1).max(500),
  itemId: z.string().cuid().nullable().optional(),
  declaredBalance: z.number().nonnegative().nullable().optional(),
  consumption: z.number().nonnegative().nullable().optional(),
  requested: z.number().positive('Quantidade solicitada deve ser maior que zero'),
});

export const triageItemSchema = z.object({
  status: z.nativeEnum(GeraItemStatus),
  approved: z.number().positive().nullable().optional(),
  denialReason: z.string().min(5).max(300).nullable().optional(),
}).refine(
  (d) => d.status !== GeraItemStatus.APPROVED || (d.approved != null && d.approved > 0),
  { message: 'Informe a quantidade a enviar', path: ['approved'] },
).refine(
  (d) => d.status !== GeraItemStatus.DENIED || !!d.denialReason,
  { message: 'Informe o motivo da negativa', path: ['denialReason'] },
);

export const mapExternalCodeSchema = z.object({
  externalCode: z.string().min(1).max(20),
  itemId: z.string().cuid('Item inválido'),
});

export type CreateGeraInput = z.infer<typeof createGeraSchema>;
export type UpdateGeraInput = z.infer<typeof updateGeraSchema>;
export type AddGeraItemInput = z.infer<typeof addGeraItemSchema>;
export type TriageItemInput = z.infer<typeof triageItemSchema>;
export type MapExternalCodeInput = z.infer<typeof mapExternalCodeSchema>;
