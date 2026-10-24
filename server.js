// Serves the built page, and that is all. Visitors bring their own Deepgram key and it goes from
// their browser straight to Deepgram, so this server holds no key and never sees one.
import express from 'express'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

export function createApp() {
  const app = express()
  app.disable('x-powered-by')
  const dist = path.resolve('dist')
  app.use(express.static(dist))
  app.get('/{*splat}', (_req, res) => res.sendFile(path.join(dist, 'index.html')))
  return app
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const port = Number(process.env.PORT ?? 8081)
  createApp().listen(port, () => console.log(`juniper-front-desk on http://localhost:${port}`))
}
