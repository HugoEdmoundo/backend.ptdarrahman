import { Hono } from 'hono'
import { getRawPool } from '../db/mysql'
import { requireModuleAccess } from '../ppdb/middleware'
import { Module, AccessLevel } from '../auth/permissions'

const dashboardRoutes = new Hono<{ Variables: { user: any } }>()

const knownTables = new Set<string>()

async function tableExists(name: string): Promise<boolean> {
  if (knownTables.has(name)) return true
  const pool = getRawPool()
  const [rows] = await pool.execute<any[]>(
    'SELECT TABLE_NAME FROM information_schema.TABLES WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = ?',
    [name]
  )
  if (rows.length > 0) {
    knownTables.add(name)
    return true
  }
  return false
}

// GET /dashboard/stats
dashboardRoutes.get('/stats', requireModuleAccess(Module.DASHBOARD, AccessLevel.READ), async (c) => {
  const pool = getRawPool()

  const [periodRows] = await pool.execute<any[]>('SELECT COUNT(*) n FROM ppdb_periods')
  const [waveRows] = await pool.execute<any[]>('SELECT COUNT(*) n FROM ppdb_waves')
  const [activeRows] = await pool.execute<any[]>(
    'SELECT name FROM ppdb_periods WHERE status = "active" LIMIT 1'
  )

  let totalApplicants = 0
  let registered = 0
  let testing = 0
  let accepted = 0
  if (await tableExists('applicants')) {
    const [statusRows] = await pool.execute<any[]>(
      'SELECT status, COUNT(*) n FROM applicants GROUP BY status'
    )
    for (const row of statusRows) {
      totalApplicants += Number(row.n)
      if (row.status === 'registered') registered = Number(row.n)
      if (row.status === 'testing') testing = Number(row.n)
      if (row.status === 'accepted') accepted = Number(row.n)
    }
  }

  let pendingPayments = 0
  if (await tableExists('payment_invoices')) {
    const [rows] = await pool.execute<any[]>(
      'SELECT COUNT(*) n FROM payment_invoices WHERE status = "pending"'
    )
    pendingPayments = Number(rows[0].n)
  }

  let pendingDocuments = 0
  if (await tableExists('applicant_documents')) {
    const [rows] = await pool.execute<any[]>(
      'SELECT COUNT(*) n FROM applicant_documents WHERE status = "pending"'
    )
    pendingDocuments = Number(rows[0].n)
  }

  return c.json({
    total_applicants: totalApplicants,
    registered,
    testing,
    accepted,
    pending_payments: pendingPayments,
    pending_documents: pendingDocuments,
    total_periods: Number(periodRows[0].n),
    total_waves: Number(waveRows[0].n),
    active_period_name: activeRows.length > 0 ? activeRows[0].name : null,
  })
})

// GET /dashboard/audit-logs?page=&perPage=
dashboardRoutes.get('/audit-logs', requireModuleAccess(Module.DASHBOARD, AccessLevel.READ), async (c) => {
  const page = parseInt(c.req.query('page') || '1')
  const perPage = parseInt(c.req.query('perPage') || '20')
  const offset = (page - 1) * perPage

  const pool = getRawPool()
  const [rows] = await pool.execute<any[]>(
    'SELECT id, user_id, user_username, action, entity_type, entity_id, ip_address, created_at FROM audit_log ORDER BY created_at DESC LIMIT ? OFFSET ?',
    [perPage, offset]
  )
  const [countRows] = await pool.execute<any[]>('SELECT COUNT(*) n FROM audit_log')

  return c.json({ data: rows, total: Number(countRows[0].n), page, perPage })
})

export default dashboardRoutes
