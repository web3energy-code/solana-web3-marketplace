import express, {
  type NextFunction,
  type Request,
  type Response,
} from 'express'
import cors from 'cors'
import morgan from 'morgan'
import { PublicKey } from '@solana/web3.js'
import { env } from './config/env.js'
import { createWalletChallenge } from './walletChallenges.js'
import productPublishingRouter from './productPublishing.js'

const app = express()

app.use(
  cors({
    origin: env.CORS_ORIGIN.split(',').map((origin) => origin.trim()),
    credentials: true,
  }),
)

app.use(express.json({ limit: '1mb' }))
app.use('/products', productPublishingRouter)
app.use(morgan(env.NODE_ENV === 'production' ? 'combined' : 'dev'))

// Existing health check
app.get('/health', (_req: Request, res: Response) => {
  res.json({
    status: 'ok',
    service: 'marketplace-api',
    version: '1.0.0',
    nodeEnv: env.NODE_ENV,
    timestamp: new Date().toISOString(),
  })
})

// Create a temporary wallet verification challenge
app.post('/wallet/challenge', async (req: Request, res: Response) => {
  const walletAddress = req.body?.walletAddress

  if (
    typeof walletAddress !== 'string' ||
    walletAddress.length === 0 ||
    walletAddress.length > 100
  ) {
    res.status(400).json({
      error: 'A valid walletAddress is required.',
    })
    return
  }

  try {
    // Validate the Solana wallet address.
    new PublicKey(walletAddress)

    const challenge = await createWalletChallenge(walletAddress)

    res.status(200).json({
      success: true,
      walletAddress: challenge.walletAddress,
      message: challenge.message,
      expiresAt: challenge.expiresAt,
    })
  } catch (error) {
    console.error(
      'Wallet challenge creation failed:',
      error instanceof Error ? error.message : 'Unknown error',
    )

    res.status(500).json({
      error: 'Could not create wallet verification challenge.',
    })
  }
})

// Existing 404 handler
app.use((_req: Request, res: Response) => {
  res.status(404).json({ error: 'Route not found' })
})

// Existing error handler
app.use(
  (
    err: Error,
    _req: Request,
    res: Response,
    _next: NextFunction,
  ) => {
    console.error('Error:', err)

    res.status(500).json({
      error: 'Internal server error',
      message:
        env.NODE_ENV === 'production'
          ? 'Something went wrong'
          : err.message,
    })
  },
)

const port = env.PORT

app.listen(port, () => {
  console.log(
    `[${new Date().toISOString()}] Marketplace API listening on port ${port}`,
  )
  console.log(`Environment: ${env.NODE_ENV}`)
  console.log(`Solana Network: ${env.SOLANA_NETWORK}`)
})

export default app
