import { Hono } from 'hono'
import { HTTPException } from 'hono/http-exception'
import { z } from 'zod'
import { zValidator } from '@hono/zod-validator'
import { getCurrentUser, requireSuperadmin } from '../middleware/auth'
import { listAll, getById, createRecord, updateRecord, deleteRecord, searchPaginated } from '../db/supabase'
import { hashPassword } from '../auth/auth'
import type { Variables } from '../types'

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
  is_active: z.boolean().optional(),
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
  if (body.is_active !== undefined) data.is_active = body.is_active
  return c.json(await updateRecord('users', id, data))
})

users.delete('/:id', getCurrentUser, requireSuperadmin, async (c) => {
  const id = c.req.param('id')
  if (!id) throw new HTTPException(400, { message: 'Missing id' })
  await deleteRecord('users', id)
  return c.json({ message: 'Deleted' })
})

export default users
