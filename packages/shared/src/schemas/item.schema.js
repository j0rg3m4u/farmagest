"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.updateItemSchema = exports.createItemSchema = void 0;
const zod_1 = require("zod");
const enums_1 = require("../enums");
exports.createItemSchema = zod_1.z.object({
    description: zod_1.z.string().min(2, 'Descrição obrigatória').max(300),
    category: zod_1.z.nativeEnum(enums_1.ItemCategory, { errorMap: () => ({ message: 'Categoria inválida' }) }),
    unitOfMeasure: zod_1.z.string().min(1, 'Unidade de medida obrigatória').max(30),
    manufacturer: zod_1.z.string().max(120).nullable().optional(),
    controlled344: zod_1.z.boolean().default(false),
    sectorId: zod_1.z.string().cuid('Setor inválido'),
});
exports.updateItemSchema = exports.createItemSchema
    .omit({ sectorId: true })
    .partial()
    .extend({
    active: zod_1.z.boolean().optional(),
});
