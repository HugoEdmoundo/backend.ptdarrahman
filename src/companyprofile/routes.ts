import { Hono } from 'hono'
import { HTTPException } from 'hono/http-exception'
import { z } from 'zod'
import { zValidator } from '@hono/zod-validator'
import { createAccessToken, generateRefreshToken, verifyPassword } from '../auth/auth'
import { AccessLevel, Module, hasModuleAccess } from '../auth/permissions'
import { loginLimiter } from '../auth/rate-limiter'
import { getCurrentUser } from '../middleware/auth'
import {
  listAll, getByColumn, getById, getBySlug, getFirst,
  createRecord, updateRecord, deleteRecord,
} from '../db/supabase'
import { deleteUpload, publicUrl, saveUpload } from '../storage'
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

const ALLOWED_KEYS = new Set([
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

// ── Upload ────────────────────────────────────────────────

cp.post('/upload', getCurrentUser, requireCpCrud, async (c) => {
  const fd = await c.req.formData()
  const file = fd.get('file') as File | null
  if (!file) throw new HTTPException(400, { message: 'No file uploaded' })
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
    loginLimiter.check(c)
    const body = c.req.valid('json')
    let user = await getByColumn('users', 'username', body.username)
    if (!user) user = await getByColumn('users', 'email', body.username)
    const fakeHash = '$2a$12$LJ3m4ys3Lk0TSwHnbfOMiOXPm1QlFZqFOBmH39JcGpGtI7qJkGzS'
    const storedHash = user ? (user.password_hash as string) : fakeHash
    if (!user || !verifyPassword(body.password, storedHash)) {
      if (user) {
        const a = ((user.failed_login_attempts as number) || 0) + 1
        const upd: Record<string, unknown> = { failed_login_attempts: a }
        if (a >= 5) { upd.locked_until = new Date(Date.now() + 15 * 60 * 1000).toISOString(); await updateRecord('users', user.id as string, upd); throw new HTTPException(429, { message: 'Account locked' }) }
        await updateRecord('users', user.id as string, upd)
      }
      throw new HTTPException(401, { message: 'Invalid username or password' })
    }
    if (user.is_active === false) throw new HTTPException(403, { message: 'User is inactive' })
    if (!await hasModuleAccess(user, Module.COMPANYPROFILE, AccessLevel.DASHBOARD)) throw new HTTPException(403, { message: 'Access denied' })
    const now = new Date().toISOString()
    await updateRecord('users', user.id as string, { last_login_at: now, failed_login_attempts: 0, locked_until: null })
    const token = await createAccessToken({ sub: user.id })
    const { raw, hash, expiresAt } = generateRefreshToken()
    await createRecord('refresh_tokens', { user_id: user.id, token_hash: hash, expires_at: expiresAt.toISOString() })
    let rn = ''; let rp: Record<string, unknown> = {}; const rid = user.role_id as string | undefined
    if (rid) { const r = await getById('roles', rid); if (r) { rn = r.name as string; rp = (r.permissions as Record<string, unknown>) || {} } }
    return c.json({ access_token: token, refresh_token: raw, token_type: 'bearer', user: { id: user.id, username: user.username, email: user.email || '', full_name: user.full_name || '', avatar_url: user.avatar_url || '', role_id: rid, role_name: rn, permissions: rp, user_type: user.user_type || 'admin' } })
  } catch (e) { if (e instanceof HTTPException) throw e; console.error(e); throw new HTTPException(500, { message: 'Internal Server Error' }) }
})

// ── Public ────────────────────────────────────────────────

cp.get('/settings', async (c) => {
  c.res.headers.set('Cache-Control', 'no-cache, no-store, must-revalidate')
  c.res.headers.set('Pragma', 'no-cache'); c.res.headers.set('Expires', '0')
  return c.json(await listAll('site_settings'))
})

cp.get('/settings/:key', async (c) => {
  const key = c.req.param('key')
  if (!ALLOWED_KEYS.has(key)) throw new HTTPException(400, { message: `Unknown key: ${key}` })
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

cp.put('/settings/:key', getCurrentUser, zValidator('json', z.object({ value: z.string() })), async (c) => {
  const key = c.req.param('key')
  if (!ALLOWED_KEYS.has(key)) throw new HTTPException(400, { message: `Unknown key: ${key}` })
  const body = c.req.valid('json')
  const existing = await getByColumn('site_settings', 'key', key)
  if (existing) return c.json(await updateRecord('site_settings', existing.key as string, { value: body.value }))
  return c.json(await createRecord('site_settings', { key, value: body.value }))
})

cp.put('/contact-info', getCurrentUser, zValidator('json', z.object({ email: z.string().optional(), phone: z.string().optional(), address: z.string().optional(), map_url: z.string().optional() })), async (c) => {
  const body = c.req.valid('json')
  const ex = await getFirst('contact_info')
  if (ex) { await updateRecord('contact_info', ex.id as string, body); return c.json(await getById('contact_info', ex.id as string)) }
  return c.json(await createRecord('contact_info', body))
})

// CRUD per entity
for (const entity of Object.keys(TABLES)) {
  cp.post(`/${entity}`, getCurrentUser, requireCpCrud, async (c) => {
    return c.json(await createRecord(getTable(entity), await c.req.json()), 201)
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
    return c.json(await updateRecord(table, id, body))
  })

  cp.delete(`/${entity}/:id`, getCurrentUser, requireCpCrud, async (c) => {
    const id = c.req.param('id')!
    const table = getTable(entity)
    const old = await getById(table, id)
    if (!old) throw new HTTPException(404, { message: `${entity} not found` })
    for (const f of ['image', 'icon'] as const) { if (old[f]) deleteUpload(old[f] as string) }
    if (old.gallery) { for (const url of old.gallery as string[]) deleteUpload(url) }
    await deleteRecord(table, id)
    return c.json({ message: 'Deleted' })
  })
}

export default cp
