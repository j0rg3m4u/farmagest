"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.updateExternalPartnerSchema = exports.createExternalPartnerSchema = void 0;
const zod_1 = require("zod");
exports.createExternalPartnerSchema = zod_1.z.object({
    name: zod_1.z.string().min(2).max(120),
    cnpj: zod_1.z
        .string()
        .regex(/^\d{14}$/, 'CNPJ deve ter 14 dígitos')
        .nullable()
        .optional(),
    responsibleName: zod_1.z.string().min(2).max(120),
    contact: zod_1.z.string().max(200).nullable().optional(),
    notes: zod_1.z.string().max(500).nullable().optional(),
});
exports.updateExternalPartnerSchema = exports.createExternalPartnerSchema
    .partial()
    .extend({
    active: zod_1.z.boolean().optional(),
});
