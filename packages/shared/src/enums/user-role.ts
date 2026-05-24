export enum UserRole {
  COORDINATION = 'COORDINATION',
  ADMIN = 'ADMIN',
  ASSISTANT = 'ASSISTANT',
  UNIT = 'UNIT',
  MANAGER = 'MANAGER',
}

export const USER_ROLE_LABELS: Record<UserRole, string> = {
  [UserRole.COORDINATION]: 'Coordenação',
  [UserRole.ADMIN]: 'Administrativo',
  [UserRole.ASSISTANT]: 'Auxiliar',
  [UserRole.UNIT]: 'Unidade',
  [UserRole.MANAGER]: 'Gestor',
};
