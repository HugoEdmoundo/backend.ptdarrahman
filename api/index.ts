import { handle } from 'hono/vercel'
import { Hono } from 'hono'
import app from '../src/app'

const vercelApp = new Hono().basePath('/api')
vercelApp.route('/', app)

export default handle(vercelApp)
