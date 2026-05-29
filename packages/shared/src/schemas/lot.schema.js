"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.updateLotSchema = exports.createLotSchema = void 0;
const zod_1 = require("zod");
const isoDate = zod_1.z.string()
    .transform((v) => (/^\d{4}-\d{2}-\d{2}$/.test(v) ? v + 'T00:00:00.000Z' : v))
    .pipe(zod_1.z.string().datetime({ message: 'Data inválida' }));
exports.createLotSchema = zod_1.z.object({
    itemId: zod_1.z.string().cuid('Item inválido'),
    lotNumber: zod_1.z.string().min(1, 'Número do lote obrigatório').max(50),
    manufacturingDate: isoDate.nullable().optional(),
    expirationDate: isoDate,
    initialQuantity: zod_1.z.number().positive('Quantidade deve ser maior que zero'),
    supplier: zod_1.z.string().max(200).nullable().optional(),
    invoiceNumber: zod_1.z.string().max(50).nullable().optional(),
    notes: zod_1.z.string().max(500).nullable().optional(),
});
exports.updateLotSchema = zod_1.z.object({
    supplier: zod_1.z.string().max(200).nullable().optional(),
    invoiceNumber: zod_1.z.string().max(50).nullable().optional(),
    notes: zod_1.z.string().max(500).nullable().optional(),
    active: zod_1.z.boolean().optional(),
});
