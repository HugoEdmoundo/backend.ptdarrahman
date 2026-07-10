import { Hono } from 'hono'
import { getCurrentUser } from '../middleware/auth'
import { requireDashboardCrud } from './middleware'
import { listAll, getById, getByColumn, searchPaginated, getRawPool } from '../db/mysql'
import type { Variables } from '../types'

const dashboard = new Hono<{ Variables: Variables }>()

dashboard.get('/stats', getCurrentUser, requireDashboardCrud, async (c) => {
  const pool = getRawPool()
  const [r1] = await pool.execute<any[]>('SELECT COUNT(*) as cnt FROM applicants')
  const [r2] = await pool.execute<any[]>('SELECT COUNT(*) as cnt FROM applicants WHERE current_status = ?', ['registered'])
  const [r3] = await pool.execute<any[]>('SELECT COUNT(*) as cnt FROM applicants WHERE current_status = ?', ['testing'])
  const [r4] = await pool.execute<any[]>('SELECT COUNT(*) as cnt FROM applicants WHERE current_status = ?', ['accepted'])
  const [r5] = await pool.execute<any[]>('SELECT COUNT(*) as cnt FROM payment_transactions WHERE status = ?', ['pending'])
  const [r6] = await pool.execute<any[]>('SELECT COUNT(*) as cnt FROM applicant_documents WHERE status = ?', ['uploaded'])
  const [r7] = await pool.execute<any[]>('SELECT COUNT(*) as cnt FROM ppdb_periods')
  const [r8] = await pool.execute<any[]>('SELECT COUNT(*) as cnt FROM ppdb_waves')

  return c.json({
    total_applicants: r1[0].cnt,
    registered: r2[0].cnt,
    testing: r3[0].cnt,
    accepted: r4[0].cnt,
    pending_payments: r5[0].cnt,
    pending_documents: r6[0].cnt,
    total_periods: r7[0].cnt,
    total_waves: r8[0].cnt,
  })
})

dashboard.get('/audit-logs', getCurrentUser, requireDashboardCrud, async (c) => {
  const page = parseInt(c.req.query('page') || '1')
  const result = await searchPaginated('audit_log', { page, perPage: 20, order: 'created_at.desc' })
  return c.json(result)
})

dashboard.get('/reports/summary', getCurrentUser, requireDashboardCrud, async (c) => {
  const pool = getRawPool()

  // Applicants per wave
  const [waveStats] = await pool.execute<any[]>(`
    SELECT w.name as wave_name, COUNT(a.id) as total
    FROM ppdb_waves w
    LEFT JOIN wave_configurations wc ON wc.wave_id = w.id
    LEFT JOIN applicants a ON a.wave_config_id = wc.id
    GROUP BY w.id, w.name
    ORDER BY w.wave_number
  `)

  // Applicants per level
  const [levelStats] = await pool.execute<any[]>(`
    SELECT el.name as level_name, COUNT(a.id) as total
    FROM education_levels el
    LEFT JOIN wave_configurations wc ON wc.level_id = el.id
    LEFT JOIN applicants a ON a.wave_config_id = wc.id
    GROUP BY el.id, el.name
    ORDER BY el.sort_order
  `)

  // Payment summary
  const [paymentStats] = await pool.execute<any[]>(`
    SELECT status, COUNT(*) as cnt, COALESCE(SUM(total_amount), 0) as total_amount
    FROM invoices GROUP BY status
  `)

  return c.json({ waveStats, levelStats, paymentStats })
})

export default dashboard
