import { Context } from 'hono'

const clients = new Map<string, { module: string; enqueue: (data: string) => void; cancel: () => void; lastActivity: number }>()

let nextId = 0

const CLIENT_TIMEOUT_MS = 30 * 60 * 1000 // 30 minutes

setInterval(() => {
  const now = Date.now()
  for (const [id, client] of clients) {
    if (now - client.lastActivity > CLIENT_TIMEOUT_MS) {
      try { client.cancel() } catch { /* ignore */ }
      clients.delete(id)
    }
  }
}, 60_000)

export function emit(module: string, event: string, data: string = '') {
  const msg = `event: ${event}\ndata: ${data}\n\n`
  for (const [id, client] of clients) {
    if (client.module === module) {
      client.lastActivity = Date.now()
      try { client.enqueue(msg) } catch { clients.delete(id); client.cancel() }
    }
  }
}

export async function handleSSE(c: Context, module: string) {
  const id = String(++nextId)
  let closed = false
  let keepaliveTimer: ReturnType<typeof setInterval> | null = null

  const stream = new ReadableStream({
    start(controller) {
      const enc = new TextEncoder()
      controller.enqueue(enc.encode(`event: connected\ndata: {}\n\n`))

      keepaliveTimer = setInterval(() => {
        if (!closed) {
          try { controller.enqueue(enc.encode(': keepalive\n\n')) } catch { /* ignore */ }
        }
      }, 15000)

      clients.set(id, {
        module,
        lastActivity: Date.now(),
        enqueue: (data: string) => { if (!closed) { controller.enqueue(enc.encode(data)); clients.get(id)!.lastActivity = Date.now() } },
        cancel: () => { closed = true; clearInterval(keepaliveTimer!); try { controller.close() } catch { /* ignore */ } },
      })
    },
    cancel() {
      closed = true
      if (keepaliveTimer) clearInterval(keepaliveTimer)
      clients.delete(id)
    },
  })

  c.header('Content-Type', 'text/event-stream')
  c.header('Cache-Control', 'no-cache')
  c.header('Connection', 'keep-alive')
  c.header('X-Accel-Buffering', 'no')

  c.req.raw.signal.addEventListener('abort', () => {
    closed = true
    if (keepaliveTimer) clearInterval(keepaliveTimer)
    clients.delete(id)
  })

  return c.newResponse(stream)
}
