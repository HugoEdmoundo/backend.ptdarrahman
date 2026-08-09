import { getRequestListener } from '@hono/node-server'
import app from '../src/app'

const listener = getRequestListener(app.fetch)

module.exports = async function (req: any, res: any) {
  return listener(req, res)
}
module.exports.config = {
  api: {
    bodyParser: false,
  },
}
