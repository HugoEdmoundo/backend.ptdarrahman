import { Hono } from 'hono'
import { HTTPException } from 'hono/http-exception'
import { z } from 'zod'
import { zValidator } from '@hono/zod-validator'
import { createAccessToken, generateRefreshToken, hashRefreshToken } from '../auth/auth'
import { loginUser } from '../auth/login'
import { AccessLevel, Module, hasModuleAccess } from '../auth/permissions'
import { loginLimiter } from '../auth/rate-limiter'
import { getCurrentUser } from '../middleware/auth'
import {
  listAll, getByColumn, getById, getBySlug, getFirst,
  createRecord, updateRecord, deleteRecord,
  toMysqlDatetime,
} from '../db/mysql'
import { deleteUpload, publicUrl, saveUpload } from '../storage'
import { handleSSE, emit } from '../sse'
import type { Variables } from '../types'

const cp = new Hono<{ Variables: Variables }>()

const TABLES: Record<string, string> = {
  news: 'news_articles', programs: 'programs', facilities: 'facilities',
  staff: 'staff', achievements: 'achievements', gallery: 'gallery_items',
  'social-links': 'social_links', testimonials: 'testimonials',
}

function getTable(entity: string): string {
  const t = TABLES[entity]
  if (!t) throw new HTTPException(400, { message: `Unknown entity: ${entity}` })
  return t
}

const PUBLIC_SETTINGS_KEYS = new Set([
  'favicon', 'site_name', 'site_description', 'logo',
  'whatsapp', 'whatsapp_message', 'whatsapp_message_en', 'whatsapp_message_id',
])

const ADMIN_SETTINGS_KEYS = new Set([
  'favicon', 'site_name', 'site_description', 'logo', 'to_email',
  'whatsapp', 'whatsapp_number', 'whatsapp_message',
  'whatsapp_message_en', 'whatsapp_message_id',
])

async function requireCpCrud(c: any, next: any) {
  const user = c.get('user') as Record<string, unknown>
  if (!await hasModuleAccess(user, Module.COMPANYPROFILE, AccessLevel.CRUD)) {
    throw new HTTPException(403, { message: 'Access denied' })
  }
  await next()
}

// ── SSE (Server-Sent Events) ─────────────────────────────

cp.get('/events', getCurrentUser, async (c) => handleSSE(c, 'companyprofile'))

// ── Upload ────────────────────────────────────────────────

cp.post('/upload', getCurrentUser, requireCpCrud, async (c) => {
  const fd = await c.req.formData()
  const file = fd.get('file') as File | null
  if (!file) throw new HTTPException(400, { message: 'No file uploaded' })

  const allowedTypes = new Set(['image/jpeg', 'image/png', 'image/webp', 'image/gif'])
  if (!allowedTypes.has(file.type)) {
    throw new HTTPException(400, { message: 'File type not allowed. Accepted: JPEG, PNG, WebP, GIF' })
  }
  const maxSize = 5 * 1024 * 1024
  if (file.size > maxSize) {
    throw new HTTPException(400, { message: 'File too large. Max 5MB' })
  }

  try {
    return c.json({ url: publicUrl(await saveUpload(file)) })
  } catch (e: any) {
    throw new HTTPException(400, { message: e.message })
  }
})

cp.delete('/uploads/:filename', getCurrentUser, requireCpCrud, async (c) => {
  const filename = c.req.param('filename')
  if (!filename || filename.includes('..') || filename.includes('/')) {
    throw new HTTPException(400, { message: 'Invalid filename' })
  }
  deleteUpload(`/uploads/${filename}`)
  return c.json({ message: 'Deleted' })
})

// ── Auth ──────────────────────────────────────────────────

cp.post('/auth/login', zValidator('json', z.object({ username: z.string(), password: z.string() })), async (c) => {
  try {
    await loginLimiter.checkAsync(c)
    const body = c.req.valid('json')
    const { result, user } = await loginUser(body.username, body.password)

    if (!await hasModuleAccess(user, Module.COMPANYPROFILE, AccessLevel.DASHBOARD)) {
      throw new HTTPException(403, { message: 'Access denied' })
    }

    return c.json(result)
  } catch (e) { if (e instanceof HTTPException) throw e; console.error(e); throw new HTTPException(500, { message: 'Internal Server Error' }) }
})

cp.post('/auth/refresh', zValidator('json', z.object({ refresh_token: z.string() })), async (c) => {
  const body = c.req.valid('json')
  const tokenHash = hashRefreshToken(body.refresh_token)
  const stored = await getByColumn('refresh_tokens', 'token_hash', tokenHash)
  if (!stored || stored.revoked) throw new HTTPException(401, { message: 'Invalid refresh token' })
  const expires = stored.expires_at as string | undefined
  if (expires) {
    const expiresDt = new Date(expires.replace('Z', '+00:00'))
    if (expiresDt < new Date()) throw new HTTPException(401, { message: 'Refresh token expired' })
  }
  const user = await getById('users', stored.user_id as string)
  if (!user || !user.is_active) throw new HTTPException(401, { message: 'User not found or inactive' })
  await updateRecord('refresh_tokens', stored.id as string, { revoked: true })
  const newAccess = await createAccessToken({ sub: user.id })
  const { raw: rawRefresh, hash: newHash, expiresAt: newExpires } = generateRefreshToken()
  await createRecord('refresh_tokens', { user_id: user.id, token_hash: newHash, expires_at: toMysqlDatetime(newExpires) })
  return c.json({ access_token: newAccess, refresh_token: rawRefresh, token_type: 'bearer' })
})

cp.post('/auth/logout', getCurrentUser, async (c) => {
  const user = c.get('user')
  const pool = (await import('../db/mysql')).getRawPool()
  await pool.execute('UPDATE refresh_tokens SET revoked = 1 WHERE user_id = ?', [user.id] as any)
  return c.json({ message: 'Logged out' })
})

cp.get('/auth/me', getCurrentUser, async (c) => {
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
  const pool = (await import('../db/mysql')).getRawPool()
  const [pagePerms] = await pool.execute<(import('mysql2/promise').RowDataPacket[])>(
    'SELECT page_id FROM user_page_permissions WHERE user_id = ?',
    [user.id] as any
  )
  return c.json({ id: user.id, username: user.username, email: user.email || '', full_name: user.full_name || '', avatar_url: user.avatar_url || '', role_id: roleId, role_name: roleName, permissions: rolePermissions, page_permissions: pagePerms.map((r: any) => r.page_id), user_type: user.user_type || 'admin', is_active: user.is_active ?? true, is_superadmin: isSuperAdmin })
})

cp.put('/auth/profile', getCurrentUser, zValidator('json', z.object({ username: z.string().optional(), email: z.string().optional(), full_name: z.string().optional(), avatar_url: z.string().optional(), old_password: z.string().optional(), new_password: z.string().optional() })), async (c) => {
  const body = c.req.valid('json')
  const user = c.get('user')
  const { verifyPassword, hashPassword } = await import('../auth/auth')
  const data: Record<string, unknown> = {}
  if (body.username !== undefined) data.username = body.username
  if (body.email !== undefined) data.email = body.email
  if (body.full_name !== undefined) data.full_name = body.full_name
  if (body.avatar_url !== undefined) data.avatar_url = body.avatar_url
  if (body.new_password) {
    if (!body.old_password) throw new HTTPException(400, { message: 'Old password is required' })
    if (!verifyPassword(body.old_password, user.password_hash as string)) throw new HTTPException(400, { message: 'Old password is incorrect' })
    data.password_hash = hashPassword(body.new_password)
  }
  if (data.email && data.email !== (user.email || '')) {
    if (user.user_type !== 'superadmin') throw new HTTPException(403, { message: 'Only superadmin can change email' })
    const existing = await getByColumn('users', 'email', data.email)
    if (existing && existing.id !== user.id) throw new HTTPException(400, { message: 'Email already in use' })
  }
  if (data.username) {
    const existing = await getByColumn('users', 'username', data.username)
    if (existing && existing.id !== user.id) throw new HTTPException(400, { message: 'Username already in use' })
  }
  if (Object.keys(data).length > 0) await updateRecord('users', user.id as string, data)
  if (body.new_password) {
    const pool = (await import('../db/mysql')).getRawPool()
    const [rows] = await pool.execute<(import('mysql2/promise').RowDataPacket[])>('SELECT id FROM refresh_tokens WHERE user_id = ?', [user.id] as any)
    for (const row of rows) await updateRecord('refresh_tokens', row.id, { revoked: true })
  }
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

// ── Public ────────────────────────────────────────────────

cp.get('/settings', async (c) => {
  c.header('Cache-Control', 'no-cache, no-store, must-revalidate')
  c.header('Pragma', 'no-cache')
  c.header('Expires', '0')
  const all = await listAll('site_settings')
  return c.json(all.filter((s: any) => PUBLIC_SETTINGS_KEYS.has(s.key)))
})

cp.get('/settings/:key', async (c) => {
  const key = c.req.param('key')
  if (!PUBLIC_SETTINGS_KEYS.has(key)) throw new HTTPException(400, { message: `Unknown key: ${key}` })
  const s = await getByColumn('site_settings', 'key', key)
  if (!s) throw new HTTPException(404, { message: 'Not found' })
  return c.json(s)
})

cp.get('/contact-info', async (c) => {
  const info = await getFirst('contact_info')
  if (!info) throw new HTTPException(404, { message: 'Not found' })
  return c.json(info)
})

cp.get('/:entity', async (c) => {
  const entity = c.req.param('entity')
  if (['settings', 'contact-info', 'auth', 'upload'].includes(entity)) return
  const table = getTable(entity)
  const skip = parseInt(c.req.query('skip') || '0', 10)
  const limit = parseInt(c.req.query('limit') || '100', 10)
  const order = entity === 'news' ? 'date.desc' : entity === 'achievements' ? 'year.desc' : undefined
  return c.json(await listAll(table, { order, skip, limit }))
})

cp.get('/:entity/:slug', async (c) => {
  const entity = c.req.param('entity'); const slug = c.req.param('slug')
  if (['settings', 'contact-info'].includes(entity)) return
  const table = getTable(entity)
  const item = ['news', 'programs'].includes(entity) ? await getBySlug(table, slug) : await getById(table, slug)
  if (!item) throw new HTTPException(404, { message: `${entity} not found` })
  return c.json(item)
})

// ── Admin ─────────────────────────────────────────────────

cp.put('/settings/:key', getCurrentUser, requireCpCrud, zValidator('json', z.object({ value: z.string() })), async (c) => {
  const key = c.req.param('key')
  if (!ADMIN_SETTINGS_KEYS.has(key)) throw new HTTPException(400, { message: `Unknown key: ${key}` })
  const body = c.req.valid('json')
  const existing = await getByColumn('site_settings', 'key', key)
  if (existing) { const r = await updateRecord('site_settings', existing.key as string, { value: body.value }); emit('companyprofile', 'change'); return c.json(r) }
  const r = await createRecord('site_settings', { key, value: body.value }); emit('companyprofile', 'change'); return c.json(r)
})

cp.put('/contact-info', getCurrentUser, requireCpCrud, zValidator('json', z.object({
  phone_primary: z.string().optional(),
  phone_secondary: z.string().optional(),
  whatsapp: z.string().optional(),
  email_primary: z.string().optional(),
  email_admission: z.string().optional(),
  address: z.string().optional(),
  office_hours: z.string().optional(),
})), async (c) => {
  const body = c.req.valid('json')
  const ex = await getFirst('contact_info')
  if (ex) { await updateRecord('contact_info', ex.id as string, body); emit('companyprofile', 'change'); return c.json(await getById('contact_info', ex.id as string)) }
  const r = await createRecord('contact_info', body); emit('companyprofile', 'change'); return c.json(r)
})

// CRUD per entity
for (const entity of Object.keys(TABLES)) {
  cp.post(`/${entity}`, getCurrentUser, requireCpCrud, async (c) => {
    const r = await createRecord(getTable(entity), await c.req.json()); emit('companyprofile', 'change'); return c.json(r, 201)
  })

  cp.put(`/${entity}/:id`, getCurrentUser, requireCpCrud, async (c) => {
    const id = c.req.param('id')!
    const table = getTable(entity)
    const old = await getById(table, id)
    if (!old) throw new HTTPException(404, { message: `${entity} not found` })
    const body = await c.req.json()
    if (body.image && old.image && old.image !== body.image) deleteUpload(old.image as string)
    if (body.icon && old.icon && old.icon !== body.icon) deleteUpload(old.icon as string)
    if (old.gallery && body.gallery) {
      for (const url of old.gallery as string[]) { if (!(body.gallery as string[]).includes(url)) deleteUpload(url) }
    }
    const r = await updateRecord(table, id, body); emit('companyprofile', 'change'); return c.json(r)
  })

  cp.delete(`/${entity}/:id`, getCurrentUser, requireCpCrud, async (c) => {
    const id = c.req.param('id')!
    const table = getTable(entity)
    const old = await getById(table, id)
    if (!old) throw new HTTPException(404, { message: `${entity} not found` })
    for (const f of ['image', 'icon'] as const) { if (old[f]) deleteUpload(old[f] as string) }
    if (old.gallery) { for (const url of old.gallery as string[]) deleteUpload(url) }
    await deleteRecord(table, id); emit('companyprofile', 'change')
    return c.json({ message: 'Deleted' })
  })
}

export default cp
