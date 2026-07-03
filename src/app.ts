import { Hono } from 'hono'
import { cors } from 'hono/cors'
import { HTTPException } from 'hono/http-exception'

import companyprofileRoutes from './companyprofile/routes'

const app = new Hono()

app.use('*', cors({
  origin: '*',
  allowMethods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowHeaders: ['*'],
  exposeHeaders: ['*'],
}))

// Health check
app.get('/', (c) => c.json({
  message: "Pesantren Tahfidz Qur'an dan Digital Arrahman API",
  status: 'ok'
}))

// OpenAPI JSON - lazy load to avoid Vercel crash
app.get('/openapi.json', async (c) => {
  try {
    const { openapiSpec } = await import('./openapi')
    return c.json(openapiSpec)
  } catch (e) {
    console.error('Failed to load OpenAPI spec:', e)
    return c.json({ error: 'Failed to load OpenAPI spec' }, 500)
  }
})

// Scalar API docs - lazy load to avoid Vercel crash
app.get('/scalar', async (c) => {
  try {
    const { apiReference } = await import('@scalar/hono-api-reference')
    const { openapiSpec } = await import('./openapi')
    return apiReference({
      spec: { content: openapiSpec },
      pageTitle: "Pesantren Tahfidz Qur'an dan Digital Arrahman API",
    })(c)
  } catch (e) {
    console.error('Failed to load Scalar:', e)
    return c.json({ error: 'Failed to load Scalar UI' }, 500)
  }
})

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
