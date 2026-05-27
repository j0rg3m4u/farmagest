import { z } from 'zod';
import { UserRole } from '../enums';

export const createUserSchema = z
  .object({
    name: z.string().min(2, 'Nome deve ter pelo menos 2 caracteres').max(120),
    email: z.string().email('E-mail inválido').max(180),
    password: z.string().min(8, 'Senha deve ter pelo menos 8 caracteres').max(72),
    role: z.nativeEnum(UserRole, { errorMap: () => ({ message: 'Perfil inválido' }) }),
    unitId: z.string().cuid().nullable().optional(),
    sectorId: z.string().cuid().nullable().optional(),
  })
  .refine(
    (data) => {
      const sectored = ['COORDINATION', 'ADMIN', 'ASSISTANT'] as const;
      if (sectored.includes(data.role as (typeof sectored)[number])) {
        return !!data.sectorId;
      }
      return true;
    },
    { message: 'sectorId é obrigatório para perfis COORDINATION, ADMIN e ASSISTANT', path: ['sectorId'] },
  );

export const updateUserSchema = z
  .object({
    name: z.string().min(2, 'Nome deve ter pelo menos 2 caracteres').max(120).optional(),
    email: z.string().email('E-mail inválido').max(180).optional(),
    role: z.nativeEnum(UserRole, { errorMap: () => ({ message: 'Perfil inválido' }) }).optional(),
    unitId: z.string().cuid().nullable().optional(),
    sectorId: z.string().cuid().nullable().optional(),
    active: z.boolean().optional(),
  })
  .refine(
    (data) => {
      if (!data.role) return true;
      const sectored = ['COORDINATION', 'ADMIN', 'ASSISTANT'] as const;
      if (sectored.includes(data.role as (typeof sectored)[number])) {
        return data.sectorId !== undefined ? !!data.sectorId : true;
      }
      return true;
    },
    { message: 'sectorId é obrigatório para perfis COORDINATION, ADMIN e ASSISTANT', path: ['sectorId'] },
  );

export const changePasswordSchema = z.object({
  currentPassword: z.string().min(1),
  newPassword: z.string().min(8).max(72),
});

export type CreateUserInput = z.infer<typeof createUserSchema>;
export type UpdateUserInput = z.infer<typeof updateUserSchema>;
export type ChangePasswordInput = z.infer<typeof changePasswordSchema>;
