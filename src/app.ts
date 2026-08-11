import { Hono } from 'hono'
import { cors } from 'hono/cors'
import { HTTPException } from 'hono/http-exception'
import { readFile } from 'node:fs/promises'
import { join } from 'node:path'
import { config } from './config'
import { openapiSpec } from './openapi'

import companyprofileRoutes from './companyprofile/routes'
import authRoutes from './auth/routes'
import usersRoutes from './users/routes'
import rolesRoutes from './roles/routes'
import superadminRoutes from './superadmin/routes'
import modulesRoutes from './modules/routes'
import ppdbRoutes from './ppdb/routes'
import dashboardRoutes from './dashboard/routes'

const app = new Hono()

app.use('*', cors())

app.get('/uploads/*', async (c) => {
  const filename = c.req.path.replace(/^\/uploads\//, '')
  if (!filename || filename.includes('..') || filename.includes('/')) {
    return c.json({ detail: 'Not Found' }, 404)
  }
  const dir = process.env.VERCEL ? '/tmp/uploads' : (config.uploadDir || 'uploads')
  const ext = filename.split('.').pop()?.toLowerCase() || ''
  const types: Record<string, string> = {
    jpg: 'image/jpeg', jpeg: 'image/jpeg', png: 'image/png', webp: 'image/webp', gif: 'image/gif',
  }
  try {
    const data = await readFile(join(dir, filename))
    return c.body(data, 200, {
      'Content-Type': types[ext] || 'application/octet-stream',
      'Cache-Control': 'public, max-age=31536000',
    })
  } catch {
    return c.json({ detail: 'Not Found' }, 404)
  }
})

app.get('/', (c) => c.json({
  message: "Pesantren Tahfidz Qur'an dan Digital Arrahman API",
  status: 'ok',
}))

app.get('/openapi.json', (c) => {
  return c.json(openapiSpec)
})

app.get('/ui', (c) => c.html('<!DOCTYPE html><html><head><title>Swagger UI</title><meta charset="utf-8"/><meta name="viewport" content="width=device-width,initial-scale=1"/><link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/swagger-ui-dist@5/swagger-ui.css"/></head><body><div id="swagger-ui"></div><script src="https://cdn.jsdelivr.net/npm/swagger-ui-dist@5/swagger-ui-bundle.js"></script><script>window.onload=()=>{window.ui=SwaggerUIBundle({url:"/openapi.json",dom_id:"#swagger-ui"})}</script></body></html>'))

app.get('/scalar', (c) => c.html('<!DOCTYPE html><html><head><title>Scalar API Reference</title><meta charset="utf-8"/><meta name="viewport" content="width=device-width,initial-scale=1"/></head><body><script id="api-reference" data-url="/openapi.json"></script><script src="https://cdn.jsdelivr.net/npm/@scalar/api-reference"></script></body></html>'))

app.route('/auth', authRoutes)
app.route('/users', usersRoutes)
app.route('/roles', rolesRoutes)
app.route('/superadmin', superadminRoutes)
app.route('/companyprofile', companyprofileRoutes)
app.route('/modules', modulesRoutes)
app.route('/ppdb', ppdbRoutes)
app.route('/dashboard', dashboardRoutes)

app.onError((err, c) => {
  if (err instanceof HTTPException) return c.json({ detail: err.message }, err.status)
  console.error('Unhandled error:', err)
  return c.json({ detail: 'Internal Server Error', error: err.message, stack: err.stack }, 500)
})

app.notFound((c) => c.json({ detail: 'Not Found' }, 404))

export default app
