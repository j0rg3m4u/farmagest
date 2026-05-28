"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.updateUnitSchema = exports.createUnitSchema = void 0;
const zod_1 = require("zod");
const enums_1 = require("../enums");
exports.createUnitSchema = zod_1.z.object({
    name: zod_1.z.string().min(2).max(180),
    type: zod_1.z.nativeEnum(enums_1.UnitType),
    address: zod_1.z.string().max(300).nullable().optional(),
    responsible: zod_1.z.string().min(2).max(120),
    contact: zod_1.z.string().max(60).nullable().optional(),
});
exports.updateUnitSchema = exports.createUnitSchema.partial().extend({
    active: zod_1.z.boolean().optional(),
});
