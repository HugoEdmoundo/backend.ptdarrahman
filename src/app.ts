import { Hono } from 'hono'
import { cors } from 'hono/cors'
import { HTTPException } from 'hono/http-exception'

import companyprofileRoutes from './companyprofile/routes'
import { openapiSpec } from './openapi'

const isProduction = !!process.env.VERCEL

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
  status: 'ok',
  docs: {
    openapi: '/openapi.json',
    ...(!isProduction && {
      swagger_ui: '/ui',
      scalar: '/scalar',
    }),
  }
}))

// OpenAPI JSON (always available)
app.get('/openapi.json', (c) => c.json(openapiSpec))

// Docs UI (local dev only — these packages crash on Vercel's serverless runtime)
if (!isProduction) {
  try {
    // @ts-ignore — devDependency, only loaded locally
    const { swaggerUI } = require('@hono/swagger-ui')
    app.get('/ui', swaggerUI({ url: '/openapi.json' }))
  } catch { /* package not available */ }

  try {
    // @ts-ignore — devDependency, only loaded locally
    const { Scalar } = require('@scalar/hono-api-reference')
    app.get('/scalar', Scalar({ url: '/openapi.json' }))
  } catch { /* package not available */ }
}

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
