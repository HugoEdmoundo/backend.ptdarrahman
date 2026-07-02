import { Hono } from 'hono'
import { cors } from 'hono/cors'
import { HTTPException } from 'hono/http-exception'

import authRoutes from './auth/routes'
import companyprofileRoutes from './companyprofile/routes'
import usersRoutes from './users/routes'
import rolesRoutes from './roles/routes'
import superadminRoutes from './superadmin/routes'
import sppRoutes from './spp/routes'
import studentsRoutes from './students/routes'

const app = new Hono()

app.use('*', cors({
  origin: '*',
  allowMethods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowHeaders: ['*'],
  exposeHeaders: ['*'],
}))

// Routes
app.route('/auth', authRoutes)
app.route('/companyprofile', companyprofileRoutes)
app.route('/users', usersRoutes)
app.route('/roles', rolesRoutes)
app.route('/superadmin', superadminRoutes)
app.route('/spp', sppRoutes)
app.route('/students', studentsRoutes)

// Health check
app.get('/', (c) => c.json({
  message: "Pesantren Tahfidz Qur'an dan Digital Arrahman API",
}))

// Error handler
app.onError((err, c) => {
  if (err instanceof HTTPException) {
    return c.json({ detail: err.message }, err.status)
  }
  console.error('Unhandled error:', err)
  return c.json({ detail: 'Internal Server Error' }, 500)
})

// 404 handler
app.notFound((c) => c.json({ detail: 'Not Found' }, 404))

export default app
