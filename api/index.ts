module.exports = function (req: any, res: any) {
  res.status(200).json({
    message: 'Hello World from Native Node with module.exports! If you see this, ESM/TypeScript was the problem.',
    url: req.url
  })
}
