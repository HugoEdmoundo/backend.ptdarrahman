import { Hono } from 'hono'
import { cors } from 'hono/cors'
import { HTTPException } from 'hono/http-exception'

import companyprofileRoutes from './companyprofile/routes'
import { openapiSpec } from './openapi'

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
    swagger_ui: 'https://petstore.swagger.io/?url=https://backend-ptdarrahman.vercel.app/openapi.json',
    scalar: 'https://scalar.refine.dev?apiUrl=https://backend-ptdarrahman.vercel.app/openapi.json',
  }
}))

// OpenAPI JSON
app.get('/openapi.json', (c) => c.json(openapiSpec))

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
