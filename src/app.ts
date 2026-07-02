import { Hono } from 'hono'
import { cors } from 'hono/cors'
import { HTTPException } from 'hono/http-exception'

import { apiReference } from '@scalar/hono-api-reference'
import { openapiSpec } from './openapi'

import authRoutes from './auth/routes'
import companyprofileRoutes from './companyprofile/routes'
import usersRoutes from './users/routes'
import rolesRoutes from './roles/routes'
import superadminRoutes from './superadmin/routes'
import sppRoutes from './spp/routes'
import studentsRoutes from './students/routes'
import teachersRoutes from './teachers/routes'
import visitsRoutes from './visits/routes'
import canteensRoutes from './canteens/routes'
import courtsRoutes from './courts/routes'
import inventoriesRoutes from './inventories/routes'

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
app.route('/teachers', teachersRoutes)
app.route('/visits', visitsRoutes)
app.route('/canteens', canteensRoutes)
app.route('/courts', courtsRoutes)
app.route('/inventories', inventoriesRoutes)

// OpenAPI JSON
app.get('/openapi.json', (c) => c.json(openapiSpec))

// Scalar API docs
app.get('/scalar', apiReference({
  spec: { content: openapiSpec },
  pageTitle: "Pesantren Tahfidz Qur'an dan Digital Arrahman API",
}))

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
