import 'dotenv/config'
import app from './app'

const port = parseInt(process.env.PORT || '8000', 10)

console.log(`Server running on http://localhost:${port}`)

export default {
  port,
  fetch: app.fetch,
}
