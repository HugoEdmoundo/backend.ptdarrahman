import { Hono } from 'hono'
import { HTTPException } from 'hono/http-exception'
import { getCurrentUser, requireSuperadmin } from '../middleware/auth'
import { getRawPool } from '../db/mysql'
import type { Variables } from '../types'
import type { RowDataPacket } from 'mysql2/promise'

const modules = new Hono<{ Variables: Variables }>()

modules.get('/', getCurrentUser, async (c) => {
  const pool = getRawPool()
  const [modRows] = await pool.execute<RowDataPacket[]>(
    'SELECT id, `key`, name FROM modules ORDER BY name'
  )
  const [pageRows] = await pool.execute<RowDataPacket[]>(
    'SELECT id, module_id, `key`, label, icon, sort_order FROM pages ORDER BY module_id, sort_order'
  )

  const pageMap = new Map<string, any[]>()
  for (const p of pageRows) {
    const mid = p.module_id as string
    if (!pageMap.has(mid)) pageMap.set(mid, [])
    pageMap.get(mid)!.push({
      id: p.id,
      key: p.key,
      label: p.label,
      icon: p.icon,
      sort_order: p.sort_order,
    })
  }

  const result = modRows.map(m => ({
    id: m.id,
    key: m.key,
    name: m.name,
    pages: pageMap.get(m.id as string) || [],
  }))

  return c.json(result)
})

export default modules
