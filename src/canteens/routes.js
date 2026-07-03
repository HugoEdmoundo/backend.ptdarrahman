import { Hono } from 'hono';
const router = new Hono();
router.get('/', (c) => c.json({ message: 'Canteens API (coming soon)' }));
export default router;
