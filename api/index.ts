// Dynamic import inside handler to catch initialization errors
module.exports = async function (req: any, res: any) {
  try {
    const protocol = req.headers['x-forwarded-proto'] || 'https'
    const host = req.headers['x-forwarded-host'] || req.headers.host || 'localhost'
    const url = `${protocol}://${host}${req.url}`

    const init: RequestInit = {
      method: req.method,
      headers: req.headers as any,
    }

    if (req.method !== 'GET' && req.method !== 'HEAD' && req.body) {
      init.body = typeof req.body === 'string' ? req.body : JSON.stringify(req.body)
    }

    const appModule = await import('../src/app')
    const app = appModule.default

    const request = new Request(url, init)
    const response = await app.fetch(request)

    res.status(response.status)
    response.headers.forEach((val, key) => res.setHeader(key, val))

    if (response.body) {
      const arrayBuffer = await response.arrayBuffer()
      res.send(Buffer.from(arrayBuffer))
    } else {
      res.send('')
    }
  } catch (err: any) {
    res.status(500).json({ detail: 'Adapter Error', message: err.message, stack: err.stack })
  }
}
