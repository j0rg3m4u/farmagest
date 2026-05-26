import { z } from 'zod';
import { UserRole } from '../enums';

export const createUserSchema = z.object({
  name: z.string().min(2, 'Nome deve ter pelo menos 2 caracteres').max(120),
  email: z.string().email('E-mail inválido').max(180),
  password: z.string().min(8, 'Senha deve ter pelo menos 8 caracteres').max(72),
  role: z.nativeEnum(UserRole, { errorMap: () => ({ message: 'Perfil inválido' }) }),
  unitId: z.string().cuid().nullable().optional(),
});

export const updateUserSchema = createUserSchema
  .omit({ password: true })
  .partial()
  .extend({
    active: z.boolean().optional(),
  });

export const changePasswordSchema = z.object({
  currentPassword: z.string().min(1),
  newPassword: z.string().min(8).max(72),
});

export type CreateUserInput = z.infer<typeof createUserSchema>;
export type UpdateUserInput = z.infer<typeof updateUserSchema>;
export type ChangePasswordInput = z.infer<typeof changePasswordSchema>;
