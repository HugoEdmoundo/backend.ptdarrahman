import { createClient, SupabaseClient } from '@supabase/supabase-js'
import { config } from '../config'

let _client: SupabaseClient | null = null

function get(): SupabaseClient {
  if (!_client) {
    if (!config.supabaseUrl || !config.supabaseServiceKey) {
      throw new Error('Supabase URL and service key must be configured')
    }
    _client = createClient(config.supabaseUrl, config.supabaseServiceKey)
  }
  return _client
}

function utcnow() {
  return new Date().toISOString()
}

const PK_TABLES = new Set(['site_settings'])

type Row = Record<string, unknown>

export async function listAll(
  table: string,
  opts?: { order?: string; limit?: number; skip?: number }
): Promise<Row[]> {
  const { order, limit = 100, skip = 0 } = opts || {}
  let q = get().from(table).select('*').range(skip, skip + limit - 1)
  if (order) {
    const parts = order.split('.')
    const col = parts[0]
    const desc = parts.length > 1 && parts[1] === 'desc'
    q = q.order(col, { ascending: !desc })
  }
  const { data } = await q
  return (data || []) as Row[]
}

export async function getById(table: string, id: string): Promise<Row | null> {
  if (!id) return null
  const col = PK_TABLES.has(table) ? 'key' : 'id'
  const { data } = await get().from(table).select('*').eq(col, id).limit(1).single()
  return data as Row | null
}

export async function getByColumn(table: string, column: string, value: unknown): Promise<Row | null> {
  const { data } = await get().from(table).select('*').eq(column, value as any).limit(1).single()
  return data as Row | null
}

export async function getBySlug(table: string, slug: string): Promise<Row | null> {
  const { data } = await get().from(table).select('*').eq('slug', slug).limit(1).single()
  return data as Row | null
}

export async function getFirst(table: string): Promise<Row | null> {
  const { data } = await get().from(table).select('*').limit(1).single()
  return data as Row | null
}

export async function createRecord(table: string, data: Row): Promise<Row> {
  const payload: Row = { ...data }
  if (!PK_TABLES.has(table) && !('id' in payload)) {
    payload.id = crypto.randomUUID()
  }
  if (!('created_at' in payload)) payload.created_at = utcnow()
  if (!('updated_at' in payload)) payload.updated_at = utcnow()
  const { data: result, error } = await get().from(table).insert(payload as any).select().single()
  if (error) throw error
  return result as Row
}

export async function updateRecord(table: string, id: string, data: Row): Promise<Row | null> {
  if (!id) return null
  const payload = { ...data, updated_at: utcnow() }
  const col = PK_TABLES.has(table) ? 'key' : 'id'
  const { data: result, error } = await get().from(table).update(payload as any).eq(col, id).select().single()
  if (error) throw error
  return result as Row | null
}

export async function deleteRecord(table: string, id: string): Promise<boolean> {
  if (!id) return false
  const col = PK_TABLES.has(table) ? 'key' : 'id'
  const { error } = await get().from(table).delete().eq(col, id)
  if (error) throw error
  return true
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
  let q = get().from(table).select('*', { count: 'exact' })
  if (search && columns) {
    const orFilters = columns.map(c => `${c}.ilike.%${search}%`).join(',')
    q = q.or(orFilters)
  }
  if (filters) {
    for (const [col, val] of Object.entries(filters)) {
      if (val != null) q = q.eq(col, val as any)
    }
  }
  if (order) {
    const parts = order.split('.')
    const col = parts[0]
    const desc = parts.length > 1 && parts[1] === 'desc'
    q = q.order(col, { ascending: !desc })
  }
  const { data, count } = await q.range(offset, offset + perPage - 1)
  return { data: (data || []) as Row[], total: count || data?.length || 0 }
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
    await get().from('audit_log').insert({
      user_id: params.userId,
      user_username: params.userUsername,
      action: params.action,
      entity_type: params.entityType,
      entity_id: params.entityId,
      changes: params.changes,
      ip_address: params.ipAddress,
    } as any)
  } catch (e) {
    console.error('audit_log failed', e)
  }
}

export function getRawClient(): SupabaseClient {
  return get()
}
