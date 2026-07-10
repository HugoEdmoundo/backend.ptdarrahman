import { Hono } from 'hono'
import { HTTPException } from 'hono/http-exception'
import { zValidator } from '@hono/zod-validator'
import { z } from 'zod'
import { getCurrentUser } from '../middleware/auth'
import { requireNotificationCrud } from './middleware'
import { listAll, getById, getByColumn, createRecord, updateRecord, deleteRecord, searchPaginated } from '../db/mysql'
import type { Variables } from '../types'

const notif = new Hono<{ Variables: Variables }>()

function pid(c: any): string { return c.req.param('id') as string }

// ═══════ Notification Templates ═══════
notif.get('/templates', getCurrentUser, requireNotificationCrud, async (c) => {
  return c.json(await listAll('notification_templates', { order: 'created_at.desc', limit: 100 }))
})

notif.post('/templates', getCurrentUser, requireNotificationCrud, zValidator('json', z.object({
  code: z.string().min(1), name: z.string().min(1), subject: z.string().min(1),
  body_template: z.string().min(1), channel: z.string().optional(),
})), async (c) => {
  return c.json(await createRecord('notification_templates', c.req.valid('json')), 201)
})

notif.put('/templates/:id', getCurrentUser, requireNotificationCrud, zValidator('json', z.object({
  code: z.string().optional(), name: z.string().optional(), subject: z.string().optional(),
  body_template: z.string().optional(), channel: z.string().optional(), is_active: z.boolean().optional(),
})), async (c) => {
  const r = await updateRecord('notification_templates', pid(c), c.req.valid('json'))
  if (!r) throw new HTTPException(404)
  return c.json(r)
})

// ═══════ Notifications ═══════
notif.post('/send', getCurrentUser, requireNotificationCrud, zValidator('json', z.object({
  user_id: z.string().min(1), template_id: z.string().optional(), title: z.string().min(1),
  message: z.string().min(1), channel: z.string().optional(),
})), async (c) => {
  return c.json(await createRecord('notifications', { ...c.req.valid('json'), is_read: false }), 201)
})

notif.get('/history', getCurrentUser, requireNotificationCrud, async (c) => {
  const page = parseInt(c.req.query('page') || '1')
  return c.json(await searchPaginated('notifications', { page, perPage: 20, order: 'created_at.desc' }))
})

notif.get('/my', getCurrentUser, async (c) => {
  const user = c.get('user')
  const all = await listAll('notifications', { order: 'created_at.desc', limit: 50 })
  return c.json(all.filter((n: any) => n.user_id === user.id))
})

notif.put('/:id/read', getCurrentUser, async (c) => {
  const r = await updateRecord('notifications', pid(c), { is_read: true, read_at: new Date().toISOString() })
  if (!r) throw new HTTPException(404)
  return c.json(r)
})

// ═══════ Academic Calendar ═══════
notif.get('/calendar', async (c) => {
  const rows = await listAll('academic_calendars', { order: 'event_date.asc', limit: 100 })
  return c.json(rows)
})

notif.get('/calendar/admin', getCurrentUser, requireNotificationCrud, async (c) => {
  return c.json(await listAll('academic_calendars', { order: 'event_date.desc', limit: 200 }))
})

notif.post('/calendar', getCurrentUser, requireNotificationCrud, zValidator('json', z.object({
  period_id: z.string().min(1), title: z.string().min(1), description: z.string().nullable().optional(),
  event_date: z.string().min(1), event_type: z.string().min(1), is_public: z.boolean().optional(),
})), async (c) => {
  const user = c.get('user')
  return c.json(await createRecord('academic_calendars', { ...c.req.valid('json'), created_by: user.id }), 201)
})

notif.put('/calendar/:id', getCurrentUser, requireNotificationCrud, zValidator('json', z.object({
  title: z.string().optional(), description: z.string().nullable().optional(),
  event_date: z.string().optional(), event_type: z.string().optional(), is_public: z.boolean().optional(),
})), async (c) => {
  const r = await updateRecord('academic_calendars', pid(c), c.req.valid('json'))
  if (!r) throw new HTTPException(404)
  return c.json(r)
})

notif.delete('/calendar/:id', getCurrentUser, requireNotificationCrud, async (c) => {
  await deleteRecord('academic_calendars', pid(c))
  return c.json({ success: true })
})

export default notif
