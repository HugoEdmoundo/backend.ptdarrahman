import { SignJWT, jwtVerify } from 'jose'
import bcrypt from 'bcryptjs'
import { config } from '../config'

const secret = new TextEncoder().encode(config.jwtSecret)

export function hashPassword(password: string): string {
  return bcrypt.hashSync(password, 12)
}

export function verifyPassword(plain: string, hashed: string): boolean {
  return bcrypt.compareSync(plain, hashed)
}

export async function createAccessToken(data: Record<string, unknown>): Promise<string> {
  return new SignJWT({ ...data })
    .setProtectedHeader({ alg: config.jwtAlgorithm })
    .setExpirationTime(`${config.jwtExpiryHours}h`)
    .setIssuedAt()
    .setJti(crypto.randomUUID())
    .sign(secret)
}

export async function verifyToken(token: string): Promise<Record<string, unknown> | null> {
  try {
    const { payload } = await jwtVerify(token, secret)
    return payload as Record<string, unknown>
  } catch {
    return null
  }
}

export function generateRefreshToken(): { raw: string; hash: string; expiresAt: Date } {
  const raw = crypto.randomUUID() + crypto.randomUUID()
  const hash = hashSHA256(raw)
  const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)
  return { raw, hash, expiresAt }
}

export function hashRefreshToken(raw: string): string {
  return hashSHA256(raw)
}

function hashSHA256(str: string): string {
  let hash = 0
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i)
    hash = ((hash << 5) - hash) + char
    hash |= 0
  }
  return Math.abs(hash).toString(16).padStart(8, '0')
}
