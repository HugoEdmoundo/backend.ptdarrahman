import { Hono } from 'hono'
import { HTTPException } from 'hono/http-exception'
import { zValidator } from '@hono/zod-validator'
import { z } from 'zod'
import { getCurrentUser } from '../middleware/auth'
import { requireFinanceCrud } from './middleware'
import {
  listAll, getById, getByColumn, createRecord,
  updateRecord, deleteRecord, searchPaginated, auditLog,
} from '../db/mysql'
import type { Variables } from '../types'

const payment = new Hono<{ Variables: Variables }>()

function pid(c: any): string { return c.req.param('id') as string }

// ════════════ Payment Stages ════════════
const stageSchema = z.object({
  wave_config_id: z.string().min(1),
  stage_number: z.number().int().min(1),
  name: z.string().min(1),
  amount: z.number().min(0),
  due_date: z.string().nullable().optional(),
  description: z.string().nullable().optional(),
  is_installment_allowed: z.boolean().optional(),
  max_installments: z.number().int().optional(),
})

payment.get('/stages', getCurrentUser, requireFinanceCrud, async (c) => {
  const wcId = c.req.query('wave_config_id')
  const rows = await listAll('payment_stages', { order: 'stage_number.asc', limit: 100 })
  if (wcId) return c.json(rows.filter((r: any) => r.wave_config_id === wcId))
  return c.json(rows)
})

payment.post('/stages', getCurrentUser, requireFinanceCrud, zValidator('json', stageSchema), async (c) => {
  const body = c.req.valid('json')
  const row = await createRecord('payment_stages', { ...body, is_installment_allowed: body.is_installment_allowed ? 1 : 0 })
  return c.json(row, 201)
})

payment.put('/stages/:id', getCurrentUser, requireFinanceCrud, zValidator('json', stageSchema), async (c) => {
  const row = await updateRecord('payment_stages', pid(c), { ...c.req.valid('json'), is_installment_allowed: c.req.valid('json').is_installment_allowed ? 1 : 0 })
  if (!row) throw new HTTPException(404, { message: 'Not found' })
  return c.json(row)
})

payment.delete('/stages/:id', getCurrentUser, requireFinanceCrud, async (c) => {
  await deleteRecord('payment_stages', pid(c))
  return c.json({ success: true })
})

// ════════════ Invoices ════════════
payment.post('/invoices/generate', getCurrentUser, requireFinanceCrud, zValidator('json', z.object({ applicant_id: z.string().min(1) })), async (c) => {
  const { applicant_id } = c.req.valid('json')
  const applicant = await getById('applicants', applicant_id)
  if (!applicant) throw new HTTPException(404, { message: 'Applicant not found' })

  const waveConfigId = applicant.wave_config_id as string
  const stages = await listAll('payment_stages', { order: 'stage_number.asc', limit: 20 })
  const relevantStages = stages.filter((s: any) => s.wave_config_id === waveConfigId)
  const existingInvoices = await listAll('invoices', { limit: 100 })

  let count = 0
  for (const stage of relevantStages) {
    const exists = existingInvoices.some((inv: any) => inv.applicant_id === applicant_id && inv.payment_stage_id === stage.id)
    if (exists) continue
    const invNumber = `INV-${(applicant.registration_number as string || '').replace('PPDB-', '')}-${String(stage.stage_number).padStart(2, '0')}`
    await createRecord('invoices', {
      applicant_id, payment_stage_id: stage.id, invoice_number: invNumber,
      amount: stage.amount, discount_amount: 0, total_amount: stage.amount,
      status: 'unpaid', due_date: stage.due_date || null,
    })
    count++
  }
  return c.json({ generated: count })
})

payment.get('/invoices/mine', getCurrentUser, async (c) => {
  const applicant = await getByColumn('applicants', 'user_id', c.get('user').id as string)
  if (!applicant) throw new HTTPException(404, { message: 'No PPDB application found' })
  const invoices = await listAll('invoices', { order: 'created_at.asc', limit: 50 })
  const mine = invoices.filter((i: any) => i.applicant_id === applicant.id)
  const enriched = await Promise.all(mine.map(async (inv: any) => {
    const stage = await getById('payment_stages', inv.payment_stage_id)
    const txns = await listAll('payment_transactions', { order: 'created_at.desc', limit: 50 })
    return { ...inv, stage, transactions: txns.filter((t: any) => t.invoice_id === inv.id) }
  }))
  return c.json(enriched)
})

payment.get('/invoices', getCurrentUser, requireFinanceCrud, async (c) => {
  const page = parseInt(c.req.query('page') || '1')
  const result = await searchPaginated('invoices', { page, perPage: 20, order: 'created_at.desc' })
  return c.json(result)
})

// ════════════ Transactions ════════════
payment.post('/transactions', getCurrentUser, async (c) => {
  const applicant = await getByColumn('applicants', 'user_id', c.get('user').id as string)
  if (!applicant) throw new HTTPException(404, { message: 'No PPDB application found' })

  const fd = await c.req.formData()
  const file = fd.get('file') as File | null
  const invoiceId = fd.get('invoice_id') as string | null
  const amount = parseFloat(fd.get('amount') as string || '0')
  const method = fd.get('payment_method') as string || 'transfer'

  if (!file || !invoiceId || !amount) throw new HTTPException(400, { message: 'file, invoice_id, amount required' })

  const allowedPaymentTypes = new Set(['image/jpeg', 'image/png', 'image/webp', 'image/gif', 'application/pdf'])
  if (!allowedPaymentTypes.has(file.type)) {
    throw new HTTPException(400, { message: 'File type not allowed. Accepted: JPEG, PNG, WebP, GIF, PDF' })
  }
  const maxPaymentSize = 5 * 1024 * 1024
  if (file.size > maxPaymentSize) {
    throw new HTTPException(400, { message: 'File too large. Max 5MB' })
  }

  const invoice = await getById('invoices', invoiceId)
  if (!invoice || invoice.applicant_id !== applicant.id) throw new HTTPException(404, { message: 'Invoice not found' })
  if ((invoice as any).status === 'paid') throw new HTTPException(400, { message: 'Invoice is already fully paid' })

  const ext = file.name.split('.').pop()?.toLowerCase() || 'bin'
  const storedName = `${Date.now()}_${Math.random().toString(36).slice(2)}.${ext}`
  const buffer = Buffer.from(await file.arrayBuffer())
  const fs = await import('node:fs/promises')
  const path = await import('node:path')
  const dir = path.join(process.cwd(), 'uploads', 'payments')
  await fs.mkdir(dir, { recursive: true })
  await fs.writeFile(path.join(dir, storedName), buffer)

  const txn = await createRecord('payment_transactions', {
    invoice_id: invoiceId,
    transaction_number: `TRX-${Date.now()}-${Math.random().toString(36).slice(2, 6).toUpperCase()}`,
    amount, payment_method: method,
    payment_proof_url: `/uploads/payments/${storedName}`,
    status: 'pending',
  })
  return c.json(txn, 201)
})

payment.get('/transactions', getCurrentUser, requireFinanceCrud, async (c) => {
  const status = c.req.query('status') || ''
  const page = parseInt(c.req.query('page') || '1')
  const filters: Record<string, unknown> = {}
  if (status) filters.status = status
  const result = await searchPaginated('payment_transactions', { page, perPage: 20, filters, order: 'created_at.desc' })
  return c.json(result)
})

payment.put('/transactions/:id/verify', getCurrentUser, requireFinanceCrud, zValidator('json', z.object({
  status: z.enum(['verified', 'rejected']),
  notes: z.string().nullable().optional(),
})), async (c) => {
  const body = c.req.valid('json')
  const user = c.get('user')
  const txn = await updateRecord('payment_transactions', pid(c), {
    status: body.status, verified_by: user.id, verified_at: new Date().toISOString(), notes: body.notes || null,
  })
  if (!txn) throw new HTTPException(404, { message: 'Not found' })

  if (body.status === 'verified') {
    const invoice = await getById('invoices', txn.invoice_id as string)
    if (invoice) {
      await updateRecord('invoices', invoice.id as string, {
        status: 'paid', paid_at: new Date().toISOString(),
      })
    }
  }
  return c.json(txn)
})

// ════════════ Discounts ════════════
const discountSchema = z.object({
  code: z.string().min(1), name: z.string().min(1),
  discount_type: z.enum(['percentage', 'fixed']),
  value: z.number().min(0),
  max_usage: z.number().int().nullable().optional(),
  valid_from: z.string().nullable().optional(),
  valid_until: z.string().nullable().optional(),
  is_active: z.boolean().optional(),
})

payment.get('/discounts', getCurrentUser, requireFinanceCrud, async (c) => {
  return c.json(await listAll('discounts', { order: 'created_at.desc', limit: 100 }))
})

payment.post('/discounts', getCurrentUser, requireFinanceCrud, zValidator('json', discountSchema), async (c) => {
  return c.json(await createRecord('discounts', c.req.valid('json')), 201)
})

payment.put('/discounts/:id', getCurrentUser, requireFinanceCrud, zValidator('json', discountSchema), async (c) => {
  const row = await updateRecord('discounts', pid(c), c.req.valid('json'))
  if (!row) throw new HTTPException(404, { message: 'Not found' })
  return c.json(row)
})

payment.delete('/discounts/:id', getCurrentUser, requireFinanceCrud, async (c) => {
  await deleteRecord('discounts', pid(c))
  return c.json({ success: true })
})

payment.post('/discounts/assign', getCurrentUser, requireFinanceCrud, zValidator('json', z.object({
  applicant_id: z.string().min(1),
  discount_id: z.string().min(1),
  invoice_id: z.string().nullable().optional(),
})), async (c) => {
  const body = c.req.valid('json')
  const user = c.get('user')
  const discount = await getById('discounts', body.discount_id)
  if (!discount) throw new HTTPException(404, { message: 'Discount not found' })

  let appliedAmount = 0
  if (discount.discount_type === 'percentage' && body.invoice_id) {
    const inv = await getById('invoices', body.invoice_id)
    appliedAmount = inv ? (inv.total_amount as number) * (discount.value as number) / 100 : 0
  } else {
    appliedAmount = discount.value as number
  }

  return c.json(await createRecord('applicant_discounts', {
    applicant_id: body.applicant_id, discount_id: body.discount_id,
    invoice_id: body.invoice_id || null, applied_amount: appliedAmount, applied_by: user.id,
  }), 201)
})

// ════════════ Installments ════════════
payment.get('/installments/:invoiceId', getCurrentUser, requireFinanceCrud, async (c) => {
  const plans = await listAll('installment_plans', { limit: 10 })
  const plan = plans.find((p: any) => p.invoice_id === c.req.param('invoiceId'))
  if (!plan) return c.json(null)
  const schedules = await listAll('installment_schedules', { order: 'installment_number.asc', limit: 50 })
  return c.json({ ...plan, schedules: schedules.filter((s: any) => s.plan_id === plan.id) })
})

payment.post('/installments/:invoiceId', getCurrentUser, requireFinanceCrud, zValidator('json', z.object({
  total_installments: z.number().int().min(2),
})), async (c) => {
  const body = c.req.valid('json')
  const user = c.get('user')
  const invoice = await getById('invoices', c.req.param('invoiceId'))
  if (!invoice) throw new HTTPException(404, { message: 'Invoice not found' })

  const plan = await createRecord('installment_plans', {
    invoice_id: invoice.id, total_installments: body.total_installments,
    approved_by: user.id, approved_at: new Date().toISOString(),
  })

  const per = Math.ceil((invoice.total_amount as number) / body.total_installments)
  for (let i = 1; i <= body.total_installments; i++) {
    await createRecord('installment_schedules', {
      plan_id: plan.id, installment_number: i, amount: per,
      due_date: new Date(Date.now() + i * 30 * 86400000).toISOString().split('T')[0],
    })
  }
  return c.json(plan, 201)
})

export default payment
