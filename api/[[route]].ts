import { handle } from 'hono/vercel'
import { Hono } from 'hono'
import app from '../src/app'

// With Vercel "Other" framework, functions live at /api/*.
// basePath('/api') MUST be chained at creation — app.basePath() returns a NEW instance.
const vercelApp = new Hono().basePath('/api')
vercelApp.route('/', app)

// Handle /api (no trailing slash) — basePath('/api') strips to empty, not /
vercelApp.get('/api', async (c) => {
  const res = await app.fetch(new Request('http://localhost/'))
  return new Response(res.body, { status: res.status, headers: res.headers })
})

export default handle(vercelApp)
