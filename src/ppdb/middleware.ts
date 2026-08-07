import { Context, Next } from 'hono'
import { HTTPException } from 'hono/http-exception'
import { getCurrentUser } from '../middleware/auth'
import { hasModuleAccess, Module, AccessLevel } from '../auth/permissions'
import type { Variables } from '../types'

export function requireModuleAccess(module: Module, required: AccessLevel = AccessLevel.READ) {
  return async (c: Context<{ Variables: Variables }>, next: Next) => {
    await getCurrentUser(c, async () => {
      const user = c.get('user')
      if (!await hasModuleAccess(user, module, required)) {
        throw new HTTPException(403, { message: 'Access denied' })
      }
      await next()
    })
  }
}

export const requirePPDBRead  = requireModuleAccess(Module.PPDB, AccessLevel.READ)
export const requirePPDBAdmin = requireModuleAccess(Module.PPDB, AccessLevel.CRUD)
