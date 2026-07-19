import { randomUUID } from 'node:crypto'
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
import { validatePassword } from './validators'
import { loginUser } from './login'
import { getCurrentUser } from '../middleware/auth'
import { loginLimiter, refreshLimiter, profileLimiter, registerLimiter } from './rate-limiter'
import {
  getByColumn,
  getById,
  createRecord,
  updateRecord,
  auditLog,
  getRawPool,
  toMysqlDatetime,
} from '../db/mysql'
import { publicUrl, saveUpload } from '../storage'
import type { Variables } from '../types'

const auth = new Hono<{ Variables: Variables }>()

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
  await loginLimiter.checkAsync(c)
  const body = c.req.valid('json')
  const { result } = await loginUser(body.username, body.password)
  return c.json(result)
})

auth.post('/refresh', zValidator('json', refreshSchema), async (c) => {
  await refreshLimiter.checkAsync(c)
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
  if (!user || !user.is_active) {
    throw new HTTPException(401, { message: 'User not found or inactive' })
  }

  await updateRecord('refresh_tokens', stored.id as string, { revoked: true })

  const newAccess = await createAccessToken({ sub: user.id })
  const { raw: rawRefresh, hash: newHash, expiresAt: newExpires } = generateRefreshToken()
  await createRecord('refresh_tokens', {
    user_id: user.id,
    token_hash: newHash,
    expires_at: toMysqlDatetime(newExpires),
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
  let isSuperAdmin = false
  const roleId = user.role_id as string | undefined
  if (roleId) {
    const role = await getById('roles', roleId)
    if (role) {
      roleName = role.name as string
      rolePermissions = typeof role.permissions === 'string' ? JSON.parse(role.permissions) : (role.permissions as Record<string, unknown>) || {}
      isSuperAdmin = !!(role as any).is_superadmin
    }
  }

  const pool = getRawPool()
  const [pagePerms] = await pool.execute<import('mysql2/promise').RowDataPacket[]>(
    'SELECT p.`key` FROM user_page_permissions up JOIN pages p ON up.page_id = p.id WHERE up.user_id = ?',
    [user.id] as any
  )

  return c.json({
    id: user.id,
    username: user.username,
    email: user.email || '',
    full_name: user.full_name || '',
    avatar_url: user.avatar_url || '',
    role_id: roleId,
    role_name: roleName,
    permissions: rolePermissions,
    page_permissions: pagePerms.map(r => r.key),
    user_type: user.user_type || 'admin',
    is_active: user.is_active ?? true,
    is_superadmin: isSuperAdmin,
  })
})

auth.put('/profile', getCurrentUser, zValidator('json', profileSchema), async (c) => {
  await profileLimiter.checkAsync(c)
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
    try { validatePassword(body.new_password) } catch (e: any) {
      throw new HTTPException(400, { message: e.message })
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

  const response = {
    id: user.id,
    username: data.username !== undefined ? data.username : user.username,
    email: data.email !== undefined ? data.email : (user.email || ''),
    full_name: data.full_name !== undefined ? data.full_name : (user.full_name || ''),
    avatar_url: data.avatar_url !== undefined ? data.avatar_url : (user.avatar_url || ''),
    role_id: user.role_id,
    user_type: user.user_type || 'admin',
    is_active: user.is_active ?? true,
  }
  return c.json(response)
})

const registerApplicantSchema = z.object({
  username: z.string().min(3).max(50),
  email: z.string().email(),
  password: z.string().min(8),
  full_name: z.string().min(1),
})

auth.post('/register-applicant', zValidator('json', registerApplicantSchema), async (c) => {
  await registerLimiter.checkAsync(c)
  const body = c.req.valid('json')

  try { validatePassword(body.password) } catch (e: any) {
    throw new HTTPException(400, { message: e.message })
  }

  const existingUser = await getByColumn('users', 'username', body.username)
  if (existingUser) {
    throw new HTTPException(400, { message: 'Username already exists' })
  }

  const existingEmail = await getByColumn('users', 'email', body.email)
  if (existingEmail) {
    throw new HTTPException(400, { message: 'Email already exists' })
  }

  const role = await getByColumn('roles', 'name', 'Calon Murid')
  if (!role) {
    throw new HTTPException(500, { message: 'Default applicant role not found. Run seed first.' })
  }

  const userId = randomUUID()
  const user = await createRecord('users', {
    id: userId,
    username: body.username,
    email: body.email,
    full_name: body.full_name,
    password_hash: hashPassword(body.password),
    role_id: role.id,
    user_type: 'calon_murid',
    is_active: true,
  })

  const accessToken = await createAccessToken({ sub: user.id })
  const { raw: rawRefresh, hash: refreshHash, expiresAt: refreshExpires } = generateRefreshToken()
  await createRecord('refresh_tokens', {
    user_id: user.id,
    token_hash: refreshHash,
    expires_at: toMysqlDatetime(refreshExpires),
  })

  await auditLog({
    userId: user.id as string,
    userUsername: body.username,
    action: 'register',
    entityType: 'applicant',
    entityId: user.id as string,
    ipAddress: c.req.header('x-forwarded-for') || null,
  })

  return c.json({
    access_token: accessToken,
    refresh_token: rawRefresh,
    token_type: 'bearer',
    user: {
      id: user.id,
      username: user.username,
      email: user.email || '',
      full_name: user.full_name || '',
      role_id: role.id,
      role_name: role.name,
      user_type: 'calon_murid',
    },
  })
})

const registerAdminSchema = z.object({
  username: z.string().min(3).max(50),
  password: z.string().min(8),
  role_id: z.string().optional(),
  user_type: z.string().optional(),
})

auth.post('/register', getCurrentUser, zValidator('json', registerAdminSchema), async (c) => {
  await registerLimiter.checkAsync(c)
  const body = c.req.valid('json')

  try { validatePassword(body.password) } catch (e: any) {
    throw new HTTPException(400, { message: e.message })
  }

  const existing = await getByColumn('users', 'username', body.username)
  if (existing) {
    throw new HTTPException(400, { message: 'Username already exists' })
  }

  const user = await createRecord('users', {
    username: body.username,
    password_hash: hashPassword(body.password),
    role_id: body.role_id || null,
    user_type: body.user_type || 'admin',
    is_active: true,
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
  await pool.execute('UPDATE refresh_tokens SET revoked = 1 WHERE user_id = ?', [user.id] as any)
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
