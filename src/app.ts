import { Hono } from 'hono'
import { cors } from 'hono/cors'
import { HTTPException } from 'hono/http-exception'
import { apiReference } from '@scalar/hono-api-reference'

import companyprofileRoutes from './companyprofile/routes'

const app = new Hono()

app.use('*', cors({
  origin: '*',
  allowMethods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowHeaders: ['*'],
  exposeHeaders: ['*'],
}))

// Health check
app.get('/', (c) => c.json({
  message: "Pesantren Tahfidz Qur'an dan Digital Arrahman API",
  status: 'ok'
}))

// OpenAPI JSON - lazy load
app.get('/openapi.json', async (c) => {
  try {
    const { openapiSpec } = await import('./openapi')
    return c.json(openapiSpec)
  } catch (e) {
    console.error('Failed to load OpenAPI spec:', e)
    return c.json({ error: 'Failed to load OpenAPI spec' }, 500)
  }
})

// Swagger UI documentation
app.get('/docs', async (c) => {
  const html = `
<!DOCTYPE html>
<html>
<head>
  <title>Pesantren Tahfidz Qur'an dan Digital Arrahman API</title>
  <link rel="stylesheet" type="text/css" href="https://unpkg.com/swagger-ui-dist@5/swagger-ui.css">
  <style>
    html { box-sizing: border-box; overflow: -moz-scrollbars-vertical; overflow-y: scroll; }
    *, *:before, *:after { box-sizing: inherit; }
    body { margin: 0; background: #fafafa; }
  </style>
</head>
<body>
  <div id="swagger-ui"></div>
  <script src="https://unpkg.com/swagger-ui-dist@5/swagger-ui-bundle.js"></script>
  <script>
    window.onload = function() {
      const ui = SwaggerUIBundle({
        url: '/openapi.json',
        dom_id: '#swagger-ui',
        deepLinking: true,
        presets: [
          SwaggerUIBundle.presets.apis,
          SwaggerUIBundle.SwaggerUIStandalonePreset
        ],
        layout: "BaseLayout",
        defaultModelsExpandDepth: 1,
        defaultModelExpandDepth: 1
      });
    }
  </script>
</body>
</html>
  `
  return c.html(html)
})

// Scalar API Reference
app.get('/scalar', apiReference({
  pageTitle: "Pesantren Tahfidz Qur'an dan Digital Arrahman API",
  spec: { url: '/openapi.json' },
}))

// Routes
app.route('/companyprofile', companyprofileRoutes)

// Error handler
app.onError((err, c) => {
  if (err instanceof HTTPException) {
    return c.json({ detail: err.message }, err.status)
  }
  console.error('Unhandled error:', err)
  return c.json({ detail: 'Internal Server Error' }, 500)
})

// 404 handler
app.notFound((c) => c.json({ detail: 'Not Found' }, 404))

export default app
