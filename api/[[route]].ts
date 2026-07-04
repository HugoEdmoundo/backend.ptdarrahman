import { handle } from 'hono/vercel'
import { Hono } from 'hono'
import app from '../src/app'

// Vercel routes /api/* to api/ functions.
// Mount the original app at /api so Hono strips /api from URLs.
// Example: /api/companyprofile/settings → route('/api') → remaining /companyprofile/settings → app.route ✅
const vercelApp = new Hono()

// Mount full app under /api prefix
vercelApp.route('/api', app)

// Handle /api (without trailing slash) — forward to app's root handler
vercelApp.get('/api', async (c) => {
  const res = await app.request('/')
  return new Response(res.body, {
    status: res.status,
    headers: res.headers
  })
})

export default handle(vercelApp)
