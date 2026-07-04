import { Hono } from 'hono'
import { cors } from 'hono/cors'
import { HTTPException } from 'hono/http-exception'
import { swaggerUI } from '@hono/swagger-ui'
import { Scalar } from '@scalar/hono-api-reference'

import companyprofileRoutes from './companyprofile/routes'
import { openapiSpec } from './openapi'

const app = new Hono()

// No CORS for now — allow all origins at the network level if needed

// Health check
app.get('/', (c) => c.json({
  message: "Pesantren Tahfidz Qur'an dan Digital Arrahman API",
  status: 'ok',
  docs: {
    swagger: '/ui',
    scalar: '/scalar',
    openapi: '/openapi.json',
  }
}))

// OpenAPI JSON
app.get('/openapi.json', (c) => c.json(openapiSpec))

// Swagger UI
app.get('/ui', swaggerUI({ url: '/openapi.json' }))

// Scalar API Reference
app.get('/scalar', Scalar({ url: '/openapi.json' }))

// Routes
app.route('/companyprofile', companyprofileRoutes)

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
