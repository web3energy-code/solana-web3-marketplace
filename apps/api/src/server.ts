import express, { type NextFunction, type Request, type Response } from 'express'
import cors from 'cors'
import morgan from 'morgan'
import { env } from './config/env.js'

const app = express()

app.use(
  cors({
    origin: env.CORS_ORIGIN.split(',').map((origin) => origin.trim()),
    credentials: true,
  }),
)
app.use(express.json({ limit: '1mb' }))
app.use(morgan(env.NODE_ENV === 'production' ? 'combined' : 'dev'))

app.get('/health', (_req: Request, res: Response) => {
  res.json({
    status: 'ok',
    service: 'marketplace-api',
    version: '1.0.0',
    nodeEnv: env.NODE_ENV,
    timestamp: new Date().toISOString(),
  })
})

app.use((_req: Request, res: Response) => {
  res.status(404).json({ error: 'Route not found' })
})

app.use((err: Error, _req: Request, res: Response, _next: NextFunction) => {
  console.error('Error:', err)
  res.status(500).json({
    error: 'Internal server error',
    message: env.NODE_ENV === 'production' ? 'Something went wrong' : err.message,
  })
})

const port = env.PORT
app.listen(port, () => {
  console.log(`[${new Date().toISOString()}] Marketplace API listening on http://localhost:${port}`)
  console.log(`Environment: ${env.NODE_ENV}`)
  console.log(`Solana Network: ${env.SOLANA_NETWORK}`)
})

export default app
