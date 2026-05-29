"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.mapExternalCodeSchema = exports.triageItemSchema = exports.addGeraItemSchema = exports.updateGeraSchema = exports.createGeraSchema = void 0;
const zod_1 = require("zod");
const gera_status_1 = require("../enums/gera-status");
const isoDate = zod_1.z.string()
    .transform((v) => (/^\d{4}-\d{2}-\d{2}$/.test(v) ? v + 'T00:00:00.000Z' : v))
    .pipe(zod_1.z.string().datetime({ message: 'Data inválida' }));
exports.createGeraSchema = zod_1.z.object({
    externalNumber: zod_1.z.string().max(20).nullable().optional(),
    type: zod_1.z.nativeEnum(gera_status_1.GeraType).default(gera_status_1.GeraType.MONTHLY),
    unitId: zod_1.z.string().cuid('Unidade inválida'),
    requestedAt: isoDate,
    expectedDelivery: isoDate.nullable().optional(),
    deadline: isoDate.nullable().optional(),
    items: zod_1.z.array(zod_1.z.object({
        externalCode: zod_1.z.string().max(20).nullable().optional(),
        description: zod_1.z.string().min(1).max(500),
        declaredBalance: zod_1.z.number().nonnegative().nullable().optional(),
        consumption: zod_1.z.number().nonnegative().nullable().optional(),
        requested: zod_1.z.number().positive('Quantidade solicitada deve ser maior que zero'),
    })).optional(),
});
exports.updateGeraSchema = exports.createGeraSchema
    .omit({ items: true })
    .partial();
exports.addGeraItemSchema = zod_1.z.object({
    externalCode: zod_1.z.string().max(20).nullable().optional(),
    description: zod_1.z.string().min(1).max(500),
    itemId: zod_1.z.string().cuid().nullable().optional(),
    declaredBalance: zod_1.z.number().nonnegative().nullable().optional(),
    consumption: zod_1.z.number().nonnegative().nullable().optional(),
    requested: zod_1.z.number().positive('Quantidade solicitada deve ser maior que zero'),
});
exports.triageItemSchema = zod_1.z.object({
    status: zod_1.z.nativeEnum(gera_status_1.GeraItemStatus),
    approved: zod_1.z.number().positive().nullable().optional(),
    denialReason: zod_1.z.string().min(5).max(300).nullable().optional(),
}).refine((d) => d.status !== gera_status_1.GeraItemStatus.APPROVED || (d.approved != null && d.approved > 0), { message: 'Informe a quantidade a enviar', path: ['approved'] }).refine((d) => d.status !== gera_status_1.GeraItemStatus.DENIED || !!d.denialReason, { message: 'Informe o motivo da negativa', path: ['denialReason'] });
exports.mapExternalCodeSchema = zod_1.z.object({
    externalCode: zod_1.z.string().min(1).max(20),
    itemId: zod_1.z.string().cuid('Item inválido'),
});
