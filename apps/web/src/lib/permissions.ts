import type { User } from '@farmagest/shared';

/**
 * Helpers centralizados de permissão para o frontend.
 *
 * O backend valida tudo independentemente — estes helpers só controlam UI
 * (esconder botões, desabilitar campos) para evitar confusão visual.
 *
 * Atualizar AQUI sempre que regras de negócio mudarem ou novos perfis forem
 * introduzidos. Nunca usar condicionais inline de role nos componentes.
 */

type RoleCheck = (user: Pick<User, 'role'> | null | undefined) => boolean;

// ============ USERS ============

export const canManageUsers: RoleCheck = (user) =>
  user?.role === 'COORDINATION' || user?.role === 'MANAGER';

export const canCreateUsers: RoleCheck = canManageUsers;
export const canEditUsers: RoleCheck = canManageUsers;
export const canDeleteUsers: RoleCheck = canManageUsers;

// ============ UNITS ============

export const canManageUnits: RoleCheck = (user) =>
  user?.role === 'COORDINATION' || user?.role === 'MANAGER';

export const canCreateUnits: RoleCheck = canManageUnits;
export const canEditUnits: RoleCheck = canManageUnits;
export const canDeleteUnits: RoleCheck = canManageUnits;

// ============ SECTORS ============

export const canManageSectors: RoleCheck = (user) => user?.role === 'MANAGER';

export const canCreateSectors: RoleCheck = canManageSectors;
export const canEditSectors: RoleCheck = canManageSectors;
export const canDeleteSectors: RoleCheck = canManageSectors;

// ============ ITEMS ============

export const canManageItems: RoleCheck = (user) =>
  user?.role === 'COORDINATION' || user?.role === 'ADMIN' || user?.role === 'MANAGER';

export const canCreateItems: RoleCheck = canManageItems;
export const canEditItems: RoleCheck = canManageItems;
export const canDeleteItems: RoleCheck = (user) =>
  user?.role === 'COORDINATION' || user?.role === 'MANAGER';

// ============ LOTS ============

export const canManageLots: RoleCheck = canManageItems;
export const canCreateLots: RoleCheck = canManageLots;

// ============ IMPORT ============

export const canImportItems: RoleCheck = canManageItems;
export const canImportUnits: RoleCheck = canManageUnits;

// ============ MOVEMENTS ============

export const canCreateMovements: RoleCheck = (user) =>
  user?.role === 'COORDINATION' || user?.role === 'ADMIN' || user?.role === 'MANAGER';

export const canManageMovements: RoleCheck = (user) =>
  user?.role === 'COORDINATION' || user?.role === 'MANAGER';

// ============ EXTERNAL PARTNERS ============

export const canManageExternalPartners: RoleCheck = (user) =>
  user?.role === 'COORDINATION' || user?.role === 'MANAGER';

export const canDeleteExternalPartners: RoleCheck = (user) => user?.role === 'MANAGER';

// ============ EXCHANGES ============

export const canManageExchanges: RoleCheck = (user) =>
  user?.role === 'COORDINATION' || user?.role === 'MANAGER';

export const canApproveExchanges: RoleCheck = (user) => user?.role === 'MANAGER';

// ============ GERA ============

export const canManageGeras: RoleCheck = (user) =>
  user?.role === 'COORDINATION' || user?.role === 'MANAGER' || user?.role === 'ASSISTANT';

export const canTriageGeras: RoleCheck = (user) =>
  user?.role === 'COORDINATION' || user?.role === 'MANAGER';

export const canDispatchGeras: RoleCheck = canTriageGeras;

export const canImportGeras: RoleCheck = canManageGeras;

// ============ AUDIT ============

export const canViewAudit: RoleCheck = (user) =>
  user?.role === 'MANAGER' || user?.role === 'COORDINATION';

export const canExportAudit: RoleCheck = (user) => user?.role === 'MANAGER';

// ============ HELPERS GLOBAIS ============

/** Usuário vê todos os setores (sem escopo de setor). */
export const hasGlobalView: RoleCheck = (user) => user?.role === 'MANAGER';

/** Usuário tem escopo de setor (COORDINATION/ADMIN/ASSISTANT com sectorId). */
export const hasSectorScope = (user: Pick<User, 'role' | 'sectorId'> | null | undefined): boolean =>
  ['COORDINATION', 'ADMIN', 'ASSISTANT'].includes(user?.role ?? '') && !!user?.sectorId;
