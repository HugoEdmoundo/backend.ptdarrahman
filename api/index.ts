import { handle } from 'hono/vercel'
import { Hono } from 'hono'

const wrapper = new Hono()

wrapper.all('*', async (c) => {
  try {
    const appModule = await import('../src/app')
    const app = appModule.default
    return await app.fetch(c.req.raw, c.env)
  } catch (err: any) {
    return c.json({ error: 'Initialization Failed', message: err.message, stack: err.stack }, 500)
  }
})

export default handle(wrapper)
