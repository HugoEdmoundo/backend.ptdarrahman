import { Hono } from 'hono'
import { HTTPException } from 'hono/http-exception'
import { zValidator } from '@hono/zod-validator'
import { z } from 'zod'
import { getCurrentUser } from '../middleware/auth'
import { listAll, getById, getByColumn, createRecord, updateRecord, deleteRecord, searchPaginated, auditLog } from '../db/mysql'
import type { Variables } from '../types'

const post = new Hono<{ Variables: Variables }>()

function pid(c: any): string { return c.req.param('id') as string }

async function requireAdmin(c: any, next: any) {
  const u = c.get('user')
  if (u.user_type === 'superadmin' || u.user_type === 'admin_ppdb') { await next(); return }
  throw new HTTPException(403, { message: 'Access denied' })
}

// ═══════ MOU Templates ═══════
post.get('/mou-templates', getCurrentUser, requireAdmin, async (c) => {
  return c.json(await listAll('mou_templates', { order: 'created_at.desc', limit: 100 }))
})

post.post('/mou-templates', getCurrentUser, requireAdmin, zValidator('json', z.object({
  name: z.string(), content: z.string(), level_id: z.string().nullable().optional(), version: z.string().optional(),
})), async (c) => {
  const body = c.req.valid('json')
  const user = c.get('user')
  const row = await createRecord('mou_templates', { ...body, created_by: user.id })
  return c.json(row, 201)
})

post.put('/mou-templates/:id', getCurrentUser, requireAdmin, zValidator('json', z.object({
  name: z.string().optional(), content: z.string().optional(), level_id: z.string().nullable().optional(), version: z.string().optional(), is_active: z.boolean().optional(),
})), async (c) => {
  const r = await updateRecord('mou_templates', pid(c), c.req.valid('json'))
  if (!r) throw new HTTPException(404)
  return c.json(r)
})

// ═══════ Applicant MOUs ═══════
post.post('/mou/generate', getCurrentUser, requireAdmin, zValidator('json', z.object({
  applicant_id: z.string().min(1), template_id: z.string().min(1),
})), async (c) => {
  const { applicant_id, template_id } = c.req.valid('json')
  const applicant = await getById('applicants', applicant_id)
  if (!applicant) throw new HTTPException(404, { message: 'Applicant not found' })
  const row = await createRecord('applicant_mous', { applicant_id, template_id, status: 'pending' })
  return c.json(row, 201)
})

post.get('/mou', getCurrentUser, requireAdmin, async (c) => {
  const page = parseInt(c.req.query('page') || '1')
  const result = await searchPaginated('applicant_mous', { page, perPage: 20, order: 'created_at.desc' })
  const enriched = await Promise.all((result.data as any[]).map(async (m) => {
    const applicant = await getById('applicants', m.applicant_id)
    const profile = applicant ? await getByColumn('applicant_profiles', 'applicant_id', applicant.id) : null
    return { ...m, applicant, profile }
  }))
  return c.json({ data: enriched, total: result.total })
})

post.get('/mou/mine', getCurrentUser, async (c) => {
  const applicant = await getByColumn('applicants', 'user_id', c.get('user').id as string)
  if (!applicant) throw new HTTPException(404)
  const mous = await listAll('applicant_mous', { limit: 10 })
  return c.json(mous.find((m: any) => m.applicant_id === applicant.id) || null)
})

// Sign/upload signed MOU
post.post('/mou/:id/sign', getCurrentUser, async (c) => {
  const fd = await c.req.formData()
  const file = fd.get('signature') as File | null
  if (!file) throw new HTTPException(400)

  const ext = file.name.split('.').pop() || 'bin'
  const storedName = `mou-signed-${Date.now()}.${ext}`
  const buffer = Buffer.from(await file.arrayBuffer())
  const fs = await import('node:fs/promises')
  const path = await import('node:path')
  const dir = path.join(process.cwd(), 'uploads', 'mou')
  await fs.mkdir(dir, { recursive: true })
  await fs.writeFile(path.join(dir, storedName), buffer)

  const r = await updateRecord('applicant_mous', pid(c), {
    signature_url: `/uploads/mou/${storedName}`,
    signed_at: new Date().toISOString(),
    status: 'signed',
  })
  if (!r) throw new HTTPException(404)
  return c.json(r)
})

// Admin review MOU
post.put('/mou/:id/review', getCurrentUser, requireAdmin, zValidator('json', z.object({
  status: z.enum(['signed', 'rejected']),
})), async (c) => {
  const body = c.req.valid('json')
  const r = await updateRecord('applicant_mous', pid(c), body)
  if (!r) throw new HTTPException(404)
  return c.json(r)
})

// ═══════ Acceptance Letters ═══════
post.get('/acceptance-letters', getCurrentUser, requireAdmin, async (c) => {
  const page = parseInt(c.req.query('page') || '1')
  const result = await searchPaginated('acceptance_letters', { page, perPage: 20, order: 'created_at.desc' })
  return c.json(result)
})

post.post('/acceptance-letters/generate', getCurrentUser, requireAdmin, zValidator('json', z.object({
  applicant_id: z.string().min(1),
})), async (c) => {
  const { applicant_id } = c.req.valid('json')
  const user = c.get('user')
  const letterNumber = `SKP/${new Date().getFullYear()}/${String(Math.floor(Math.random() * 9999)).padStart(4, '0')}`
  const row = await createRecord('acceptance_letters', {
    applicant_id, letter_number: letterNumber,
    issued_date: new Date().toISOString().split('T')[0], issued_by: user.id,
  })
  return c.json(row, 201)
})

post.get('/acceptance-letters/mine', getCurrentUser, async (c) => {
  const applicant = await getByColumn('applicants', 'user_id', c.get('user').id as string)
  if (!applicant) throw new HTTPException(404)
  const letter = await getByColumn('acceptance_letters', 'applicant_id', applicant.id)
  return c.json(letter)
})

// ═══════ Re-registrations ═══════
post.get('/re-registrations', getCurrentUser, requireAdmin, async (c) => {
  const page = parseInt(c.req.query('page') || '1')
  const result = await searchPaginated('re_registrations', { page, perPage: 20, order: 'created_at.desc' })
  const enriched = await Promise.all((result.data as any[]).map(async (r) => {
    const applicant = await getById('applicants', r.applicant_id)
    const profile = applicant ? await getByColumn('applicant_profiles', 'applicant_id', applicant.id) : null
    return { ...r, applicant, profile }
  }))
  return c.json({ data: enriched, total: result.total })
})

post.post('/re-registrations', getCurrentUser, requireAdmin, zValidator('json', z.object({
  applicant_id: z.string().min(1), deadline: z.string().min(1), notes: z.string().nullable().optional(),
})), async (c) => {
  return c.json(await createRecord('re_registrations', c.req.valid('json')), 201)
})

post.put('/re-registrations/:id', getCurrentUser, requireAdmin, zValidator('json', z.object({
  status: z.string().optional(), notes: z.string().nullable().optional(),
})), async (c) => {
  const body = c.req.valid('json')
  const data: any = { ...body }
  if (body.status === 'completed') data.completed_at = new Date().toISOString()
  const r = await updateRecord('re_registrations', pid(c), data)
  if (!r) throw new HTTPException(404)
  return c.json(r)
})

post.get('/re-registrations/mine', getCurrentUser, async (c) => {
  const applicant = await getByColumn('applicants', 'user_id', c.get('user').id as string)
  if (!applicant) throw new HTTPException(404)
  const reg = await getByColumn('re_registrations', 'applicant_id', applicant.id)
  return c.json(reg)
})

// ═══════ MPLS ═══════
post.get('/mpls-schedules', getCurrentUser, requireAdmin, async (c) => {
  return c.json(await listAll('mpls_schedules', { order: 'event_date.asc', limit: 100 }))
})

post.post('/mpls-schedules', getCurrentUser, requireAdmin, zValidator('json', z.object({
  period_id: z.string().min(1), title: z.string().min(1), description: z.string().nullable().optional(),
  event_date: z.string().min(1), start_time: z.string().min(1), end_time: z.string().min(1), location: z.string().nullable().optional(),
})), async (c) => {
  const user = c.get('user')
  return c.json(await createRecord('mpls_schedules', { ...c.req.valid('json'), created_by: user.id }), 201)
})

post.put('/mpls-schedules/:id', getCurrentUser, requireAdmin, zValidator('json', z.object({
  title: z.string().optional(), description: z.string().nullable().optional(),
  event_date: z.string().optional(), start_time: z.string().optional(), end_time: z.string().optional(), location: z.string().nullable().optional(),
})), async (c) => {
  const r = await updateRecord('mpls_schedules', pid(c), c.req.valid('json'))
  if (!r) throw new HTTPException(404)
  return c.json(r)
})

post.delete('/mpls-schedules/:id', getCurrentUser, requireAdmin, async (c) => {
  await deleteRecord('mpls_schedules', pid(c))
  return c.json({ success: true })
})

post.post('/mpls/assign', getCurrentUser, requireAdmin, zValidator('json', z.object({
  applicant_id: z.string().min(1), schedule_id: z.string().min(1),
})), async (c) => {
  return c.json(await createRecord('applicant_mpls', c.req.valid('json')), 201)
})

post.get('/mpls/mine', getCurrentUser, async (c) => {
  const applicant = await getByColumn('applicants', 'user_id', c.get('user').id as string)
  if (!applicant) throw new HTTPException(404)
  const all = await listAll('applicant_mpls', { limit: 20 })
  const mine = all.filter((m: any) => m.applicant_id === applicant.id)
  const enriched = await Promise.all(mine.map(async (am: any) => {
    const schedule = await getById('mpls_schedules', am.schedule_id)
    return { ...am, schedule }
  }))
  return c.json(enriched)
})

post.get('/mpls', getCurrentUser, requireAdmin, async (c) => {
  const all = await listAll('applicant_mpls', { limit: 200 })
  const enriched = await Promise.all(all.map(async (am: any) => {
    const applicant = await getById('applicants', am.applicant_id)
    const profile = applicant ? await getByColumn('applicant_profiles', 'applicant_id', applicant.id) : null
    return { ...am, applicant, profile }
  }))
  return c.json(enriched)
})

post.delete('/mpls/:id', getCurrentUser, requireAdmin, async (c) => {
  await deleteRecord('applicant_mpls', pid(c))
  return c.json({ success: true })
})

export default post
