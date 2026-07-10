import { Hono } from 'hono'
import { HTTPException } from 'hono/http-exception'
import { zValidator } from '@hono/zod-validator'
import { z } from 'zod'
import { getCurrentUser } from '../middleware/auth'
import { requirePPDBAdmin, requireSelectionAccess } from './middleware'
import { listAll, getById, getByColumn, createRecord, updateRecord, deleteRecord, searchPaginated, auditLog } from '../db/mysql'
import type { Variables } from '../types'

const selection = new Hono<{ Variables: Variables }>()

function pid(c: any): string { return c.req.param('id') as string }

// ═══════ Test Types ═══════
const testTypeSchema = z.object({
  code: z.string().min(1), name: z.string().min(1),
  description: z.string().nullable().optional(),
  is_active: z.boolean().optional(),
})

selection.get('/test-types', getCurrentUser, requirePPDBAdmin, async (c) => {
  return c.json(await listAll('test_types', { order: 'created_at.asc', limit: 100 }))
})

selection.post('/test-types', getCurrentUser, requirePPDBAdmin, zValidator('json', testTypeSchema), async (c) => {
  return c.json(await createRecord('test_types', c.req.valid('json')), 201)
})

selection.put('/test-types/:id', getCurrentUser, requirePPDBAdmin, zValidator('json', testTypeSchema), async (c) => {
  const r = await updateRecord('test_types', pid(c), c.req.valid('json'))
  if (!r) throw new HTTPException(404)
  return c.json(r)
})

selection.delete('/test-types/:id', getCurrentUser, requirePPDBAdmin, async (c) => {
  await deleteRecord('test_types', pid(c))
  return c.json({ success: true })
})

// ═══════ Test Parameters ═══════
const paramSchema = z.object({
  test_type_id: z.string().min(1), name: z.string().min(1),
  weight: z.number().optional(), min_score: z.number().optional(), max_score: z.number().optional(),
  passing_score: z.number().nullable().optional(), sort_order: z.number().optional(),
})

selection.get('/test-parameters', getCurrentUser, requirePPDBAdmin, async (c) => {
  const tid = c.req.query('test_type_id')
  const rows = await listAll('test_parameters', { order: 'sort_order.asc', limit: 100 })
  if (tid) return c.json(rows.filter((r: any) => r.test_type_id === tid))
  return c.json(rows)
})

selection.post('/test-parameters', getCurrentUser, requirePPDBAdmin, zValidator('json', paramSchema), async (c) => {
  return c.json(await createRecord('test_parameters', c.req.valid('json')), 201)
})

selection.put('/test-parameters/:id', getCurrentUser, requirePPDBAdmin, zValidator('json', paramSchema), async (c) => {
  const r = await updateRecord('test_parameters', pid(c), c.req.valid('json'))
  if (!r) throw new HTTPException(404)
  return c.json(r)
})

selection.delete('/test-parameters/:id', getCurrentUser, requirePPDBAdmin, async (c) => {
  await deleteRecord('test_parameters', pid(c))
  return c.json({ success: true })
})

// ═══════ Test Sessions ═══════
const sessionSchema = z.object({
  wave_config_id: z.string().min(1), test_type_id: z.string().min(1),
  session_name: z.string().min(1),
  test_date: z.string().min(1), start_time: z.string().min(1), end_time: z.string().min(1),
  location: z.string().nullable().optional(), capacity: z.number().int().min(1),
  status: z.string().optional(),
})

selection.get('/sessions', getCurrentUser, requirePPDBAdmin, async (c) => {
  const wc = c.req.query('wave_config_id')
  const page = parseInt(c.req.query('page') || '1')
  const filters: Record<string, unknown> = {}
  if (wc) filters.wave_config_id = wc
  const result = await searchPaginated('test_sessions', { page, perPage: 20, filters, order: 'test_date.desc' })
  const enriched = await Promise.all((result.data as any[]).map(async (s) => {
    const tt = await getById('test_types', s.test_type_id)
    return { ...s, test_type: tt }
  }))
  return c.json({ data: enriched, total: result.total })
})

selection.post('/sessions', getCurrentUser, requirePPDBAdmin, zValidator('json', sessionSchema), async (c) => {
  const user = c.get('user')
  const row = await createRecord('test_sessions', { ...c.req.valid('json'), created_by: user.id })
  return c.json(row, 201)
})

selection.put('/sessions/:id', getCurrentUser, requirePPDBAdmin, zValidator('json', sessionSchema), async (c) => {
  const r = await updateRecord('test_sessions', pid(c), c.req.valid('json'))
  if (!r) throw new HTTPException(404)
  return c.json(r)
})

selection.delete('/sessions/:id', getCurrentUser, requirePPDBAdmin, async (c) => {
  await deleteRecord('test_sessions', pid(c))
  return c.json({ success: true })
})

// Assign applicant to session
selection.post('/sessions/:id/assign', getCurrentUser, requirePPDBAdmin, zValidator('json', z.object({
  applicant_id: z.string().min(1),
})), async (c) => {
  const body = c.req.valid('json')
  const r = await createRecord('applicant_test_sessions', {
    applicant_id: body.applicant_id, test_session_id: pid(c),
  })
  return c.json(r, 201)
})

// Get applicant test sessions
selection.get('/applicants/me/sessions', getCurrentUser, async (c) => {
  const applicant = await getByColumn('applicants', 'user_id', c.get('user').id as string)
  if (!applicant) throw new HTTPException(404, { message: 'No application found' })
  const all = await listAll('applicant_test_sessions', { limit: 100 })
  const mine = all.filter((s: any) => s.applicant_id === applicant.id)
  const enriched = await Promise.all(mine.map(async (ats: any) => {
    const session = await getById('test_sessions', ats.test_session_id)
    const tt = session ? await getById('test_types', session.test_type_id as string) : null
    return { ...ats, session, test_type: tt }
  }))
  return c.json(enriched)
})

// ═══════ Test Results & Scores ═══════
selection.get('/results', getCurrentUser, requirePPDBAdmin, async (c) => {
  const aid = c.req.query('applicant_id')
  const page = parseInt(c.req.query('page') || '1')
  const filters: Record<string, unknown> = {}
  if (aid) filters.applicant_id = aid
  const result = await searchPaginated('applicant_test_results', { page, perPage: 20, filters, order: 'created_at.desc' })
  return c.json(result)
})

selection.post('/results', getCurrentUser, requirePPDBAdmin, zValidator('json', z.object({
  applicant_id: z.string().min(1), test_type_id: z.string().min(1),
  total_score: z.number().nullable().optional(), is_passed: z.boolean().nullable().optional(),
  notes: z.string().nullable().optional(),
  scores: z.array(z.object({ parameter_id: z.string().min(1), score: z.number() })).optional(),
})), async (c) => {
  const body = c.req.valid('json')
  const user = c.get('user')
  const existing = await getByColumn('applicant_test_results', 'applicant_id', body.applicant_id)
  const all = await listAll('applicant_test_results', { limit: 100 })
  const dup = all.find((r: any) => r.applicant_id === body.applicant_id && r.test_type_id === body.test_type_id)

  let result
  if (dup) {
    result = await updateRecord('applicant_test_results', dup.id as string, {
      total_score: body.total_score, is_passed: body.is_passed, notes: body.notes,
      graded_by: user.id, graded_at: new Date().toISOString(),
    })
  } else {
    result = await createRecord('applicant_test_results', {
      applicant_id: body.applicant_id, test_type_id: body.test_type_id,
      total_score: body.total_score, is_passed: body.is_passed, notes: body.notes,
      graded_by: user.id, graded_at: new Date().toISOString(),
    })
  }

  if (body.scores && body.scores.length > 0 && result) {
    const rid = (result as any).id as string
    const existingScores = await listAll('applicant_test_scores', { limit: 100 })
    for (const old of existingScores.filter((s: any) => s.result_id === rid)) {
      await deleteRecord('applicant_test_scores', old.id as string)
    }
    for (const sc of body.scores) {
      await createRecord('applicant_test_scores', { result_id: rid, parameter_id: sc.parameter_id, score: sc.score })
    }
  }

  return c.json(result, 201)
})

// Applicant: get my results
selection.get('/applicants/me/results', getCurrentUser, async (c) => {
  const applicant = await getByColumn('applicants', 'user_id', c.get('user').id as string)
  if (!applicant) throw new HTTPException(404)
  const all = await listAll('applicant_test_results', { limit: 50 })
  const mine = all.filter((r: any) => r.applicant_id === applicant.id)
  const enriched = await Promise.all(mine.map(async (r: any) => {
    const tt = await getById('test_types', r.test_type_id)
    const scores = await listAll('applicant_test_scores', { limit: 50 })
    const myScores = scores.filter((s: any) => s.result_id === r.id)
    const scoreDetails = await Promise.all(myScores.map(async (sc: any) => {
      const param = await getById('test_parameters', sc.parameter_id)
      return { ...sc, parameter: param }
    }))
    return { ...r, test_type: tt, scores: scoreDetails }
  }))
  return c.json(enriched)
})

// ═══════ Graduation ═══════
const gradRuleSchema = z.object({
  wave_config_id: z.string().min(1),
  rule_type: z.string().min(1),
  min_total_score: z.number().nullable().optional(),
  must_pass_all_tests: z.boolean().optional(),
  description: z.string().nullable().optional(),
  is_active: z.boolean().optional(),
})

selection.get('/graduation-rules', getCurrentUser, requirePPDBAdmin, async (c) => {
  const wc = c.req.query('wave_config_id')
  const rows = await listAll('graduation_rules', { limit: 50 })
  if (wc) return c.json(rows.filter((r: any) => r.wave_config_id === wc))
  return c.json(rows)
})

selection.post('/graduation-rules', getCurrentUser, requirePPDBAdmin, zValidator('json', gradRuleSchema), async (c) => {
  return c.json(await createRecord('graduation_rules', { ...c.req.valid('json'), must_pass_all_tests: c.req.valid('json').must_pass_all_tests ? 1 : 0 }), 201)
})

selection.put('/graduation-rules/:id', getCurrentUser, requirePPDBAdmin, zValidator('json', gradRuleSchema), async (c) => {
  const r = await updateRecord('graduation_rules', pid(c), { ...c.req.valid('json'), must_pass_all_tests: c.req.valid('json').must_pass_all_tests ? 1 : 0 })
  if (!r) throw new HTTPException(404)
  return c.json(r)
})

selection.delete('/graduation-rules/:id', getCurrentUser, requirePPDBAdmin, async (c) => {
  await deleteRecord('graduation_rules', pid(c))
  return c.json({ success: true })
})

// Set graduation for applicant
selection.post('/graduations', getCurrentUser, requirePPDBAdmin, zValidator('json', z.object({
  applicant_id: z.string().min(1),
  is_graduated: z.boolean(),
  graduation_rank: z.number().int().nullable().optional(),
  total_score: z.number().nullable().optional(),
  notes: z.string().nullable().optional(),
})), async (c) => {
  const body = c.req.valid('json')
  const user = c.get('user')
  const existing = await getByColumn('applicant_graduations', 'applicant_id', body.applicant_id)
  let row
  if (existing) {
    row = await updateRecord('applicant_graduations', existing.id as string, {
      is_graduated: body.is_graduated, graduation_rank: body.graduation_rank, total_score: body.total_score,
      notes: body.notes, decided_by: user.id, decided_at: new Date().toISOString(),
    })
  } else {
    row = await createRecord('applicant_graduations', {
      ...body, decided_by: user.id, decided_at: new Date().toISOString(),
    })
  }
  if (body.is_graduated) {
    await updateRecord('applicants', body.applicant_id, { current_status: 'graduated' })
    await createRecord('applicant_status_histories', {
      applicant_id: body.applicant_id, new_status: 'graduated', changed_by: user.id, notes: 'Lulus seleksi',
    })
  }
  return c.json(row, 201)
})

// Applicant: get my graduation
selection.get('/applicants/me/graduation', getCurrentUser, async (c) => {
  const applicant = await getByColumn('applicants', 'user_id', c.get('user').id as string)
  if (!applicant) throw new HTTPException(404)
  const grad = await getByColumn('applicant_graduations', 'applicant_id', applicant.id)
  return c.json(grad)
})

// Admin: list all graduations
selection.get('/graduations', getCurrentUser, requirePPDBAdmin, async (c) => {
  const page = parseInt(c.req.query('page') || '1')
  const result = await searchPaginated('applicant_graduations', { page, perPage: 20, order: 'graduation_rank.asc' })
  const enriched = await Promise.all((result.data as any[]).map(async (g) => {
    const applicant = await getById('applicants', g.applicant_id)
    const profile = applicant ? await getByColumn('applicant_profiles', 'applicant_id', applicant.id) : null
    return { ...g, applicant, profile }
  }))
  return c.json({ data: enriched, total: result.total })
})

export default selection
