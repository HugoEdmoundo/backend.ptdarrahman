import { handle } from 'hono/vercel'
import { Hono } from 'hono'
import app from '../src/app'

// Vercel routes /api/* to api/ functions.
// We wrap the app with basePath('/api') so Hono strips /api from the URL,
// allowing routes like app.get('/') to match requests at /api/
const vercelApp = new Hono()
vercelApp.basePath('/api')
vercelApp.route('/', app)

export default handle(vercelApp)
