import { Hono } from 'hono'
import { HTTPException } from 'hono/http-exception'
import { getCurrentUser } from '../middleware/auth'
import { listAll, getById, createRecord, updateRecord, deleteRecord } from '../db/mysql'
import type { Variables } from '../types'

const spp = new Hono<{ Variables: Variables }>()

function getId(c: any): string {
  const id = c.req.param('id')
  if (!id) throw new HTTPException(400, { message: 'Missing id' })
  return id
}

spp.get('/settings', getCurrentUser, async (c) => c.json(await listAll('spp_settings')))
spp.post('/settings', getCurrentUser, async (c) => {
  const body = await c.req.json()
  return c.json(await createRecord('spp_settings', body), 201)
})
spp.put('/settings/:id', getCurrentUser, async (c) => {
  return c.json(await updateRecord('spp_settings', getId(c), await c.req.json()))
})
spp.delete('/settings/:id', getCurrentUser, async (c) => {
  await deleteRecord('spp_settings', getId(c))
  return c.json({ message: 'Deleted' })
})

spp.get('/bills', getCurrentUser, async (c) => c.json(await listAll('spp_bills')))
spp.post('/bills/generate', getCurrentUser, async (c) => {
  return c.json(await createRecord('spp_bills', await c.req.json()), 201)
})
spp.get('/bills/:id', getCurrentUser, async (c) => {
  const bill = await getById('spp_bills', getId(c))
  if (!bill) throw new HTTPException(404, { message: 'Bill not found' })
  return c.json(bill)
})
spp.put('/bills/:id', getCurrentUser, async (c) => {
  return c.json(await updateRecord('spp_bills', getId(c), await c.req.json()))
})

spp.get('/payments', getCurrentUser, async (c) => c.json(await listAll('spp_payments')))
spp.post('/payments', getCurrentUser, async (c) => {
  return c.json(await createRecord('spp_payments', await c.req.json()), 201)
})
spp.put('/payments/:id/confirm', getCurrentUser, async (c) => {
  return c.json(await updateRecord('spp_payments', getId(c), await c.req.json()))
})

export default spp
