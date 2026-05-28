"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.changePasswordSchema = exports.updateUserSchema = exports.createUserSchema = void 0;
const zod_1 = require("zod");
const enums_1 = require("../enums");
exports.createUserSchema = zod_1.z
    .object({
    name: zod_1.z.string().min(2, 'Nome deve ter pelo menos 2 caracteres').max(120),
    email: zod_1.z.string().email('E-mail inválido').max(180),
    password: zod_1.z.string().min(8, 'Senha deve ter pelo menos 8 caracteres').max(72),
    role: zod_1.z.nativeEnum(enums_1.UserRole, { errorMap: () => ({ message: 'Perfil inválido' }) }),
    unitId: zod_1.z.string().cuid().nullable().optional(),
    sectorId: zod_1.z.string().cuid().nullable().optional(),
})
    .refine((data) => {
    const sectored = ['COORDINATION', 'ADMIN', 'ASSISTANT'];
    if (sectored.includes(data.role)) {
        return !!data.sectorId;
    }
    return true;
}, { message: 'sectorId é obrigatório para perfis COORDINATION, ADMIN e ASSISTANT', path: ['sectorId'] });
exports.updateUserSchema = zod_1.z
    .object({
    name: zod_1.z.string().min(2, 'Nome deve ter pelo menos 2 caracteres').max(120).optional(),
    email: zod_1.z.string().email('E-mail inválido').max(180).optional(),
    role: zod_1.z.nativeEnum(enums_1.UserRole, { errorMap: () => ({ message: 'Perfil inválido' }) }).optional(),
    unitId: zod_1.z.string().cuid().nullable().optional(),
    sectorId: zod_1.z.string().cuid().nullable().optional(),
    active: zod_1.z.boolean().optional(),
})
    .refine((data) => {
    if (!data.role)
        return true;
    const sectored = ['COORDINATION', 'ADMIN', 'ASSISTANT'];
    if (sectored.includes(data.role)) {
        return data.sectorId !== undefined ? !!data.sectorId : true;
    }
    return true;
}, { message: 'sectorId é obrigatório para perfis COORDINATION, ADMIN e ASSISTANT', path: ['sectorId'] });
exports.changePasswordSchema = zod_1.z.object({
    currentPassword: zod_1.z.string().min(1),
    newPassword: zod_1.z.string().min(8).max(72),
});
