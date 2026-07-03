import { Hono } from 'hono'
import { HTTPException } from 'hono/http-exception'
import { zValidator } from '@hono/zod-validator'
import { z } from 'zod'
import {
  createAccessToken,
  generateRefreshToken,
  hashPassword,
  hashRefreshToken,
  verifyPassword,
} from './auth'
import { getCurrentUser } from '../middleware/auth'
import { loginLimiter, refreshLimiter, profileLimiter, registerLimiter } from './rate-limiter'
import { validatePassword } from './validators'
import {
  getByColumn,
  getById,
  createRecord,
  updateRecord,
  auditLog,
  getRawPool,
} from '../db/mysql'
import { publicUrl, saveUpload } from '../storage'
import type { Variables } from '../types'

const auth = new Hono<{ Variables: Variables }>()

const LOCKOUT_THRESHOLD = 5
const LOCKOUT_MINUTES = 15

const loginSchema = z.object({
  username: z.string(),
  password: z.string(),
})

const refreshSchema = z.object({
  refresh_token: z.string(),
})

const profileSchema = z.object({
  username: z.string().optional(),
  email: z.string().optional(),
  full_name: z.string().optional(),
  avatar_url: z.string().optional(),
  old_password: z.string().optional(),
  new_password: z.string().optional(),
})

auth.post('/login', zValidator('json', loginSchema), async (c) => {
  loginLimiter.check(c)
  const body = c.req.valid('json')
  let user = await getByColumn('users', 'username', body.username)
  if (!user) user = await getByColumn('users', 'email', body.username)

  const fakeHash = '$2a$12$LJ3m4ys3Lk0TSwHnbfOMiOXPm1QlFZqFOBmH39JcGpGtI7qJkGzS'
  const storedHash = user ? (user.password_hash as string) : fakeHash
  const passwordValid = verifyPassword(body.password, storedHash)

  if (!user) {
    throw new HTTPException(401, { message: 'Invalid username or password' })
  }

  if (!passwordValid) {
    const attempts = ((user.failed_login_attempts as number) || 0) + 1
    const update: Record<string, unknown> = { failed_login_attempts: attempts }
    if (attempts >= LOCKOUT_THRESHOLD) {
      const lockedUntil = new Date(Date.now() + LOCKOUT_MINUTES * 60 * 1000).toISOString()
      update.locked_until = lockedUntil
      await updateRecord('users', user.id as string, update)
      throw new HTTPException(429, {
        message: `Account locked due to ${LOCKOUT_THRESHOLD} failed attempts. Try again in ${LOCKOUT_MINUTES} minute(s)`,
      })
    }
    await updateRecord('users', user.id as string, update)
    throw new HTTPException(401, { message: 'Invalid username or password' })
  }

  if (user.is_active === false) {
    throw new HTTPException(403, { message: 'User is inactive' })
  }

  const lockedUntil = user.locked_until as string | undefined
  if (lockedUntil) {
    const lockedDt = new Date(lockedUntil.replace('Z', '+00:00'))
    if (lockedDt > new Date()) {
      const remaining = Math.floor((lockedDt.getTime() - Date.now()) / 60000)
      throw new HTTPException(429, { message: `Account locked. Try again in ${remaining} minute(s)` })
    }
  }

  const now = new Date().toISOString()
  await updateRecord('users', user.id as string, {
    last_login_at: now,
    failed_login_attempts: 0,
    locked_until: null,
  })

  const accessToken = await createAccessToken({ sub: user.id })
  const { raw: rawRefresh, hash: refreshHash, expiresAt: refreshExpires } = generateRefreshToken()
  await createRecord('refresh_tokens', {
    user_id: user.id,
    token_hash: refreshHash,
    expires_at: refreshExpires.toISOString(),
  })

  let roleName = ''
  const roleId = user.role_id as string | undefined
  if (roleId) {
    const role = await getById('roles', roleId)
    if (role) roleName = role.name as string
  }

  return c.json({
    access_token: accessToken,
    refresh_token: rawRefresh,
    token_type: 'bearer',
    user: {
      id: user.id,
      username: user.username,
      email: user.email || '',
      full_name: user.full_name || '',
      avatar_url: user.avatar_url || '',
      role_id: roleId,
      role_name: roleName,
      user_type: user.user_type || 'admin',
    },
  })
})

auth.post('/refresh', zValidator('json', refreshSchema), async (c) => {
  refreshLimiter.check(c)
  const body = c.req.valid('json')
  const tokenHash = hashRefreshToken(body.refresh_token)
  const stored = await getByColumn('refresh_tokens', 'token_hash', tokenHash)
  if (!stored || stored.revoked) {
    throw new HTTPException(401, { message: 'Invalid refresh token' })
  }

  const expires = stored.expires_at as string | undefined
  if (expires) {
    const expiresDt = new Date(expires.replace('Z', '+00:00'))
    if (expiresDt < new Date()) {
      throw new HTTPException(401, { message: 'Refresh token expired' })
    }
  }

  const user = await getById('users', stored.user_id as string)
  if (!user || user.is_active === false) {
    throw new HTTPException(401, { message: 'User not found or inactive' })
  }

  await updateRecord('refresh_tokens', stored.id as string, { revoked: true })

  const newAccess = await createAccessToken({ sub: user.id })
  const { raw: rawRefresh, hash: newHash, expiresAt: newExpires } = generateRefreshToken()
  await createRecord('refresh_tokens', {
    user_id: user.id,
    token_hash: newHash,
    expires_at: newExpires.toISOString(),
  })

  return c.json({
    access_token: newAccess,
    refresh_token: rawRefresh,
    token_type: 'bearer',
  })
})

auth.get('/me', getCurrentUser, async (c) => {
  const user = c.get('user')
  let roleName = ''
  let rolePermissions: Record<string, unknown> = {}
  const roleId = user.role_id as string | undefined
  if (roleId) {
    const role = await getById('roles', roleId)
    if (role) {
      roleName = role.name as string
      rolePermissions = (role.permissions as Record<string, unknown>) || {}
    }
  }

  return c.json({
    id: user.id,
    username: user.username,
    email: user.email || '',
    full_name: user.full_name || '',
    avatar_url: user.avatar_url || '',
    role_id: roleId,
    role_name: roleName,
    permissions: rolePermissions,
    user_type: user.user_type || 'admin',
    is_active: user.is_active ?? true,
  })
})

auth.put('/profile', getCurrentUser, zValidator('json', profileSchema), async (c) => {
  profileLimiter.check(c)
  const body = c.req.valid('json')
  const user = c.get('user')

  const data: Record<string, unknown> = {}
  if (body.username !== undefined) data.username = body.username
  if (body.email !== undefined) data.email = body.email
  if (body.full_name !== undefined) data.full_name = body.full_name
  if (body.avatar_url !== undefined) data.avatar_url = body.avatar_url

  if (body.new_password) {
    if (!body.old_password) {
      throw new HTTPException(400, { message: 'Old password is required' })
    }
    if (!verifyPassword(body.old_password, user.password_hash as string)) {
      throw new HTTPException(400, { message: 'Old password is incorrect' })
    }
    data.password_hash = hashPassword(body.new_password)
  }

  if (data.email) {
    if (user.user_type !== 'superadmin') {
      throw new HTTPException(403, { message: 'Only superadmin can change email' })
    }
    const existing = await getByColumn('users', 'email', data.email)
    if (existing && existing.id !== user.id) {
      throw new HTTPException(400, { message: 'Email already in use' })
    }
  }

  if (data.username) {
    const existing = await getByColumn('users', 'username', data.username)
    if (existing && existing.id !== user.id) {
      throw new HTTPException(400, { message: 'Username already in use' })
    }
  }

  if (Object.keys(data).length > 0) {
    await updateRecord('users', user.id as string, data)
  }

  if (body.new_password) {
    const pool = getRawPool()
    const [rows] = await pool.execute<import('mysql2/promise').RowDataPacket[]>('SELECT id FROM refresh_tokens WHERE user_id = ?', [user.id] as any)
    for (const row of rows) {
      await updateRecord('refresh_tokens', row.id, { revoked: true })
    }
  }

  const changes: Record<string, unknown> = {}
  for (const [k, v] of Object.entries(data)) {
    if (k !== 'password_hash') {
      const oldVal = user[k]
      if (oldVal !== v) {
        changes[k] = { old: oldVal, new: v }
      }
    }
  }

  await auditLog({
    userId: user.id as string,
    userUsername: user.username as string,
    action: 'update',
    entityType: 'auth_profile',
    entityId: user.id as string,
    changes: Object.keys(changes).length ? changes : null,
    ipAddress: c.req.header('x-forwarded-for') || null,
  })

  const response = { ...user, ...data }
  delete (response as any).password_hash
  return c.json(response)
})

auth.post('/register', getCurrentUser, zValidator('json', loginSchema), async (c) => {
  registerLimiter.check(c)
  const body = c.req.valid('json')

  const existing = await getByColumn('users', 'username', body.username)
  if (existing) {
    throw new HTTPException(400, { message: 'Username already exists' })
  }

  const user = await createRecord('users', {
    username: body.username,
    password_hash: hashPassword(body.password),
  })

  const token = await createAccessToken({ sub: user.id })
  return c.json({
    access_token: token,
    token_type: 'bearer',
    user: { id: user.id, username: user.username },
  })
})

auth.post('/logout', getCurrentUser, async (c) => {
  const user = c.get('user')
  const pool = getRawPool()
  await pool.execute('UPDATE refresh_tokens SET revoked = 1, updated_at = NOW() WHERE user_id = ?', [user.id] as any)
  return c.json({ message: 'Logged out' })
})

auth.post('/upload', getCurrentUser, async (c) => {
  const fd = await c.req.formData()
  const file = fd.get('file') as File | null
  if (!file) throw new HTTPException(400, { message: 'No file uploaded' })

  try {
    const filename = await saveUpload(file)
    const url = publicUrl(filename)
    return c.json({ url })
  } catch (e: any) {
    throw new HTTPException(400, { message: e.message })
  }
})

export default auth
