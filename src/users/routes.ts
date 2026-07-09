import { Hono } from 'hono'
import { HTTPException } from 'hono/http-exception'
import { z } from 'zod'
import { zValidator } from '@hono/zod-validator'
import { getCurrentUser, requireSuperadmin } from '../middleware/auth'
import { listAll, getById, createRecord, updateRecord, deleteRecord, searchPaginated, getRawPool } from '../db/mysql'
import { hashPassword } from '../auth/auth'
import { handleSSE, emit } from '../sse'
import type { Variables } from '../types'
import type { RowDataPacket } from 'mysql2/promise'

const users = new Hono<{ Variables: Variables }>()

const createSchema = z.object({
  username: z.string(),
  email: z.string().optional(),
  full_name: z.string().optional(),
  password: z.string(),
  role_id: z.string().optional(),
  user_type: z.string().optional(),
})

const updateSchema = z.object({
  username: z.string().optional(),
  email: z.string().optional(),
  full_name: z.string().optional(),
  password: z.string().optional(),
  role_id: z.string().optional(),
  user_type: z.string().optional(),
  is_active: z.union([z.boolean(), z.number()]).optional(),
})

users.get('/', getCurrentUser, requireSuperadmin, async (c) => {
  const search = c.req.query('search') || ''
  const page = parseInt(c.req.query('page') || '1', 10)
  const perPage = parseInt(c.req.query('per_page') || '20', 10)

  if (search) {
    const { data, total } = await searchPaginated('users', { search, columns: ['username', 'email', 'full_name'], page, perPage, order: 'created_at.desc' })
    return c.json({ data, total, page, per_page: perPage })
  }
  return c.json(await listAll('users', { order: 'created_at.desc' }))
})

users.get('/:id', getCurrentUser, requireSuperadmin, async (c) => {
  const id = c.req.param('id')
  if (!id) throw new HTTPException(400, { message: 'Missing id' })
  const user = await getById('users', id)
  if (!user) throw new HTTPException(404, { message: 'User not found' })
  return c.json(user)
})

users.post('/', getCurrentUser, requireSuperadmin, zValidator('json', createSchema), async (c) => {
  const body = c.req.valid('json')
  const data: Record<string, unknown> = { username: body.username, password_hash: hashPassword(body.password) }
  if (body.email) data.email = body.email
  if (body.full_name) data.full_name = body.full_name
  if (body.role_id) data.role_id = body.role_id
  if (body.user_type) data.user_type = body.user_type
  return c.json(await createRecord('users', data), 201)
})

users.put('/:id', getCurrentUser, requireSuperadmin, zValidator('json', updateSchema), async (c) => {
  const id = c.req.param('id')
  if (!id) throw new HTTPException(400, { message: 'Missing id' })
  const body = c.req.valid('json')
  const existing = await getById('users', id)
  if (!existing) throw new HTTPException(404, { message: 'User not found' })
  const data: Record<string, unknown> = {}
  if (body.username) data.username = body.username
  if (body.email) data.email = body.email
  if (body.full_name) data.full_name = body.full_name
  if (body.password) data.password_hash = hashPassword(body.password)
  if (body.role_id) data.role_id = body.role_id
  if (body.user_type) data.user_type = body.user_type
  if (body.is_active !== undefined) data.is_active = body.is_active ? 1 : 0
  return c.json(await updateRecord('users', id, data))
})

users.delete('/:id', getCurrentUser, requireSuperadmin, async (c) => {
  const id = c.req.param('id')
  if (!id) throw new HTTPException(400, { message: 'Missing id' })
  try {
    const deleted = await deleteRecord('users', id)
    if (!deleted) {
      throw new HTTPException(404, { message: 'User not found' })
    }
    return c.json({ message: 'Deleted' })
  } catch (e: any) {
    if (e.code === 'ER_ROW_IS_REFERENCED_2' || e.errno === 1451) {
      throw new HTTPException(409, { message: 'Cannot delete user because they are still referenced by other records' })
    }
    throw e
  }
})

// ── Page Permissions per User ──────────────────────────────

const pagePermsSchema = z.object({
  page_ids: z.array(z.string()),
})

users.get('/:id/page-permissions', getCurrentUser, requireSuperadmin, async (c) => {
  const id = c.req.param('id')
  if (!id) throw new HTTPException(400, { message: 'Missing id' })

  const user = await getById('users', id)
  if (!user) throw new HTTPException(404, { message: 'User not found' })

  const pool = getRawPool()
  const [rows] = await pool.execute<RowDataPacket[]>(
    `SELECT upp.page_id
     FROM user_page_permissions upp
     WHERE upp.user_id = ?`,
    [id]
  )

  return c.json({
    user_id: id,
    page_ids: rows.map(r => r.page_id),
  })
})

users.put('/:id/page-permissions', getCurrentUser, requireSuperadmin, zValidator('json', pagePermsSchema), async (c) => {
  const userId = c.req.param('id')
  if (!userId) throw new HTTPException(400, { message: 'Missing id' })

  const user = await getById('users', userId)
  if (!user) throw new HTTPException(404, { message: 'User not found' })

  const body = c.req.valid('json')
  const pool = getRawPool()

  await pool.execute('DELETE FROM user_page_permissions WHERE user_id = ?', [userId])

  if (body.page_ids.length > 0) {
    const values = body.page_ids.map(pageId => [pageId])
    const placeholders = values.map(() => '(UUID(), ?, ?, NOW())').join(', ')
    const flatParams: any[] = []
    for (const [pageId] of values) {
      flatParams.push(userId, pageId)
    }
    await pool.execute(
      `INSERT INTO user_page_permissions (id, user_id, page_id, created_at) VALUES ${placeholders}`,
      flatParams
    )
  }

  const [updated] = await pool.execute<RowDataPacket[]>(
    'SELECT page_id FROM user_page_permissions WHERE user_id = ?',
    [userId]
  )

  const result = {
    user_id: userId,
    page_ids: updated.map(r => r.page_id),
  }

  // Emit SSE event ke user yang bersangkutan
  emit(`user-${userId}`, 'page_permissions_changed', JSON.stringify(result))

  return c.json(result)
})

// ── SSE untuk realtime page permissions ────────────────────

users.get('/:id/events', async (c) => {
  const userId = c.req.param('id')
  const token = c.req.query('token')
  
  if (token) {
    try {
      const { verifyToken } = await import('../auth/auth')
      const payload = await verifyToken(token)
      if (!payload || payload.sub !== userId) {
        throw new HTTPException(403, { message: 'Forbidden' })
      }
    } catch {
      throw new HTTPException(401, { message: 'Invalid token' })
    }
  } else {
    // Fallback: check Bearer token from header
    const auth = c.req.header('Authorization')
    if (!auth || !auth.startsWith('Bearer ')) {
      throw new HTTPException(401, { message: 'Missing token' })
    }
    try {
      const { verifyToken } = await import('../auth/auth')
      const payload = await verifyToken(auth.slice(7))
      if (!payload || payload.sub !== userId) {
        throw new HTTPException(403, { message: 'Forbidden' })
      }
    } catch {
      throw new HTTPException(401, { message: 'Invalid token' })
    }
  }
  
  return handleSSE(c, `user-${userId}`)
})

export default users
