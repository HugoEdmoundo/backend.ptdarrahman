import { Hono } from 'hono'
import { HTTPException } from 'hono/http-exception'
import { zValidator } from '@hono/zod-validator'
import { z } from 'zod'
import { getCurrentUser } from '../middleware/auth'
import { requireNotificationCrud } from './middleware'
import { listAll, getById, getByColumn, createRecord, updateRecord, deleteRecord, searchPaginated } from '../db/mysql'
import { sendEmail } from '../services/email'
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

notif.delete('/templates/:id', getCurrentUser, requireNotificationCrud, async (c) => {
  await deleteRecord('notification_templates', pid(c))
  return c.json({ success: true })
})

// ═══════ Notifications ═══════
notif.post('/send', getCurrentUser, requireNotificationCrud, zValidator('json', z.object({
  user_id: z.string().min(1), template_id: z.string().optional(), title: z.string().min(1),
  message: z.string().min(1), channel: z.string().optional(),
})), async (c) => {
  const body = c.req.valid('json')
  const row = await createRecord('notifications', { ...body, is_read: false })

  if (body.channel === 'email') {
    const user = await getById('users', body.user_id)
    if (user && (user as any).email) {
      const html = `<div style="font-family:sans-serif;max-width:600px;margin:auto">
        <h2 style="color:#166534">${body.title}</h2>
        <p style="color:#374151;line-height:1.6">${body.message.replace(/\n/g, '<br>')}</p>
        <hr style="border:none;border-top:1px solid #e5e7eb;margin:24px 0">
        <p style="color:#9ca3af;font-size:12px">PPDB Arrahman — Notifikasi otomatis</p>
      </div>`
      sendEmail((user as any).email, body.title, html).catch(() => {})
    }
  }

  return c.json(row, 201)
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
  const user = c.get('user')
  const notif_record = await getById('notifications', pid(c))
  if (!notif_record) throw new HTTPException(404)
  if ((notif_record as any).user_id !== user.id) {
    throw new HTTPException(403, { message: 'You can only mark your own notifications as read' })
  }
  const r = await updateRecord('notifications', pid(c), { is_read: true, read_at: new Date().toISOString() })
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
