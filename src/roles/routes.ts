import { Hono } from 'hono'
import { HTTPException } from 'hono/http-exception'
import { z } from 'zod'
import { zValidator } from '@hono/zod-validator'
import { getCurrentUser, requireSuperadmin } from '../middleware/auth'
import { listAll, getById, createRecord, updateRecord, deleteRecord } from '../db/mysql'
import type { Variables } from '../types'

const roles = new Hono<{ Variables: Variables }>()

const createSchema = z.object({ name: z.string(), description: z.string().optional(), permissions: z.record(z.any()).optional(), is_superadmin: z.union([z.boolean(), z.number()]).optional() })
const updateSchema = z.object({ name: z.string().optional(), description: z.string().optional(), permissions: z.record(z.any()).optional(), is_superadmin: z.union([z.boolean(), z.number()]).optional() })

roles.get('/', getCurrentUser, requireSuperadmin, async (c) => c.json(await listAll('roles', { order: 'name' })))

roles.get('/:id', getCurrentUser, requireSuperadmin, async (c) => {
  const id = c.req.param('id')
  if (!id) throw new HTTPException(400, { message: 'Missing id' })
  const role = await getById('roles', id)
  if (!role) throw new HTTPException(404, { message: 'Role not found' })
  return c.json(role)
})

roles.post('/', getCurrentUser, requireSuperadmin, zValidator('json', createSchema), async (c) => {
  const body = c.req.valid('json')
  if (body.permissions && typeof body.permissions === 'object') {
    (body as any).permissions = JSON.stringify(body.permissions)
  }
  if (body.is_superadmin !== undefined) (body as any).is_superadmin = body.is_superadmin ? 1 : 0
  return c.json(await createRecord('roles', body as any), 201)
})

roles.put('/:id', getCurrentUser, requireSuperadmin, zValidator('json', updateSchema), async (c) => {
  const id = c.req.param('id')
  if (!id) throw new HTTPException(400, { message: 'Missing id' })
  const existing = await getById('roles', id)
  if (!existing) throw new HTTPException(404, { message: 'Role not found' })
  const body = c.req.valid('json')
  if (body.permissions && typeof body.permissions === 'object') {
    (body as any).permissions = JSON.stringify(body.permissions)
  }
  if (body.is_superadmin !== undefined) (body as any).is_superadmin = body.is_superadmin ? 1 : 0
  return c.json(await updateRecord('roles', id, body as any))
})

roles.delete('/:id', getCurrentUser, requireSuperadmin, async (c) => {
  const id = c.req.param('id')
  if (!id) throw new HTTPException(400, { message: 'Missing id' })
  await deleteRecord('roles', id)
  return c.json({ message: 'Deleted' })
})

export default roles
