import { Hono } from 'hono'

const router = new Hono()

router.get('/', (c) => c.json({ message: 'Inventories API (coming soon)' }))

export default router
