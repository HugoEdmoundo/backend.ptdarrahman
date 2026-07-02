import { Context } from 'hono'
import { HTTPException } from 'hono/http-exception'

const store = new Map<string, number[]>()

export class RateLimiter {
  constructor(
    public maxRequests: number = 10,
    public windowSeconds: number = 60
  ) {}

  key(c: Context): string {
    const ip = c.req.header('x-forwarded-for') || c.req.header('x-real-ip') || 'unknown'
    return ip
  }

  check(c: Context): void {
    const key = this.key(c)
    const now = Date.now()
    const cutoff = now - this.windowSeconds * 1000

    let timestamps = store.get(key) || []
    timestamps = timestamps.filter(t => t > cutoff)

    if (timestamps.length >= this.maxRequests) {
      throw new HTTPException(429, { message: `Too many requests. Try again in ${this.windowSeconds} seconds.` })
    }

    timestamps.push(now)
    store.set(key, timestamps)
  }

  reset(key: string): void {
    store.delete(key)
  }
}

export const loginLimiter = new RateLimiter(10, 60)
export const refreshLimiter = new RateLimiter(20, 60)
export const profileLimiter = new RateLimiter(10, 60)
export const registerLimiter = new RateLimiter(5, 60)
