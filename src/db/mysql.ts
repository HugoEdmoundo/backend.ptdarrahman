import mysql, { Pool, RowDataPacket, ResultSetHeader } from 'mysql2/promise'
import { config } from '../config'

let _pool: Pool | null = null

function getPool(): Pool {
  if (!_pool) {
    if (!config.mysqlHost || !config.mysqlUser || !config.mysqlPassword || !config.mysqlDatabase) {
      throw new Error('MySQL credentials are not configured')
    }
    _pool = mysql.createPool({
      host: config.mysqlHost,
      port: config.mysqlPort,
      user: config.mysqlUser,
      password: config.mysqlPassword,
      database: config.mysqlDatabase,
      waitForConnections: true,
      connectionLimit: 1,
      queueLimit: 0,
      enableKeepAlive: true,
      keepAliveInitialDelay: 0,
      ssl: process.env.MYSQL_SSL === 'true' ? { rejectUnauthorized: process.env.MYSQL_SSL_REJECT_UNAUTHORIZED !== 'false' } as any : undefined,
    })
  }
  return _pool
}

function utcnow(): string {
  return new Date().toISOString().slice(0, 19).replace('T', ' ')
}

const PK_TABLES = new Set(['site_settings'])

type Row = Record<string, unknown>

function pkCol(table: string): string {
  return PK_TABLES.has(table) ? '`key`' : 'id'
}

function mapRow(row: RowDataPacket): Row {
  return { ...row } as unknown as Row
}

export async function listAll(
  table: string,
  opts?: { order?: string; limit?: number; skip?: number }
): Promise<Row[]> {
  const { order, limit = 100, skip = 0 } = opts || {}
  let sql = `SELECT * FROM \`${table}\``
  if (order) {
    const parts = order.split('.')
    const col = parts[0]
    const dir = parts.length > 1 && parts[1] === 'desc' ? 'DESC' : 'ASC'
    sql += ` ORDER BY \`${col}\` ${dir}`
  }
  sql += ` LIMIT ? OFFSET ?`
  const [rows] = await getPool().execute<RowDataPacket[]>(sql, [limit, skip] as any)
  return rows.map(mapRow)
}

export async function getById(table: string, id: string): Promise<Row | null> {
  if (!id) return null
  const col = pkCol(table)
  const sql = `SELECT * FROM \`${table}\` WHERE ${col} = ? LIMIT 1`
  const [rows] = await getPool().execute<RowDataPacket[]>(sql, [id])
  return rows.length ? mapRow(rows[0]) : null
}

export async function getByColumn(table: string, column: string, value: unknown): Promise<Row | null> {
  const sql = `SELECT * FROM \`${table}\` WHERE \`${column}\` = ? LIMIT 1`
  const [rows] = await getPool().execute<RowDataPacket[]>(sql, [value] as any)
  return rows.length ? mapRow(rows[0]) : null
}

export async function getBySlug(table: string, slug: string): Promise<Row | null> {
  const sql = `SELECT * FROM \`${table}\` WHERE slug = ? LIMIT 1`
  const [rows] = await getPool().execute<RowDataPacket[]>(sql, [slug])
  return rows.length ? mapRow(rows[0]) : null
}

export async function getFirst(table: string): Promise<Row | null> {
  const sql = `SELECT * FROM \`${table}\` LIMIT 1`
  const [rows] = await getPool().execute<RowDataPacket[]>(sql)
  return rows.length ? mapRow(rows[0]) : null
}

export async function createRecord(table: string, data: Row): Promise<Row> {
  const payload: Row = { ...data }
  if (!PK_TABLES.has(table) && !('id' in payload)) {
    payload.id = crypto.randomUUID()
  }
  if (!('created_at' in payload)) payload.created_at = utcnow()
  if (!('updated_at' in payload)) payload.updated_at = utcnow()

  const keys = Object.keys(payload)
  const values = Object.values(payload)
  const placeholders = keys.map(() => '?').join(', ')
  const cols = keys.map(k => `\`${k}\``).join(', ')

  const sql = `INSERT INTO \`${table}\` (${cols}) VALUES (${placeholders})`
  await getPool().execute<ResultSetHeader>(sql, values as any)

  if (PK_TABLES.has(table)) {
    return payload as Row
  }
  return (await getById(table, payload.id as string))!
}

export async function updateRecord(table: string, id: string, data: Row): Promise<Row | null> {
  if (!id) return null
  const payload = { ...data, updated_at: utcnow() }
  const keys = Object.keys(payload)
  const values = Object.values(payload)
  const setClause = keys.map(k => `\`${k}\` = ?`).join(', ')

  const col = pkCol(table)
  const sql = `UPDATE \`${table}\` SET ${setClause} WHERE ${col} = ?`
  await getPool().execute<ResultSetHeader>(sql, [...values, id] as any)
  return getById(table, id)
}

export async function deleteRecord(table: string, id: string): Promise<boolean> {
  if (!id) return false
  const col = pkCol(table)
  const sql = `DELETE FROM \`${table}\` WHERE ${col} = ?`
  const [result] = await getPool().execute<ResultSetHeader>(sql, [id])
  return result.affectedRows > 0
}

export async function searchPaginated(
  table: string,
  opts: {
    search?: string
    columns?: string[]
    page?: number
    perPage?: number
    order?: string
    filters?: Record<string, unknown>
  } = {}
): Promise<{ data: Row[]; total: number }> {
  const { search = '', columns, page = 1, perPage = 20, order, filters } = opts
  const offset = (page - 1) * perPage

  let whereClause = ''
  const params: unknown[] = []

  if (search && columns && columns.length > 0) {
    const orClauses = columns.map(col => `\`${col}\` LIKE ?`)
    whereClause = `WHERE (${orClauses.join(' OR ')})`
    const searchPattern = `%${search.replace(/%/g, '\\%').replace(/_/g, '\\_')}%`
    columns.forEach(() => params.push(searchPattern))
  }

  if (filters) {
    const filterClauses: string[] = []
    for (const [col, val] of Object.entries(filters)) {
      if (val != null) {
        filterClauses.push(`\`${col}\` = ?`)
        params.push(val)
      }
    }
    if (filterClauses.length > 0) {
      whereClause = whereClause
        ? `${whereClause} AND ${filterClauses.join(' AND ')}`
        : `WHERE ${filterClauses.join(' AND ')}`
    }
  }

  let countSql = `SELECT COUNT(*) as total FROM \`${table}\` ${whereClause}`
  const [countRows] = await getPool().execute<RowDataPacket[]>(countSql, params as any)
  const total = Number(countRows[0].total)

  let dataSql = `SELECT * FROM \`${table}\` ${whereClause}`
  if (order) {
    const parts = order.split('.')
    const col = parts[0]
    const dir = parts.length > 1 && parts[1] === 'desc' ? 'DESC' : 'ASC'
    dataSql += ` ORDER BY \`${col}\` ${dir}`
  }
  dataSql += ` LIMIT ? OFFSET ?`
  const [rows] = await getPool().execute<RowDataPacket[]>(dataSql, [...params, perPage, offset] as any)

  return { data: rows.map(mapRow), total }
}

export async function auditLog(params: {
  userId?: string
  userUsername?: string
  action: string
  entityType: string
  entityId?: string
  changes?: Record<string, unknown> | null
  ipAddress?: string | null
}) {
  try {
    await createRecord('audit_log', {
      user_id: params.userId,
      user_username: params.userUsername,
      action: params.action,
      entity_type: params.entityType,
      entity_id: params.entityId,
      changes: params.changes ? JSON.stringify(params.changes) : null,
      ip_address: params.ipAddress,
    })
  } catch (e) {
    console.error('audit_log failed', e)
  }
}

export function getRawPool(): Pool {
  return getPool()
}
