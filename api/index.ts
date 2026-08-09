export default function handler(req: any, res: any) {
  res.status(200).json({
    message: 'Hello World from Native Node! If you see this, Hono was the problem.',
    url: req.url
  })
}
