import { Context, Next } from 'hono'
import { HTTPException } from 'hono/http-exception'
import { verifyToken } from '../auth/auth'
import { getById } from '../db/mysql'
import type { Variables } from '../types'

export async function getCurrentUser(c: Context<{ Variables: Variables }>, next: Next) {
  const auth = c.req.header('Authorization')
  if (!auth?.startsWith('Bearer ')) {
    throw new HTTPException(401, { message: 'Missing or invalid token' })
  }

  const token = auth.slice(7)
  const payload = await verifyToken(token)
  if (!payload) {
    throw new HTTPException(401, { message: 'Invalid or expired token' })
  }

  const userId = payload.sub as string | undefined
  if (!userId) {
    throw new HTTPException(401, { message: 'Invalid token payload' })
  }

  const user = await getById('users', userId)
  if (!user) {
    throw new HTTPException(401, { message: 'User not found' })
  }
  if (!user.is_active) {
    throw new HTTPException(403, { message: 'User is inactive' })
  }

  c.set('user', user)
  await next()
}

export async function requireSuperadmin(c: Context<{ Variables: Variables }>, next: Next) {
  const user = c.get('user')
  if (user.user_type === 'superadmin') {
    await next()
    return
  }
  const roleId = user.role_id as string | undefined
  if (roleId) {
    const role = await getById('roles', roleId)
    if (role?.is_superadmin) {
      await next()
      return
    }
  }
  throw new HTTPException(403, { message: 'Superadmin access required' })
}
