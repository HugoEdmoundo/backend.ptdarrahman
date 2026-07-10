import { Context } from 'hono'
import { HTTPException } from 'hono/http-exception'

const inMemoryStore = new Map<string, number[]>()
let dbAvailable = false

async function ensureTable(): Promise<void> {
  try {
    const { getRawPool } = await import('../db/mysql')
    const pool = getRawPool()
    await pool.execute(`
      CREATE TABLE IF NOT EXISTS rate_limits (
        \`key\` VARCHAR(255) NOT NULL,
        timestamp BIGINT NOT NULL,
        PRIMARY KEY (\`key\`, timestamp),
        INDEX idx_key (\`key\`)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
    `)
    dbAvailable = true
  } catch {
    dbAvailable = false
  }
}

let tableEnsured = false

async function isRateLimited(key: string, maxRequests: number, windowSeconds: number): Promise<boolean> {
  if (!tableEnsured) {
    await ensureTable()
    tableEnsured = true
  }

  const cutoff = Date.now() - windowSeconds * 1000

  if (dbAvailable) {
    try {
      const { getRawPool } = await import('../db/mysql')
      const pool = getRawPool()
      const [rows] = await pool.execute<any[]>(
        'SELECT timestamp FROM rate_limits WHERE `key` = ? AND timestamp > ? ORDER BY timestamp ASC',
        [key, cutoff]
      )
      if (rows.length >= maxRequests) return true
      await pool.execute(
        'INSERT INTO rate_limits (`key`, timestamp) VALUES (?, ?)',
        [key, Date.now()]
      )
      await pool.execute(
        'DELETE FROM rate_limits WHERE `key` = ? AND timestamp <= ?',
        [key, cutoff]
      )
      return false
    } catch {
      // fall through to in-memory
    }
  }

  // Fallback: in-memory (works for single instance / local dev)
  let timestamps = inMemoryStore.get(key) || []
  timestamps = timestamps.filter(t => t > cutoff)
  if (timestamps.length >= maxRequests) return true
  timestamps.push(Date.now())
  inMemoryStore.set(key, timestamps)
  return false
}

export class RateLimiter {
  constructor(
    public maxRequests: number = 10,
    public windowSeconds: number = 60
  ) {}

  key(c: Context): string {
    const ip = c.req.header('x-forwarded-for') || c.req.header('x-real-ip') || 'unknown'
    return ip
  }

  async checkAsync(c: Context): Promise<void> {
    const key = this.key(c)
    if (await isRateLimited(key, this.maxRequests, this.windowSeconds)) {
      throw new HTTPException(429, { message: `Too many requests. Try again in ${this.windowSeconds} seconds.` })
    }
  }

  check(c: Context): void {
    const key = this.key(c)
    const now = Date.now()
    const cutoff = now - this.windowSeconds * 1000

    let timestamps = inMemoryStore.get(key) || []
    timestamps = timestamps.filter(t => t > cutoff)

    if (timestamps.length >= this.maxRequests) {
      throw new HTTPException(429, { message: `Too many requests. Try again in ${this.windowSeconds} seconds.` })
    }

    timestamps.push(now)
    inMemoryStore.set(key, timestamps)
  }

  reset(key: string): void {
    inMemoryStore.delete(key)
  }
}

export const loginLimiter = new RateLimiter(10, 60)
export const refreshLimiter = new RateLimiter(20, 60)
export const profileLimiter = new RateLimiter(10, 60)
export const registerLimiter = new RateLimiter(5, 60)
