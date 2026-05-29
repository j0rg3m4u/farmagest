"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.updateExchangeInputSchema = exports.updateExchangeOutputSchema = exports.addExchangeInputSchema = exports.addExchangeOutputSchema = exports.updateExchangeSchema = exports.createExchangeSchema = void 0;
const zod_1 = require("zod");
const isoDate = zod_1.z.string()
    .transform((v) => (/^\d{4}-\d{2}-\d{2}$/.test(v) ? v + 'T00:00:00.000Z' : v))
    .pipe(zod_1.z.string().datetime({ message: 'Data inválida' }));
exports.createExchangeSchema = zod_1.z.object({
    partnerId: zod_1.z.string().cuid('Município parceiro inválido'),
    sectorId: zod_1.z.string().cuid('Setor inválido'),
    date: isoDate.optional(),
    justification: zod_1.z.string().min(10, 'Descreva o motivo da troca (mín. 10 caracteres)').max(500),
});
exports.updateExchangeSchema = exports.createExchangeSchema
    .omit({ sectorId: true })
    .partial();
exports.addExchangeOutputSchema = zod_1.z.object({
    itemId: zod_1.z.string().cuid(),
    lotId: zod_1.z.string().cuid(),
    quantity: zod_1.z.number().positive(),
    unitValue: zod_1.z.number().positive().optional(),
    notes: zod_1.z.string().max(300).nullable().optional(),
});
exports.addExchangeInputSchema = zod_1.z.object({
    itemId: zod_1.z.string().cuid(),
    declaredLotNumber: zod_1.z.string().max(50).nullable().optional(),
    declaredExpiration: isoDate.nullable().optional(),
    quantity: zod_1.z.number().positive(),
    unitValue: zod_1.z.number().positive('Informe o valor unitário declarado'),
    notes: zod_1.z.string().max(300).nullable().optional(),
});
exports.updateExchangeOutputSchema = exports.addExchangeOutputSchema
    .omit({ itemId: true, lotId: true })
    .partial();
exports.updateExchangeInputSchema = exports.addExchangeInputSchema
    .omit({ itemId: true })
    .partial();
