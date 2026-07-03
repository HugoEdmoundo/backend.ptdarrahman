import app from '../src/app'

export default async function handler(req: any, res: any) {
  const url = new URL(req.url || '/', `https://${req.headers.host || 'localhost'}`)
  const headers = new Headers()
  for (const [k, v] of Object.entries(req.headers)) {
    if (v) headers.set(k, Array.isArray(v) ? v.join(', ') : v)
  }
  const request = new Request(url, {
    method: req.method,
    headers,
    body: req.method !== 'GET' && req.method !== 'HEAD'
      ? await new Promise((resolve) => {
          const chunks: any[] = []
          req.on('data', (chunk: any) => chunks.push(chunk))
          req.on('end', () => resolve(Buffer.concat(chunks)))
        })
      : undefined,
  })
  const response = await app.fetch(request)
  res.statusCode = response.status
  response.headers.forEach((value, key) => res.setHeader(key, value))
  const body = await response.text()
  res.end(body)
}
