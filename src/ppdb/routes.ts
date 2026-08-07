import { Hono } from 'hono'
import { randomUUID } from 'node:crypto'
import { getRawPool, createRecord, updateRecord, deleteRecord, auditLog } from '../db/mysql'
import { requirePPDBRead, requirePPDBAdmin } from './middleware'

const ppdbRoutes = new Hono<{ Variables: { user: any } }>()

// GET /ppdb/periods
ppdbRoutes.get('/periods', requirePPDBRead, async (c) => {
  const page = parseInt(c.req.query('page') || '1')
  const perPage = parseInt(c.req.query('perPage') || '20')
  const search = c.req.query('search') || ''
  
  const pool = getRawPool()
  const offset = (page - 1) * perPage
  let sql = 'SELECT p.*, (SELECT COUNT(*) FROM ppdb_waves w WHERE w.period_id = p.id) as wave_count FROM ppdb_periods p'
  let countSql = 'SELECT COUNT(*) as cnt FROM ppdb_periods p'
  let params: any[] = []
  if (search) {
    sql += ' WHERE p.name LIKE ?'
    countSql += ' WHERE p.name LIKE ?'
    params.push(`%${search}%`)
  }
  sql += ' ORDER BY p.start_date DESC LIMIT ? OFFSET ?'
  
  const [rows] = await pool.execute(sql, [...params, perPage, offset])
  const [countRows] = await pool.execute<any[]>(countSql, params)
  
  return c.json({ data: rows, total: countRows[0].cnt })
})

// GET /ppdb/periods/all
ppdbRoutes.get('/periods/all', requirePPDBRead, async (c) => {
  const pool = getRawPool()
  const [rows] = await pool.execute('SELECT id, name, status, start_date, end_date FROM ppdb_periods ORDER BY start_date DESC')
  return c.json(rows)
})

// GET /ppdb/periods/:id
ppdbRoutes.get('/periods/:id', requirePPDBRead, async (c) => {
  const id = c.req.param('id')
  const pool = getRawPool()
  const [rows] = await pool.execute<any[]>('SELECT * FROM ppdb_periods WHERE id = ? LIMIT 1', [id!])
  if (rows.length === 0) return c.json({ detail: 'Not found' }, 404)
  const period = rows[0]
  const [waves] = await pool.execute('SELECT * FROM ppdb_waves WHERE period_id = ? ORDER BY wave_number ASC', [id!])
  period.waves = waves
  return c.json(period)
})

// POST /ppdb/periods
ppdbRoutes.post('/periods', requirePPDBAdmin, async (c) => {
  const body = await c.req.json()
  if (!body.name || !body.start_date || !body.end_date) {
    return c.json({ detail: 'Missing required fields' }, 400)
  }
  const data = {
    id: `period-${randomUUID()}`,
    name: body.name,
    start_date: body.start_date,
    end_date: body.end_date,
    status: 'inactive'
  }
  const created = await createRecord('ppdb_periods', data)
  return c.json(created, 201)
})

// PUT /ppdb/periods/:id
ppdbRoutes.put('/periods/:id', requirePPDBAdmin, async (c) => {
  const id = c.req.param('id')
  const body = await c.req.json()
  const data = {
    name: body.name,
    start_date: body.start_date,
    end_date: body.end_date
  }
  const updated = await updateRecord('ppdb_periods', id!, data)
  return c.json(updated)
})

// PUT /ppdb/periods/:id/activate
ppdbRoutes.put('/periods/:id/activate', requirePPDBAdmin, async (c) => {
  const id = c.req.param('id')
  const pool = getRawPool()
  const conn = await pool.getConnection()
  try {
    await conn.beginTransaction()
    await conn.execute('UPDATE ppdb_periods SET status = "inactive"')
    await conn.execute('UPDATE ppdb_waves SET status = "inactive"')
    await conn.execute('UPDATE ppdb_periods SET status = "active" WHERE id = ?', [id!])
    await conn.commit()
    
    const user = c.get('user') as any
    await auditLog({
      userId: user.id, userUsername: user.username,
      action: 'activate', entityType: 'ppdb_periods', entityId: id,
    })
    return c.json({ success: true })
  } catch (e) {
    await conn.rollback()
    return c.json({ detail: 'Transaction failed' }, 500)
  } finally {
    conn.release()
  }
})

// PUT /ppdb/periods/:id/deactivate
ppdbRoutes.put('/periods/:id/deactivate', requirePPDBAdmin, async (c) => {
  const id = c.req.param('id')
  const pool = getRawPool()
  const conn = await pool.getConnection()
  try {
    await conn.beginTransaction()
    await conn.execute('UPDATE ppdb_periods SET status = "inactive" WHERE id = ?', [id!])
    await conn.execute('UPDATE ppdb_waves SET status = "inactive" WHERE period_id = ?', [id!])
    await conn.commit()
    
    const user = c.get('user') as any
    await auditLog({
      userId: user.id, userUsername: user.username,
      action: 'deactivate', entityType: 'ppdb_periods', entityId: id,
    })
    return c.json({ success: true })
  } catch (e) {
    await conn.rollback()
    return c.json({ detail: 'Transaction failed' }, 500)
  } finally {
    conn.release()
  }
})

// DELETE /ppdb/periods/:id
ppdbRoutes.delete('/periods/:id', requirePPDBAdmin, async (c) => {
  const id = c.req.param('id')
  await deleteRecord('ppdb_periods', id!)
  return c.json({ success: true })
})

// GET /ppdb/waves?period_id=
ppdbRoutes.get('/waves', requirePPDBRead, async (c) => {
  const period_id = c.req.query('period_id')
  const pool = getRawPool()
  let sql = 'SELECT * FROM ppdb_waves'
  let params: any[] = []
  if (period_id) {
    sql += ' WHERE period_id = ?'
    params.push(period_id)
  }
  sql += ' ORDER BY start_date ASC'
  const [rows] = await pool.execute(sql, params)
  return c.json(rows)
})

// GET /ppdb/waves/all
ppdbRoutes.get('/waves/all', requirePPDBRead, async (c) => {
  const pool = getRawPool()
  const [rows] = await pool.execute('SELECT * FROM ppdb_waves ORDER BY start_date ASC')
  return c.json(rows)
})

// GET /ppdb/waves/:id
ppdbRoutes.get('/waves/:id', requirePPDBRead, async (c) => {
  const id = c.req.param('id')
  const pool = getRawPool()
  const [rows] = await pool.execute<any[]>('SELECT * FROM ppdb_waves WHERE id = ? LIMIT 1', [id!])
  if (rows.length === 0) return c.json({ detail: 'Not found' }, 404)
  return c.json(rows[0])
})

// POST /ppdb/waves
ppdbRoutes.post('/waves', requirePPDBAdmin, async (c) => {
  const body = await c.req.json()
  if (!body.period_id || !body.name || !body.start_date || !body.end_date) {
    return c.json({ detail: 'Missing required fields' }, 400)
  }
  const pool = getRawPool()
  const [periodRows] = await pool.execute<any[]>('SELECT id FROM ppdb_periods WHERE id = ?', [body.period_id])
  if (periodRows.length === 0) return c.json({ detail: 'Period not found' }, 404)
  
  const [maxRows] = await pool.execute<any[]>('SELECT MAX(wave_number) as max_num FROM ppdb_waves WHERE period_id = ?', [body.period_id])
  const waveNumber = (maxRows[0].max_num || 0) + 1
  
  const data = {
    id: `wave-${randomUUID()}`,
    period_id: body.period_id,
    wave_number: waveNumber,
    name: body.name,
    start_date: body.start_date,
    end_date: body.end_date,
    status: 'inactive'
  }
  const created = await createRecord('ppdb_waves', data)
  return c.json(created, 201)
})

// PUT /ppdb/waves/:id
ppdbRoutes.put('/waves/:id', requirePPDBAdmin, async (c) => {
  const id = c.req.param('id')
  const body = await c.req.json()
  const data = {
    name: body.name,
    start_date: body.start_date,
    end_date: body.end_date
  }
  const updated = await updateRecord('ppdb_waves', id!, data)
  return c.json(updated)
})

// PUT /ppdb/waves/:id/activate
ppdbRoutes.put('/waves/:id/activate', requirePPDBAdmin, async (c) => {
  const id = c.req.param('id')
  const pool = getRawPool()
  
  const [waveRows] = await pool.execute<any[]>('SELECT period_id FROM ppdb_waves WHERE id = ?', [id!])
  if (waveRows.length === 0) return c.json({ detail: 'Wave not found' }, 404)
  const periodId = waveRows[0].period_id
  
  const [periodRows] = await pool.execute<any[]>('SELECT status FROM ppdb_periods WHERE id = ?', [periodId])
  if (periodRows[0].status !== 'active') {
    return c.json({ detail: 'Periode belum aktif' }, 400)
  }
  
  const conn = await pool.getConnection()
  try {
    await conn.beginTransaction()
    await conn.execute('UPDATE ppdb_waves SET status = "inactive"')
    await conn.execute('UPDATE ppdb_waves SET status = "active" WHERE id = ?', [id!])
    await conn.commit()
    
    const user = c.get('user') as any
    await auditLog({
      userId: user.id, userUsername: user.username,
      action: 'activate', entityType: 'ppdb_waves', entityId: id,
    })
    return c.json({ success: true })
  } catch (e) {
    await conn.rollback()
    return c.json({ detail: 'Transaction failed' }, 500)
  } finally {
    conn.release()
  }
})

// PUT /ppdb/waves/:id/deactivate
ppdbRoutes.put('/waves/:id/deactivate', requirePPDBAdmin, async (c) => {
  const id = c.req.param('id')
  const pool = getRawPool()
  await pool.execute('UPDATE ppdb_waves SET status = "inactive" WHERE id = ?', [id!])
  const user = c.get('user') as any
  await auditLog({
    userId: user.id, userUsername: user.username,
    action: 'deactivate', entityType: 'ppdb_waves', entityId: id,
  })
  return c.json({ success: true })
})

// DELETE /ppdb/waves/:id
ppdbRoutes.delete('/waves/:id', requirePPDBAdmin, async (c) => {
  const id = c.req.param('id')
  await deleteRecord('ppdb_waves', id!)
  return c.json({ success: true })
})

export default ppdbRoutes
