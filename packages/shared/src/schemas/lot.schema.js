"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.updateLotSchema = exports.createLotSchema = void 0;
const zod_1 = require("zod");
exports.createLotSchema = zod_1.z.object({
    itemId: zod_1.z.string().cuid('Item inválido'),
    lotNumber: zod_1.z.string().min(1, 'Número do lote obrigatório').max(50),
    manufacturingDate: zod_1.z.string().datetime().nullable().optional(),
    expirationDate: zod_1.z.string().datetime('Data de validade obrigatória'),
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
