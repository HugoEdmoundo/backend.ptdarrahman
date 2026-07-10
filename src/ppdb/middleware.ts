import { HTTPException } from 'hono/http-exception'
import type { Context, Next } from 'hono'
import type { Variables } from '../types'

type AccessLevel = 'none' | 'dashboard' | 'read' | 'crud'
const LEVEL_ORDER: Record<AccessLevel, number> = { none: 0, dashboard: 1, read: 2, crud: 3 }

function getPermission(user: Record<string, unknown>, module: string): AccessLevel {
  if (user.user_type === 'superadmin') return 'crud'
  const profile = (user.profile as Record<string, unknown>) || {}
  const overrides = (profile.permissions_override as Record<string, string>) || {}
  if (module in overrides) return overrides[module] as AccessLevel
  const roleId = user.role_id as string | undefined
  if (!roleId) return 'none'
  // Note: role permissions should be passed from the auth middleware
  const rawPermissions = (user as any).role_permissions
  if (rawPermissions && typeof rawPermissions === 'object') {
    return (rawPermissions[module] as AccessLevel) || 'none'
  }
  return 'none'
}

export function requireModuleAccess(module: string, required: AccessLevel = 'read') {
  return async (c: Context<{ Variables: Variables }>, next: Next) => {
    const user = c.get('user')
    const level = getPermission(user, module)
    if (LEVEL_ORDER[level] < LEVEL_ORDER[required]) {
      throw new HTTPException(403, { message: `Access denied: need ${required} on ${module}` })
    }
    await next()
  }
}

// Shortcuts — satu untuk akses PPDB umum, lainnya per sub-module
export const requirePPDBAdmin = requireModuleAccess('ppdb', 'crud')
export const requireFinanceCrud = requireModuleAccess('payment', 'crud')
export const requireSelectionCrud = requireModuleAccess('selection', 'crud')
export const requireNotificationCrud = requireModuleAccess('notification', 'crud')
export const requireDashboardCrud = requireModuleAccess('dashboard', 'crud')
