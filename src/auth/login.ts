import { HTTPException } from 'hono/http-exception'
import { createAccessToken, generateRefreshToken, verifyPassword } from './auth'
import {
  getByColumn, getById, createRecord, updateRecord,
  toMysqlDatetime, getRawPool,
} from '../db/mysql'

const LOCKOUT_THRESHOLD = 5
const LOCKOUT_MINUTES = 15
const FAKE_HASH = '$2a$12$LJ3m4ys3Lk0TSwHnbfOMiOXPm1QlFZqFOBmH39JcGpGtI7qJkGzS'

export interface LoginResult {
  access_token: string
  refresh_token: string
  token_type: string
  user: Record<string, unknown>
}

export async function loginUser(
  username: string,
  password: string,
  opts?: { requireActive?: boolean }
): Promise<{ result: LoginResult; user: Record<string, unknown> }> {
  const requireActive = opts?.requireActive !== false

  let user = await getByColumn('users', 'username', username)
  if (!user) user = await getByColumn('users', 'email', username)

  if (!user) {
    throw new HTTPException(401, { message: 'Invalid username or password' })
  }

  if (requireActive && !user.is_active) {
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

  const storedHash = (typeof user.password_hash === 'string') ? user.password_hash : FAKE_HASH
  if (!verifyPassword(password, storedHash)) {
    const attempts = ((user.failed_login_attempts as number) || 0) + 1
    const update: Record<string, unknown> = { failed_login_attempts: attempts }
    if (attempts >= LOCKOUT_THRESHOLD) {
      update.locked_until = toMysqlDatetime(new Date(Date.now() + LOCKOUT_MINUTES * 60 * 1000))
      await updateRecord('users', user.id as string, update)
      throw new HTTPException(429, {
        message: `Account locked due to ${LOCKOUT_THRESHOLD} failed attempts. Try again in ${LOCKOUT_MINUTES} minute(s)`,
      })
    }
    await updateRecord('users', user.id as string, update)
    throw new HTTPException(401, { message: 'Invalid username or password' })
  }

  const now = toMysqlDatetime(new Date())
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
    expires_at: toMysqlDatetime(refreshExpires),
  })

  let roleName = ''
  let rolePermissions: Record<string, unknown> = {}
  let isSuperAdmin = false
  const roleId = user.role_id as string | undefined
  if (roleId) {
    const role = await getById('roles', roleId)
    if (role) {
      roleName = role.name as string
      rolePermissions = typeof role.permissions === 'string' ? JSON.parse(role.permissions as string) : (role.permissions as Record<string, unknown>) || {}
      isSuperAdmin = !!(role as any).is_superadmin
    }
  }

  const pool = getRawPool()
  const [pagePerms] = await pool.execute<any[]>(
    'SELECT page_id FROM user_page_permissions WHERE user_id = ?',
    [user.id] as any
  )

  const result: LoginResult = {
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
      permissions: rolePermissions,
      page_permissions: pagePerms.map((r: any) => r.page_id),
      user_type: user.user_type || 'admin',
      is_superadmin: isSuperAdmin,
    },
  }

  return { result, user }
}
