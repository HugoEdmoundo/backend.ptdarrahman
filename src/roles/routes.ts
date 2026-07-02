import { Hono } from 'hono'
import { HTTPException } from 'hono/http-exception'
import { z } from 'zod'
import { zValidator } from '@hono/zod-validator'
import { getCurrentUser, requireSuperadmin } from '../middleware/auth'
import { listAll, getById, createRecord, updateRecord, deleteRecord } from '../db/supabase'
import type { Variables } from '../types'

const roles = new Hono<{ Variables: Variables }>()

const createSchema = z.object({ name: z.string(), description: z.string().optional(), permissions: z.record(z.any()).optional(), is_superadmin: z.boolean().optional() })
const updateSchema = z.object({ name: z.string().optional(), description: z.string().optional(), permissions: z.record(z.any()).optional(), is_superadmin: z.boolean().optional() })

roles.get('/', getCurrentUser, requireSuperadmin, async (c) => c.json(await listAll('roles', { order: 'name' })))

roles.get('/:id', getCurrentUser, requireSuperadmin, async (c) => {
  const id = c.req.param('id')
  if (!id) throw new HTTPException(400, { message: 'Missing id' })
  const role = await getById('roles', id)
  if (!role) throw new HTTPException(404, { message: 'Role not found' })
  return c.json(role)
})

roles.post('/', getCurrentUser, requireSuperadmin, zValidator('json', createSchema), async (c) => {
  return c.json(await createRecord('roles', c.req.valid('json') as any), 201)
})

roles.put('/:id', getCurrentUser, requireSuperadmin, zValidator('json', updateSchema), async (c) => {
  const id = c.req.param('id')
  if (!id) throw new HTTPException(400, { message: 'Missing id' })
  const existing = await getById('roles', id)
  if (!existing) throw new HTTPException(404, { message: 'Role not found' })
  return c.json(await updateRecord('roles', id, c.req.valid('json') as any))
})

roles.delete('/:id', getCurrentUser, requireSuperadmin, async (c) => {
  const id = c.req.param('id')
  if (!id) throw new HTTPException(400, { message: 'Missing id' })
  await deleteRecord('roles', id)
  return c.json({ message: 'Deleted' })
})

export default roles
