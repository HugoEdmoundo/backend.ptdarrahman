import { Hono } from 'hono'
import { HTTPException } from 'hono/http-exception'
import { z } from 'zod'
import { zValidator } from '@hono/zod-validator'
import { getCurrentUser } from '../middleware/auth'
import { listAll, getById, createRecord, updateRecord, deleteRecord } from '../db/mysql'
import type { Variables } from '../types'

const spp = new Hono<{ Variables: Variables }>()

function getId(c: any): string {
  const id = c.req.param('id')
  if (!id) throw new HTTPException(400, { message: 'Missing id' })
  return id
}

const sppSettingsSchema = z.object({
  class_name: z.string(),
  academic_year: z.string(),
  nominal: z.union([z.number(), z.string()]).transform(val => Number(val)),
  is_active: z.union([z.boolean(), z.number()]).optional().transform(val => typeof val === 'boolean' ? (val ? 1 : 0) : val),
})

const sppBillsSchema = z.object({
  student_id: z.string(),
  bill_month: z.number(),
  bill_year: z.number(),
  nominal: z.union([z.number(), z.string()]).transform(val => Number(val)),
  total_paid: z.union([z.number(), z.string()]).optional().transform(val => val !== undefined ? Number(val) : 0),
  status: z.string().optional(),
  due_date: z.string().optional().nullable(),
  notes: z.string().optional().nullable(),
})

const sppPaymentsSchema = z.object({
  student_id: z.string(),
  bill_id: z.string().optional().nullable(),
  amount: z.union([z.number(), z.string()]).transform(val => Number(val)),
  payment_method: z.string().optional(),
  proof_type: z.string().optional().nullable(),
  proof_url: z.string().optional().nullable(),
  status: z.string().optional(),
  rejection_reason: z.string().optional().nullable(),
  confirmed_by: z.string().optional().nullable(),
  confirmed_at: z.string().optional().nullable(),
  notes: z.string().optional().nullable(),
  paid_by: z.string().optional().nullable(),
})

spp.get('/settings', getCurrentUser, async (c) => c.json(await listAll('spp_settings')))
spp.post('/settings', getCurrentUser, zValidator('json', sppSettingsSchema), async (c) => {
  return c.json(await createRecord('spp_settings', c.req.valid('json')), 201)
})
spp.put('/settings/:id', getCurrentUser, zValidator('json', sppSettingsSchema.partial()), async (c) => {
  return c.json(await updateRecord('spp_settings', getId(c), c.req.valid('json')))
})
spp.delete('/settings/:id', getCurrentUser, async (c) => {
  const id = getId(c)
  try {
    const deleted = await deleteRecord('spp_settings', id)
    if (!deleted) throw new HTTPException(404, { message: 'Settings not found' })
    return c.json({ message: 'Deleted' })
  } catch (e: any) {
    if (e.code === 'ER_ROW_IS_REFERENCED_2' || e.errno === 1451) {
      throw new HTTPException(409, { message: 'Cannot delete settings because they are referenced by other records' })
    }
    throw e
  }
})

spp.get('/bills', getCurrentUser, async (c) => c.json(await listAll('spp_bills')))
spp.post('/bills/generate', getCurrentUser, zValidator('json', sppBillsSchema), async (c) => {
  return c.json(await createRecord('spp_bills', c.req.valid('json')), 201)
})
spp.get('/bills/:id', getCurrentUser, async (c) => {
  const bill = await getById('spp_bills', getId(c))
  if (!bill) throw new HTTPException(404, { message: 'Bill not found' })
  return c.json(bill)
})
spp.put('/bills/:id', getCurrentUser, zValidator('json', sppBillsSchema.partial()), async (c) => {
  return c.json(await updateRecord('spp_bills', getId(c), c.req.valid('json')))
})

spp.get('/payments', getCurrentUser, async (c) => c.json(await listAll('spp_payments')))
spp.post('/payments', getCurrentUser, zValidator('json', sppPaymentsSchema), async (c) => {
  return c.json(await createRecord('spp_payments', c.req.valid('json')), 201)
})
spp.put('/payments/:id/confirm', getCurrentUser, zValidator('json', sppPaymentsSchema.partial()), async (c) => {
  return c.json(await updateRecord('spp_payments', getId(c), c.req.valid('json')))
})

export default spp
