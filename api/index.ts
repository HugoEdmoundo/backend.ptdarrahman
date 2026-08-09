import { handle } from 'hono/vercel'
import app from '../src/app'

module.exports = handle(app)
