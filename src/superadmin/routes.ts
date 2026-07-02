import { Hono } from 'hono'
import { getCurrentUser, requireSuperadmin } from '../middleware/auth'
import { searchPaginated } from '../db/supabase'
import type { Variables } from '../types'

const superadmin = new Hono<{ Variables: Variables }>()

superadmin.get('/dashboard', getCurrentUser, requireSuperadmin, async (c) => {
  const { total: totalUsers } = await searchPaginated('users', { perPage: 1 })
  const { total: totalRoles } = await searchPaginated('roles', { perPage: 1 })
  return c.json({ total_users: totalUsers, total_roles: totalRoles })
})

export default superadmin
