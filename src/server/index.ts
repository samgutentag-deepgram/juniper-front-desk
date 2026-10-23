import express from 'express'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

// Static only. The visitor's key goes from their browser straight to Deepgram and never reaches
// this server, which holds no key of its own.
export function createApp() {
  const app = express()
  app.disable('x-powered-by')
  const dist = path.resolve('dist')
  app.use(express.static(dist))
  app.get('/{*splat}', (_req, res) => res.sendFile(path.join(dist, 'index.html')))
  return app
}

const isMain = process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)
if (isMain) {
  const port = Number(process.env.PORT ?? 8081)
  createApp().listen(port, () => console.log(`juniper-front-desk on http://localhost:${port}`))
}
