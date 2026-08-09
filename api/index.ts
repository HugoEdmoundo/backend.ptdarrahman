import { Hono } from 'hono'
import { handle } from 'hono/vercel'

const app = new Hono()

app.get('/', (c) => c.json({ message: 'Hello from Vercel! If you see this, Hono is working.' }))
app.all('*', (c) => c.json({ message: 'Fallback' }))

export default handle(app)
