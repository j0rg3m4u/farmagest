import type { JwtPayload } from '@farmagest/shared';

const GLOBAL_ROLES = ['SUPERADMIN', 'MANAGER'] as const;

export const isGlobalRole = (user: JwtPayload): boolean =>
  (GLOBAL_ROLES as readonly string[]).includes(user.role);

export const getSectorFilter = (
  user: JwtPayload,
  requestedSectorId?: string,
): string | undefined => {
  if (isGlobalRole(user)) return requestedSectorId;
  return user.sectorId ?? undefined;
};
