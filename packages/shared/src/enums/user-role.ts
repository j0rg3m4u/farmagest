export enum UserRole {
  SUPERADMIN  = 'SUPERADMIN',
  MANAGER     = 'MANAGER',
  COORDINATION = 'COORDINATION',
  ADMIN       = 'ADMIN',
  ASSISTANT   = 'ASSISTANT',
  UNIT        = 'UNIT',
}

export const USER_ROLE_LABELS: Record<UserRole, string> = {
  [UserRole.SUPERADMIN]:   'Super Administrador',
  [UserRole.MANAGER]:      'Gestor',
  [UserRole.COORDINATION]: 'Coordenação',
  [UserRole.ADMIN]:        'Administrativo',
  [UserRole.ASSISTANT]:    'Auxiliar',
  [UserRole.UNIT]:         'Unidade',
};
