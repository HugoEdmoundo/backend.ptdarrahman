import { Hono } from 'hono'
import { HTTPException } from 'hono/http-exception'
import { zValidator } from '@hono/zod-validator'
import { z } from 'zod'
import { getCurrentUser, requireSuperadmin } from '../middleware/auth'
import {
  listAll,
  getById,
  getByColumn,
  createRecord,
  updateRecord,
  deleteRecord,
  searchPaginated,
  auditLog,
  getRawPool,
} from '../db/mysql'
import { requirePPDBAdmin } from './middleware'
import type { Variables } from '../types'

const ppdb = new Hono<{ Variables: Variables }>()

function pid(c: any): string { return c.req.param('id') as string }

// ════════════════════════════════════════════════════════
// Validation schemas
// ════════════════════════════════════════════════════════

const periodSchema = z.object({
  name: z.string().min(1),
  academic_year: z.string().min(1),
  start_date: z.string().min(1),
  end_date: z.string().min(1),
  status: z.string().optional(),
  description: z.string().optional().nullable(),
})

const waveSchema = z.object({
  period_id: z.string().min(1),
  name: z.string().min(1),
  wave_number: z.number().int().min(1),
  start_date: z.string().min(1),
  end_date: z.string().min(1),
  quota: z.number().int().min(0),
  waiting_list_enabled: z.boolean().optional(),
  auto_move_next_wave: z.boolean().optional(),
  discount_type: z.string().optional().nullable(),
  discount_value: z.number().optional().nullable(),
  status: z.string().optional(),
})

const levelSchema = z.object({
  code: z.string().min(1),
  name: z.string().min(1),
  description: z.string().optional().nullable(),
  sort_order: z.number().int().optional(),
  is_active: z.boolean().optional(),
})

const categorySchema = z.object({
  code: z.string().min(1),
  name: z.string().min(1),
  description: z.string().optional().nullable(),
  is_active: z.boolean().optional(),
})

const flowStepSchema = z.object({
  sequence: z.number().int().min(1),
  code: z.string().min(1),
  name: z.string().min(1),
  step_type: z.string().min(1),
  is_required: z.boolean().optional(),
  config: z.any().optional().nullable(),
})

const flowSchema = z.object({
  name: z.string().min(1),
  description: z.string().optional().nullable(),
  is_active: z.boolean().optional(),
  steps: z.array(flowStepSchema).optional(),
})

const waveConfigSchema = z.object({
  wave_id: z.string().min(1),
  level_id: z.string().min(1),
  category_id: z.string().min(1),
  flow_id: z.string().min(1),
  payment_stage_count: z.number().int().optional(),
  quota: z.number().int().min(0),
  status: z.string().optional(),
})

// ════════════════════════════════════════════════════════
// Periods CRUD
// ════════════════════════════════════════════════════════

ppdb.get('/periods', getCurrentUser, requirePPDBAdmin, async (c) => {
  const page = parseInt(c.req.query('page') || '1')
  const perPage = parseInt(c.req.query('perPage') || '20')
  const search = c.req.query('search') || ''
  const result = await searchPaginated('ppdb_periods', {
    search,
    columns: ['name', 'academic_year'],
    page,
    perPage,
    order: 'created_at.desc',
  })
  return c.json(result)
})

ppdb.get('/periods/all', getCurrentUser, requirePPDBAdmin, async (c) => {
  const rows = await listAll('ppdb_periods', { order: 'created_at.desc', limit: 100 })
  return c.json(rows)
})

ppdb.get('/periods/:id', getCurrentUser, requirePPDBAdmin, async (c) => {
  const row = await getById('ppdb_periods', pid(c))
  if (!row) throw new HTTPException(404, { message: 'Period not found' })
  return c.json(row)
})

ppdb.post('/periods', getCurrentUser, requirePPDBAdmin, zValidator('json', periodSchema), async (c) => {
  const body = c.req.valid('json')
  const user = c.get('user')
  const userId = user.id as string
  const row = await createRecord('ppdb_periods', {
    ...body,
    created_by: userId,
  })

  await auditLog({
    userId,
    userUsername: user.username as string,
    action: 'CREATE',
    entityType: 'ppdb_periods',
    entityId: row.id as string,
    changes: body as Record<string, unknown>,
  })

  return c.json(row, 201)
})

ppdb.put('/periods/:id', getCurrentUser, requirePPDBAdmin, zValidator('json', periodSchema), async (c) => {
  const body = c.req.valid('json')
  const user = c.get('user')
  const row = await updateRecord('ppdb_periods', pid(c), body)
  if (!row) throw new HTTPException(404, { message: 'Period not found' })

  await auditLog({
    userId: user.id as string,
    userUsername: user.username as string,
    action: 'UPDATE',
    entityType: 'ppdb_periods',
    entityId: row.id as string,
    changes: body as Record<string, unknown>,
  })

  return c.json(row)
})

ppdb.delete('/periods/:id', getCurrentUser, requirePPDBAdmin, async (c) => {
  const user = c.get('user')
  const deleted = await deleteRecord('ppdb_periods', pid(c))
  if (!deleted) throw new HTTPException(404, { message: 'Period not found' })

  await auditLog({
    userId: user.id as string,
    userUsername: user.username as string,
    action: 'DELETE',
    entityType: 'ppdb_periods',
    entityId: pid(c),
  })

  return c.json({ success: true })
})

// ════════════════════════════════════════════════════════
// Waves CRUD
// ════════════════════════════════════════════════════════

ppdb.get('/waves', getCurrentUser, requirePPDBAdmin, async (c) => {
  const periodId = c.req.query('period_id')
  const page = parseInt(c.req.query('page') || '1')
  const perPage = parseInt(c.req.query('perPage') || '20')
  const search = c.req.query('search') || ''

  const filters: Record<string, unknown> = {}
  if (periodId) filters.period_id = periodId

  const result = await searchPaginated('ppdb_waves', {
    search,
    columns: ['name'],
    page,
    perPage,
    filters,
    order: 'wave_number.asc',
  })
  return c.json(result)
})

ppdb.get('/waves/all', getCurrentUser, requirePPDBAdmin, async (c) => {
  const periodId = c.req.query('period_id')
  const rows = await listAll('ppdb_waves', { order: 'wave_number.asc', limit: 100 })
  if (periodId) {
    return c.json(rows.filter((r: any) => r.period_id === periodId))
  }
  return c.json(rows)
})

ppdb.get('/waves/:id', getCurrentUser, requirePPDBAdmin, async (c) => {
  const row = await getById('ppdb_waves', pid(c))
  if (!row) throw new HTTPException(404, { message: 'Wave not found' })
  return c.json(row)
})

ppdb.post('/waves', getCurrentUser, requirePPDBAdmin, zValidator('json', waveSchema), async (c) => {
  const body = c.req.valid('json')
  const user = c.get('user')
  const row = await createRecord('ppdb_waves', {
    ...body,
    waiting_list_enabled: body.waiting_list_enabled ? 1 : 0,
    auto_move_next_wave: body.auto_move_next_wave ? 1 : 0,
    created_by: user.id,
  })

  await auditLog({
    userId: user.id as string,
    userUsername: user.username as string,
    action: 'CREATE',
    entityType: 'ppdb_waves',
    entityId: row.id as string,
  })

  return c.json(row, 201)
})

ppdb.put('/waves/:id', getCurrentUser, requirePPDBAdmin, zValidator('json', waveSchema), async (c) => {
  const body = c.req.valid('json')
  const user = c.get('user')
  const row = await updateRecord('ppdb_waves', pid(c), {
    ...body,
    waiting_list_enabled: body.waiting_list_enabled ? 1 : 0,
    auto_move_next_wave: body.auto_move_next_wave ? 1 : 0,
  })
  if (!row) throw new HTTPException(404, { message: 'Wave not found' })

  await auditLog({
    userId: user.id as string,
    userUsername: user.username as string,
    action: 'UPDATE',
    entityType: 'ppdb_waves',
    entityId: row.id as string,
  })

  return c.json(row)
})

ppdb.delete('/waves/:id', getCurrentUser, requirePPDBAdmin, async (c) => {
  const user = c.get('user')
  const deleted = await deleteRecord('ppdb_waves', pid(c))
  if (!deleted) throw new HTTPException(404, { message: 'Wave not found' })

  await auditLog({
    userId: user.id as string,
    userUsername: user.username as string,
    action: 'DELETE',
    entityType: 'ppdb_waves',
    entityId: pid(c),
  })

  return c.json({ success: true })
})

// ════════════════════════════════════════════════════════
// Education Levels CRUD
// ════════════════════════════════════════════════════════

ppdb.get('/levels', getCurrentUser, requirePPDBAdmin, async (c) => {
  const rows = await listAll('education_levels', { order: 'sort_order.asc', limit: 100 })
  return c.json(rows)
})

ppdb.get('/levels/:id', getCurrentUser, requirePPDBAdmin, async (c) => {
  const row = await getById('education_levels', pid(c))
  if (!row) throw new HTTPException(404, { message: 'Level not found' })
  return c.json(row)
})

ppdb.post('/levels', getCurrentUser, requirePPDBAdmin, zValidator('json', levelSchema), async (c) => {
  const body = c.req.valid('json')
  const user = c.get('user')
  const existing = await getByColumn('education_levels', 'code', body.code)
  if (existing) throw new HTTPException(400, { message: 'Code already exists' })

  const row = await createRecord('education_levels', body)
  await auditLog({ userId: user.id as string, userUsername: user.username as string, action: 'CREATE', entityType: 'education_levels', entityId: row.id as string })
  return c.json(row, 201)
})

ppdb.put('/levels/:id', getCurrentUser, requirePPDBAdmin, zValidator('json', levelSchema), async (c) => {
  const body = c.req.valid('json')
  const user = c.get('user')
  const row = await updateRecord('education_levels', pid(c), body)
  if (!row) throw new HTTPException(404, { message: 'Level not found' })
  await auditLog({ userId: user.id as string, userUsername: user.username as string, action: 'UPDATE', entityType: 'education_levels', entityId: row.id as string })
  return c.json(row)
})

ppdb.delete('/levels/:id', getCurrentUser, requirePPDBAdmin, async (c) => {
  const user = c.get('user')
  const deleted = await deleteRecord('education_levels', pid(c))
  if (!deleted) throw new HTTPException(404, { message: 'Level not found' })
  await auditLog({ userId: user.id as string, userUsername: user.username as string, action: 'DELETE', entityType: 'education_levels', entityId: pid(c) })
  return c.json({ success: true })
})

// ════════════════════════════════════════════════════════
// Registration Categories CRUD
// ════════════════════════════════════════════════════════

ppdb.get('/categories', getCurrentUser, requirePPDBAdmin, async (c) => {
  const rows = await listAll('registration_categories', { order: 'created_at.asc', limit: 100 })
  return c.json(rows)
})

ppdb.get('/categories/:id', getCurrentUser, requirePPDBAdmin, async (c) => {
  const row = await getById('registration_categories', pid(c))
  if (!row) throw new HTTPException(404, { message: 'Category not found' })
  return c.json(row)
})

ppdb.post('/categories', getCurrentUser, requirePPDBAdmin, zValidator('json', categorySchema), async (c) => {
  const body = c.req.valid('json')
  const user = c.get('user')
  const existing = await getByColumn('registration_categories', 'code', body.code)
  if (existing) throw new HTTPException(400, { message: 'Code already exists' })
  const row = await createRecord('registration_categories', body)
  await auditLog({ userId: user.id as string, userUsername: user.username as string, action: 'CREATE', entityType: 'registration_categories', entityId: row.id as string })
  return c.json(row, 201)
})

ppdb.put('/categories/:id', getCurrentUser, requirePPDBAdmin, zValidator('json', categorySchema), async (c) => {
  const body = c.req.valid('json')
  const user = c.get('user')
  const row = await updateRecord('registration_categories', pid(c), body)
  if (!row) throw new HTTPException(404, { message: 'Category not found' })
  await auditLog({ userId: user.id as string, userUsername: user.username as string, action: 'UPDATE', entityType: 'registration_categories', entityId: row.id as string })
  return c.json(row)
})

ppdb.delete('/categories/:id', getCurrentUser, requirePPDBAdmin, async (c) => {
  const user = c.get('user')
  const deleted = await deleteRecord('registration_categories', pid(c))
  if (!deleted) throw new HTTPException(404, { message: 'Category not found' })
  await auditLog({ userId: user.id as string, userUsername: user.username as string, action: 'DELETE', entityType: 'registration_categories', entityId: pid(c) })
  return c.json({ success: true })
})

// ════════════════════════════════════════════════════════
// Selection Flows CRUD (with steps)
// ════════════════════════════════════════════════════════

ppdb.get('/flows', getCurrentUser, requirePPDBAdmin, async (c) => {
  const rows = await listAll('selection_flows', { order: 'created_at.desc', limit: 100 })
  return c.json(rows)
})

ppdb.get('/flows/:id', getCurrentUser, requirePPDBAdmin, async (c) => {
  const row = await getById('selection_flows', pid(c))
  if (!row) throw new HTTPException(404, { message: 'Flow not found' })
  const steps = await listAll('selection_flow_steps', { order: 'sequence.asc', limit: 50 })
  return c.json({ ...row, steps: steps.filter((s: any) => s.flow_id === row.id) })
})

ppdb.post('/flows', getCurrentUser, requirePPDBAdmin, zValidator('json', flowSchema), async (c) => {
  const body = c.req.valid('json')
  const user = c.get('user')
  const { steps: stepData, ...flowData } = body

  const flow = await createRecord('selection_flows', {
    ...flowData,
    created_by: user.id,
  })

  if (stepData && stepData.length > 0) {
    for (const step of stepData) {
      await createRecord('selection_flow_steps', {
        flow_id: flow.id,
        sequence: step.sequence,
        code: step.code,
        name: step.name,
        step_type: step.step_type,
        is_required: step.is_required ?? true,
        config: step.config ? JSON.stringify(step.config) : null,
      })
    }
  }

  await auditLog({ userId: user.id as string, userUsername: user.username as string, action: 'CREATE', entityType: 'selection_flows', entityId: flow.id as string })
  return c.json(flow, 201)
})

ppdb.put('/flows/:id', getCurrentUser, requirePPDBAdmin, zValidator('json', flowSchema), async (c) => {
  const body = c.req.valid('json')
  const user = c.get('user')
  const { steps: stepData, ...flowData } = body

  const flow = await updateRecord('selection_flows', pid(c), flowData)
  if (!flow) throw new HTTPException(404, { message: 'Flow not found' })

  if (stepData !== undefined) {
    const existingSteps = await listAll('selection_flow_steps', { limit: 100 })
    const currentSteps = existingSteps.filter((s: any) => s.flow_id === flow.id)
    for (const step of currentSteps) {
      await deleteRecord('selection_flow_steps', step.id as string)
    }
    for (const step of stepData) {
      await createRecord('selection_flow_steps', {
        flow_id: flow.id,
        sequence: step.sequence,
        code: step.code,
        name: step.name,
        step_type: step.step_type,
        is_required: step.is_required ?? true,
        config: step.config ? JSON.stringify(step.config) : null,
      })
    }
  }

  await auditLog({ userId: user.id as string, userUsername: user.username as string, action: 'UPDATE', entityType: 'selection_flows', entityId: flow.id as string })
  return c.json(flow)
})

ppdb.delete('/flows/:id', getCurrentUser, requirePPDBAdmin, async (c) => {
  const user = c.get('user')
  const deleted = await deleteRecord('selection_flows', pid(c))
  if (!deleted) throw new HTTPException(404, { message: 'Flow not found' })
  await auditLog({ userId: user.id as string, userUsername: user.username as string, action: 'DELETE', entityType: 'selection_flows', entityId: pid(c) })
  return c.json({ success: true })
})

// ════════════════════════════════════════════════════════
// Wave Configurations CRUD
// ════════════════════════════════════════════════════════

ppdb.get('/wave-configs', getCurrentUser, requirePPDBAdmin, async (c) => {
  const waveId = c.req.query('wave_id')
  const filters: Record<string, unknown> = {}
  if (waveId) filters.wave_id = waveId

  const page = parseInt(c.req.query('page') || '1')
  const perPage = parseInt(c.req.query('perPage') || '50')
  const result = await searchPaginated('wave_configurations', { page, perPage, filters, order: 'created_at.desc' })
  return c.json(result)
})

ppdb.get('/wave-configs/:id', getCurrentUser, requirePPDBAdmin, async (c) => {
  const row = await getById('wave_configurations', pid(c))
  if (!row) throw new HTTPException(404, { message: 'Wave configuration not found' })
  return c.json(row)
})

ppdb.post('/wave-configs', getCurrentUser, requirePPDBAdmin, zValidator('json', waveConfigSchema), async (c) => {
  const body = c.req.valid('json')
  const user = c.get('user')

  const existing = await getByColumn('wave_configurations', 'wave_id', body.wave_id)
  if (existing) {
    const existsLevel = existing.level_id === body.level_id
    const existsCategory = existing.category_id === body.category_id
    if (existsLevel && existsCategory) {
      throw new HTTPException(400, { message: 'Configuration for this wave, level, and category already exists' })
    }
  }

  const row = await createRecord('wave_configurations', body)
  await auditLog({ userId: user.id as string, userUsername: user.username as string, action: 'CREATE', entityType: 'wave_configurations', entityId: row.id as string })
  return c.json(row, 201)
})

ppdb.put('/wave-configs/:id', getCurrentUser, requirePPDBAdmin, zValidator('json', waveConfigSchema), async (c) => {
  const body = c.req.valid('json')
  const user = c.get('user')
  const row = await updateRecord('wave_configurations', pid(c), body)
  if (!row) throw new HTTPException(404, { message: 'Wave configuration not found' })
  await auditLog({ userId: user.id as string, userUsername: user.username as string, action: 'UPDATE', entityType: 'wave_configurations', entityId: row.id as string })
  return c.json(row)
})

ppdb.delete('/wave-configs/:id', getCurrentUser, requirePPDBAdmin, async (c) => {
  const user = c.get('user')
  const deleted = await deleteRecord('wave_configurations', pid(c))
  if (!deleted) throw new HTTPException(404, { message: 'Wave configuration not found' })
  await auditLog({ userId: user.id as string, userUsername: user.username as string, action: 'DELETE', entityType: 'wave_configurations', entityId: pid(c) })
  return c.json({ success: true })
})

// ════════════════════════════════════════════════════════
// Applicant Registration & Profile (TASK-08)
// ════════════════════════════════════════════════════════

const applicantProfileSchema = z.object({
  full_name: z.string().min(1).optional(),
  nickname: z.string().optional().nullable(),
  gender: z.string().optional(),
  birth_place: z.string().optional(),
  birth_date: z.string().optional(),
  religion: z.string().optional(),
  nationality: z.string().optional(),
  nik: z.string().optional().nullable(),
  nisn: z.string().optional().nullable(),
  phone: z.string().optional().nullable(),
  email: z.string().optional().nullable(),
  address: z.string().optional(),
  province: z.string().optional().nullable(),
  city: z.string().optional().nullable(),
  district: z.string().optional().nullable(),
  village: z.string().optional().nullable(),
  postal_code: z.string().optional().nullable(),
  previous_school: z.string().optional().nullable(),
})

const applicantRegisterSchema = z.object({
  wave_config_id: z.string().min(1),
  full_name: z.string().min(1),
  gender: z.string().min(1),
  birth_place: z.string().min(1),
  birth_date: z.string().min(1),
  address: z.string().min(1),
  nik: z.string().optional().nullable(),
  nisn: z.string().optional().nullable(),
  phone: z.string().optional().nullable(),
  email: z.string().optional().nullable(),
})

// Generate registration number: PPDB-YYYY-XXXXX
async function generateRegistrationNumber(): Promise<string> {
  const year = new Date().getFullYear()
  const pool = getRawPool()
  const prefix = `PPDB-${year}-`
  const [rows] = await pool.execute<any[]>(
    `SELECT registration_number FROM applicants WHERE registration_number LIKE ? ORDER BY registration_number DESC LIMIT 1`,
    [`${prefix}%`]
  )
  let count = 1
  if (rows.length > 0) {
    const lastNum = parseInt((rows[0].registration_number as string).split('-')[2])
    if (!isNaN(lastNum)) count = lastNum + 1
  }
  return `${prefix}${String(count).padStart(5, '0')}`
}

// Admin: list all applicants
ppdb.get('/applicants', getCurrentUser, requirePPDBAdmin, async (c) => {
  const page = parseInt(c.req.query('page') || '1')
  const perPage = parseInt(c.req.query('perPage') || '20')
  const search = c.req.query('search') || ''
  const status = c.req.query('status') || ''

  const filters: Record<string, unknown> = {}
  if (status) filters.current_status = status

  const result = await searchPaginated('applicants', { search, columns: ['registration_number'], page, perPage, filters, order: 'created_at.desc' })

  const enriched = await Promise.all((result.data as any[]).map(async (a) => {
    const profile = await getByColumn('applicant_profiles', 'applicant_id', a.id)
    return { ...a, profile }
  }))

  return c.json({ data: enriched, total: result.total })
})

// Admin: get applicant detail
ppdb.get('/applicants/:id', getCurrentUser, requirePPDBAdmin, async (c) => {
  const applicant = await getById('applicants', pid(c))
  if (!applicant) throw new HTTPException(404, { message: 'Applicant not found' })

  const profile = await getByColumn('applicant_profiles', 'applicant_id', applicant.id)
  const parents = await listAll('applicant_parents', { limit: 3 })
  const history = await listAll('applicant_status_histories', { order: 'created_at.desc', limit: 50 })

  return c.json({
    ...applicant,
    profile,
    parents: parents.filter((p: any) => p.applicant_id === applicant.id),
    status_history: history.filter((h: any) => h.applicant_id === applicant.id),
  })
})

// Applicant: register (requires auth - user already registered via /auth/register-applicant)
ppdb.post('/applicants/register', getCurrentUser, zValidator('json', applicantRegisterSchema), async (c) => {
  const body = c.req.valid('json')
  const user = c.get('user')
  const userId = user.id as string

  const existing = await getByColumn('applicants', 'user_id', userId)
  if (existing) throw new HTTPException(400, { message: 'You already have a PPDB application' })

  const regNumber = await generateRegistrationNumber()
  const applicant = await createRecord('applicants', {
    user_id: userId,
    wave_config_id: body.wave_config_id,
    registration_number: regNumber,
    current_status: 'registered',
  })

  await createRecord('applicant_profiles', {
    applicant_id: applicant.id,
    full_name: body.full_name,
    gender: body.gender,
    birth_place: body.birth_place,
    birth_date: body.birth_date,
    address: body.address,
    nik: body.nik || null,
    nisn: body.nisn || null,
    phone: body.phone || null,
    email: body.email || null,
  })

  await createRecord('applicant_status_histories', {
    applicant_id: applicant.id,
    new_status: 'registered',
    changed_by: userId,
    notes: 'Pendaftaran awal',
  })

  await auditLog({ userId, userUsername: user.username as string, action: 'CREATE', entityType: 'applicants', entityId: applicant.id as string })

  // Auto-generate Tahap 1 invoice (stage_number = 1)
  const stages = await listAll('payment_stages', { order: 'stage_number.asc', limit: 20 })
  const stage1 = stages.find((s: any) => s.wave_config_id === body.wave_config_id && s.stage_number === 1)
  if (stage1) {
    const invNumber = `INV-${regNumber.replace('PPDB-', '')}-01`
    await createRecord('invoices', {
      applicant_id: applicant.id, payment_stage_id: stage1.id, invoice_number: invNumber,
      amount: stage1.amount, discount_amount: 0, total_amount: stage1.amount,
      status: 'unpaid', due_date: stage1.due_date || null,
    })
  }

  return c.json(applicant, 201)
})

// Applicant: get my application
ppdb.get('/applicants/me', getCurrentUser, async (c) => {
  const user = c.get('user')
  const applicant = await getByColumn('applicants', 'user_id', user.id as string)
  if (!applicant) throw new HTTPException(404, { message: 'No PPDB application found' })

  const profile = await getByColumn('applicant_profiles', 'applicant_id', applicant.id)
  const waveConfig = await getById('wave_configurations', applicant.wave_config_id as string)
  const wave = waveConfig ? await getById('ppdb_waves', waveConfig.wave_id as string) : null
  const period = wave ? await getById('ppdb_periods', wave.period_id as string) : null
  const level = waveConfig ? await getById('education_levels', waveConfig.level_id as string) : null
  const category = waveConfig ? await getById('registration_categories', waveConfig.category_id as string) : null

  return c.json({ ...applicant, profile, wave_config: waveConfig, wave, period, level, category })
})

// Applicant: update my profile
ppdb.put('/applicants/me/profile', getCurrentUser, zValidator('json', applicantProfileSchema), async (c) => {
  const body = c.req.valid('json')
  const user = c.get('user')
  const applicant = await getByColumn('applicants', 'user_id', user.id as string)
  if (!applicant) throw new HTTPException(404, { message: 'No PPDB application found' })

  const profile = await getByColumn('applicant_profiles', 'applicant_id', applicant.id)
  if (!profile) throw new HTTPException(404, { message: 'Profile not found' })

  await updateRecord('applicant_profiles', profile.id as string, body)
  const updated = await getByColumn('applicant_profiles', 'applicant_id', applicant.id)
  return c.json(updated)
})

// ════════════════════════════════════════════════════════
// Applicant Parents & Status History (TASK-09)
// ════════════════════════════════════════════════════════

const parentSchema = z.object({
  parent_type: z.string().min(1),
  full_name: z.string().min(1),
  nik: z.string().optional().nullable(),
  phone: z.string().optional().nullable(),
  email: z.string().optional().nullable(),
  occupation: z.string().optional().nullable(),
  income: z.string().optional().nullable(),
  education: z.string().optional().nullable(),
  address: z.string().optional().nullable(),
  is_same_address: z.boolean().optional(),
})

// Applicant: get my parents
ppdb.get('/applicants/me/parents', getCurrentUser, async (c) => {
  const user = c.get('user')
  const applicant = await getByColumn('applicants', 'user_id', user.id as string)
  if (!applicant) throw new HTTPException(404, { message: 'No PPDB application found' })

  const parents = await listAll('applicant_parents', { limit: 3 })
  return c.json(parents.filter((p: any) => p.applicant_id === applicant.id))
})

// Applicant: save/update parent
ppdb.put('/applicants/me/parents/:parentType', getCurrentUser, zValidator('json', parentSchema), async (c) => {
  const body = c.req.valid('json')
  const parentType = c.req.param('parentType')
  const user = c.get('user')
  const applicant = await getByColumn('applicants', 'user_id', user.id as string)
  if (!applicant) throw new HTTPException(404, { message: 'No PPDB application found' })

  const existing = await getByColumn('applicant_parents', 'applicant_id', applicant.id)
  const parents = await listAll('applicant_parents', { limit: 3 })
  const existingParent = parents.find((p: any) => p.applicant_id === applicant.id && p.parent_type === parentType)

  if (existingParent) {
    const updated = await updateRecord('applicant_parents', existingParent.id as string, {
      ...body,
      is_same_address: body.is_same_address ? 1 : 0,
    })
    return c.json(updated)
  } else {
    const row = await createRecord('applicant_parents', {
      applicant_id: applicant.id,
      ...body,
      parent_type: parentType,
      is_same_address: body.is_same_address ? 1 : 0,
    })
    return c.json(row, 201)
  }
})

// Applicant: get my status history
ppdb.get('/applicants/me/status-history', getCurrentUser, async (c) => {
  const user = c.get('user')
  const applicant = await getByColumn('applicants', 'user_id', user.id as string)
  if (!applicant) throw new HTTPException(404, { message: 'No PPDB application found' })

  const history = await listAll('applicant_status_histories', { order: 'created_at.desc', limit: 50 })
  return c.json(history.filter((h: any) => h.applicant_id === applicant.id))
})

// Admin: add status history entry
ppdb.post('/applicants/:id/status', getCurrentUser, requirePPDBAdmin, zValidator('json', z.object({
  new_status: z.string().min(1),
  notes: z.string().optional().nullable(),
})), async (c) => {
  const body = c.req.valid('json')
  const user = c.get('user')
  const applicant = await getById('applicants', pid(c))
  if (!applicant) throw new HTTPException(404, { message: 'Applicant not found' })

  const oldStatus = applicant.current_status as string
  await updateRecord('applicants', applicant.id as string, { current_status: body.new_status })

  const history = await createRecord('applicant_status_histories', {
    applicant_id: applicant.id,
    old_status: oldStatus,
    new_status: body.new_status,
    changed_by: user.id,
    notes: body.notes || null,
  })

  await auditLog({
    userId: user.id as string,
    userUsername: user.username as string,
    action: 'UPDATE',
    entityType: 'applicants',
    entityId: applicant.id as string,
    changes: { old_status: oldStatus, new_status: body.new_status },
  })

  return c.json(history, 201)
})

// ════════════════════════════════════════════════════════
// Document Requirements (TASK-12)
// ════════════════════════════════════════════════════════

const docReqSchema = z.object({
  level_id: z.string().nullable().optional(),
  category_id: z.string().nullable().optional(),
  name: z.string().min(1),
  description: z.string().nullable().optional(),
  file_type: z.string().optional(),
  max_size_mb: z.number().int().optional(),
  is_required: z.boolean().optional(),
  sort_order: z.number().int().optional(),
  is_active: z.boolean().optional(),
})

ppdb.get('/document-requirements', getCurrentUser, requirePPDBAdmin, async (c) => {
  const levelId = c.req.query('level_id')
  const rows = await listAll('document_requirements', { order: 'sort_order.asc', limit: 100 })
  if (levelId) return c.json(rows.filter((r: any) => r.level_id === levelId))
  return c.json(rows)
})

ppdb.post('/document-requirements', getCurrentUser, requirePPDBAdmin, zValidator('json', docReqSchema), async (c) => {
  const body = c.req.valid('json')
  const user = c.get('user')
  const row = await createRecord('document_requirements', body)
  await auditLog({ userId: user.id as string, userUsername: user.username as string, action: 'CREATE', entityType: 'document_requirements', entityId: row.id as string })
  return c.json(row, 201)
})

ppdb.put('/document-requirements/:id', getCurrentUser, requirePPDBAdmin, zValidator('json', docReqSchema), async (c) => {
  const body = c.req.valid('json')
  const user = c.get('user')
  const row = await updateRecord('document_requirements', pid(c), body)
  if (!row) throw new HTTPException(404, { message: 'Not found' })
  await auditLog({ userId: user.id as string, userUsername: user.username as string, action: 'UPDATE', entityType: 'document_requirements', entityId: row.id as string })
  return c.json(row)
})

ppdb.delete('/document-requirements/:id', getCurrentUser, requirePPDBAdmin, async (c) => {
  const user = c.get('user')
  const deleted = await deleteRecord('document_requirements', pid(c))
  if (!deleted) throw new HTTPException(404, { message: 'Not found' })
  await auditLog({ userId: user.id as string, userUsername: user.username as string, action: 'DELETE', entityType: 'document_requirements', entityId: pid(c) })
  return c.json({ success: true })
})

// Applicant: document checklist
ppdb.get('/applicants/me/document-checklist', getCurrentUser, async (c) => {
  const user = c.get('user')
  const applicant = await getByColumn('applicants', 'user_id', user.id as string)
  if (!applicant) throw new HTTPException(404, { message: 'No PPDB application found' })

  const requirements = await listAll('document_requirements', { order: 'sort_order.asc', limit: 100 })
  const myDocs = await listAll('applicant_documents', { limit: 50 })

  const checklist = requirements.map((req: any) => {
    const doc = myDocs.find((d: any) => d.applicant_id === applicant.id && d.requirement_id === req.id)
    return { requirement: req, document: doc || null }
  })

  const uploaded = myDocs.filter((d: any) => d.applicant_id === applicant.id)
  return c.json({
    data: checklist,
    summary: {
      total_required: requirements.filter((r: any) => r.is_required).length,
      uploaded: uploaded.length,
      verified: uploaded.filter((d: any) => d.status === 'verified').length,
      pending: uploaded.filter((d: any) => d.status === 'pending' || d.status === 'uploaded').length,
      rejected: uploaded.filter((d: any) => d.status === 'rejected').length,
    },
  })
})

// Applicant: upload document
ppdb.post('/applicants/me/documents', getCurrentUser, async (c) => {
  const user = c.get('user')
  const applicant = await getByColumn('applicants', 'user_id', user.id as string)
  if (!applicant) throw new HTTPException(404, { message: 'No PPDB application found' })

  const fd = await c.req.formData()
  const file = fd.get('file') as File | null
  const requirementId = fd.get('requirement_id') as string | null

  if (!file || !requirementId) throw new HTTPException(400, { message: 'file and requirement_id are required' })

  const requirement = await getById('document_requirements', requirementId)
  if (!requirement) throw new HTTPException(404, { message: 'Requirement not found' })

  const maxSize = (requirement.max_size_mb as number || 5) * 1024 * 1024
  if (file.size > maxSize) throw new HTTPException(400, { message: `File too large. Max ${requirement.max_size_mb}MB` })

  const allowedDocTypes = new Set(['image/jpeg', 'image/png', 'image/webp', 'image/gif', 'application/pdf'])
  if (requirement.file_type && typeof requirement.file_type === 'string' && requirement.file_type.trim()) {
    const reqTypes = requirement.file_type.split(',').map((t: string) => t.trim().toLowerCase())
    if (!reqTypes.includes(file.type)) {
      throw new HTTPException(400, { message: `File type not allowed. Required: ${reqTypes.join(', ')}` })
    }
  } else if (!allowedDocTypes.has(file.type)) {
    throw new HTTPException(400, { message: 'File type not allowed. Accepted: JPEG, PNG, WebP, GIF, PDF' })
  }

  const existingDoc = await getByColumn('applicant_documents', 'applicant_id', applicant.id)
  const docs = await listAll('applicant_documents', { limit: 50 })
  const existing = docs.find((d: any) => d.applicant_id === applicant.id && d.requirement_id === requirementId)
  if (existing && existing.status !== 'rejected') {
    throw new HTTPException(400, { message: 'Document already uploaded' })
  }

  const ext = file.name.split('.').pop()?.toLowerCase() || 'bin'
  const storedName = `${Date.now()}_${Math.random().toString(36).slice(2)}.${ext}`
  const buffer = Buffer.from(await file.arrayBuffer())

  const fs = await import('node:fs/promises')
  const path = await import('node:path')
  const uploadDir = path.join(process.cwd(), 'uploads', 'documents')
  await fs.mkdir(uploadDir, { recursive: true })
  await fs.writeFile(path.join(uploadDir, storedName), buffer)

  const fileRecord = await createRecord('file_uploads', {
    uploaded_by: user.id,
    original_name: file.name,
    stored_name: storedName,
    mime_type: file.type || 'application/octet-stream',
    size_bytes: file.size,
    storage_path: `uploads/documents/${storedName}`,
    public_url: `/uploads/documents/${storedName}`,
    entity_type: 'applicant_document',
    entity_id: applicant.id,
  })

  if (existing) {
    await updateRecord('applicant_documents', existing.id as string, {
      file_upload_id: fileRecord.id,
      file_url: `/uploads/documents/${storedName}`,
      status: 'uploaded',
      verified_by: null,
      verified_at: null,
      rejection_reason: null,
    })
    return c.json(await getById('applicant_documents', existing.id as string))
  }

  const doc = await createRecord('applicant_documents', {
    applicant_id: applicant.id,
    requirement_id: requirementId,
    file_upload_id: fileRecord.id,
    file_url: `/uploads/documents/${storedName}`,
    status: 'uploaded',
  })

  return c.json(doc, 201)
})

// Applicant: get my documents
ppdb.get('/applicants/me/documents', getCurrentUser, async (c) => {
  const user = c.get('user')
  const applicant = await getByColumn('applicants', 'user_id', user.id as string)
  if (!applicant) throw new HTTPException(404, { message: 'No PPDB application found' })

  const docs = await listAll('applicant_documents', { order: 'created_at.desc', limit: 50 })
  return c.json(docs.filter((d: any) => d.applicant_id === applicant.id))
})

// ════════════════════════════════════════════════════════
// Public: list active wave-configs (no auth)
// ════════════════════════════════════════════════════════

ppdb.get('/public/wave-configs', async (c) => {
  const pool = getRawPool()
  const [rows] = await pool.execute<any[]>(`
    SELECT wc.id, wc.quota, wc.payment_stage_count,
           w.name as wave_name, w.wave_number, w.start_date as wave_start, w.end_date as wave_end,
           el.name as level_name, el.code as level_code, el.description as level_desc,
           rc.name as category_name, rc.code as category_code, rc.description as category_desc,
           pp.name as period_name, pp.academic_year, pp.description as period_desc
    FROM wave_configurations wc
    JOIN ppdb_waves w ON w.id = wc.wave_id AND w.status = 'active'
    JOIN education_levels el ON el.id = wc.level_id AND el.is_active = 1
    JOIN registration_categories rc ON rc.id = wc.category_id AND rc.is_active = 1
    JOIN ppdb_periods pp ON pp.id = w.period_id AND pp.status = 'active'
    WHERE wc.status = 'active'
    ORDER BY pp.start_date DESC, w.wave_number ASC, el.sort_order ASC
  `)
  return c.json(rows)
})

// Admin: document review queue
ppdb.get('/admin/documents/review', getCurrentUser, requirePPDBAdmin, async (c) => {
  const status = c.req.query('status') || 'uploaded'
  const page = parseInt(c.req.query('page') || '1')
  const perPage = parseInt(c.req.query('perPage') || '20')

  const result = await searchPaginated('applicant_documents', {
    filters: { status },
    page,
    perPage,
    order: 'created_at.asc',
  })

  const enriched = await Promise.all((result.data as any[]).map(async (doc) => {
    const applicant = await getById('applicants', doc.applicant_id)
    const profile = applicant ? await getByColumn('applicant_profiles', 'applicant_id', applicant.id) : null
    const requirement = await getById('document_requirements', doc.requirement_id)
    return { ...doc, applicant, profile, requirement }
  }))

  return c.json({ data: enriched, total: result.total })
})

// Admin: review document
ppdb.put('/admin/documents/:id/review', getCurrentUser, requirePPDBAdmin, zValidator('json', z.object({
  status: z.enum(['verified', 'rejected']),
  rejection_reason: z.string().nullable().optional(),
})), async (c) => {
  const body = c.req.valid('json')
  const user = c.get('user')

  const doc = await updateRecord('applicant_documents', pid(c), {
    status: body.status,
    verified_by: user.id,
    verified_at: new Date().toISOString(),
    rejection_reason: body.status === 'rejected' ? (body.rejection_reason || null) : null,
  })

  if (!doc) throw new HTTPException(404, { message: 'Document not found' })

  await auditLog({
    userId: user.id as string,
    userUsername: user.username as string,
    action: 'UPDATE',
    entityType: 'applicant_documents',
    entityId: doc.id as string,
    changes: { status: body.status },
  })

  return c.json(doc)
})

export default ppdb
