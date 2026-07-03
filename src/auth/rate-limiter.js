import { HTTPException } from 'hono/http-exception';
const store = new Map();
export class RateLimiter {
    maxRequests;
    windowSeconds;
    constructor(maxRequests = 10, windowSeconds = 60) {
        this.maxRequests = maxRequests;
        this.windowSeconds = windowSeconds;
    }
    key(c) {
        const ip = c.req.header('x-forwarded-for') || c.req.header('x-real-ip') || 'unknown';
        return ip;
    }
    check(c) {
        const key = this.key(c);
        const now = Date.now();
        const cutoff = now - this.windowSeconds * 1000;
        let timestamps = store.get(key) || [];
        timestamps = timestamps.filter(t => t > cutoff);
        if (timestamps.length >= this.maxRequests) {
            throw new HTTPException(429, { message: `Too many requests. Try again in ${this.windowSeconds} seconds.` });
        }
        timestamps.push(now);
        store.set(key, timestamps);
    }
    reset(key) {
        store.delete(key);
    }
}
export const loginLimiter = new RateLimiter(10, 60);
export const refreshLimiter = new RateLimiter(20, 60);
export const profileLimiter = new RateLimiter(10, 60);
export const registerLimiter = new RateLimiter(5, 60);
