"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.updateSectorSchema = exports.createSectorSchema = void 0;
const zod_1 = require("zod");
exports.createSectorSchema = zod_1.z.object({
    name: zod_1.z.string().min(2, 'Nome deve ter pelo menos 2 caracteres').max(120),
    code: zod_1.z
        .string()
        .min(2, 'Código deve ter pelo menos 2 caracteres')
        .max(10)
        .regex(/^[A-Z0-9]+$/, 'Código deve conter apenas letras maiúsculas e números'),
    responsible: zod_1.z.string().min(2, 'Responsável deve ter pelo menos 2 caracteres').max(120),
    description: zod_1.z.string().max(500).nullable().optional(),
});
exports.updateSectorSchema = exports.createSectorSchema
    .omit({ code: true })
    .partial()
    .extend({
    active: zod_1.z.boolean().optional(),
});
