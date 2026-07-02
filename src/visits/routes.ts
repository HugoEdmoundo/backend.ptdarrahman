import { Hono } from 'hono'

const router = new Hono()

router.get('/', (c) => c.json({ message: 'Visits API (coming soon)' }))

export default router
