import { getById } from '../db/mysql'

export enum AccessLevel {
  NONE = 'none',
  DASHBOARD = 'dashboard',
  READ = 'read',
  CRUD = 'crud',
}

export enum Module {
  COMPANYPROFILE = 'companyprofile',
  STUDENTS = 'students',
  KUNJUNGAN = 'kunjungan',
  PPDB = 'ppdb',
}

const LEVEL_ORDER = [AccessLevel.NONE, AccessLevel.DASHBOARD, AccessLevel.READ, AccessLevel.CRUD]

export const DEFAULT_PERMISSIONS: Record<string, AccessLevel> = {
  [Module.COMPANYPROFILE]: AccessLevel.NONE,
  [Module.STUDENTS]: AccessLevel.NONE,
  [Module.KUNJUNGAN]: AccessLevel.NONE,
  [Module.PPDB]: AccessLevel.NONE,
}

export async function hasModuleAccess(
  user: Record<string, unknown>,
  module: Module,
  required: AccessLevel = AccessLevel.DASHBOARD
): Promise<boolean> {
  if (user.user_type === 'superadmin') return true

  const profile = (user.profile as Record<string, unknown>) || {}
  const overrides = (profile.permissions_override as Record<string, string>) || {}
  if (module in overrides) {
    const idx = LEVEL_ORDER.indexOf(overrides[module] as AccessLevel)
    if (idx >= LEVEL_ORDER.indexOf(required)) return true
  }

  const roleId = user.role_id as string | undefined
  if (!roleId) return false

  const role = await getById('roles', roleId)
  if (!role) return false
  if (role.is_superadmin) return true

  const rawPermissions = role.permissions
  const permissions: Record<string, string> = typeof rawPermissions === 'string' ? JSON.parse(rawPermissions) : (rawPermissions || {})
  const levelStr = permissions[module] || AccessLevel.NONE
  const level = LEVEL_ORDER.indexOf(levelStr as AccessLevel)
  return level >= LEVEL_ORDER.indexOf(required)
}
