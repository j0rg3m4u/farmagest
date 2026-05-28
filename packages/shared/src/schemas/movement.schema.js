"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.reversalSchema = exports.disposalSchema = exports.adjustmentSchema = exports.exitSupplySchema = exports.entryPurchaseSchema = void 0;
const zod_1 = require("zod");
exports.entryPurchaseSchema = zod_1.z.object({
    itemId: zod_1.z.string().cuid(),
    lotId: zod_1.z.string().cuid(),
    quantity: zod_1.z.number().positive('Quantidade deve ser positiva'),
    unitValue: zod_1.z.number().nonnegative().optional(),
    invoiceNumber: zod_1.z.string().max(50).nullable().optional(),
    reason: zod_1.z.string().max(300).nullable().optional(),
});
exports.exitSupplySchema = zod_1.z.object({
    itemId: zod_1.z.string().cuid(),
    lotId: zod_1.z.string().cuid().optional(),
    unitId: zod_1.z.string().cuid('Unidade obrigatória para abastecimento'),
    quantity: zod_1.z.number().positive(),
    reason: zod_1.z.string().max(300).nullable().optional(),
});
exports.adjustmentSchema = zod_1.z.object({
    itemId: zod_1.z.string().cuid(),
    lotId: zod_1.z.string().cuid(),
    direction: zod_1.z.enum(['ENTRY', 'EXIT']),
    quantity: zod_1.z.number().positive(),
    reason: zod_1.z.string().min(5, 'Justificativa obrigatória para ajuste (mín. 5 caracteres)').max(300),
});
exports.disposalSchema = zod_1.z.object({
    itemId: zod_1.z.string().cuid(),
    lotId: zod_1.z.string().cuid(),
    quantity: zod_1.z.number().positive(),
    reason: zod_1.z.string().min(5, 'Justificativa obrigatória para descarte (mín. 5 caracteres)').max(300),
});
exports.reversalSchema = zod_1.z.object({
    reason: zod_1.z.string().min(5, 'Justificativa obrigatória para estorno (mín. 5 caracteres)').max(300),
});
