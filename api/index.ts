import { Hono } from 'hono'
import { handle } from 'hono/vercel'

const app = new Hono()

app.get('/', (c) => c.json({ message: 'Minimal test - API running!', status: 'ok' }))

export default handle(app)