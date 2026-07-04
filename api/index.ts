import { Hono } from 'hono'

const app = new Hono()

app.get('/', (c) => c.json({ message: 'API Running!', status: 'ok' }))

export default app