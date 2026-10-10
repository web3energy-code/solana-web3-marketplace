import dotenv from 'dotenv'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { existsSync } from 'node:fs'
import { z } from 'zod'

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)

const tryLoadEnv = () => {
  const possiblePaths = [
    join(__dirname, '../../.env'),
    join(__dirname, '../../../.env'),
  ]

  for (const path of possiblePaths) {
    if (existsSync(path)) {
      dotenv.config({ path })
      console.log(`[env] Loaded configuration from ${path}`)
      return
    }
  }

  console.log('[env] No .env file found, using process environment variables')
}

tryLoadEnv()

const optionalEnvSchema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  PORT: z.coerce.number().default(4000),
  CORS_ORIGIN: z.string().default('http://localhost:5173'),
  SOLANA_NETWORK: z.enum(['devnet', 'mainnet-beta']).default('devnet'),
  SOLANA_RPC_URL: z.string().url().default('https://api.devnet.solana.com'),
})

const optionalSupabaseSchema = z.object({
  SUPABASE_URL: z.string().optional(),
  SUPABASE_SERVICE_ROLE_KEY: z.string().optional(),
})

const optionalPaymentSchema = z.object({
  RECEIVING_WALLET: z.string().optional(),
})

export const env = optionalEnvSchema.parse(process.env)

const validateSupabaseConfig = () => {
  const result = optionalSupabaseSchema.parse(process.env)

  const missing = []
  if (!result.SUPABASE_URL) missing.push('SUPABASE_URL')
  if (!result.SUPABASE_SERVICE_ROLE_KEY) missing.push('SUPABASE_SERVICE_ROLE_KEY')

  if (missing.length > 0) {
    return {
      valid: false,
      missing,
      message: `Supabase configuration incomplete: ${missing.join(', ')}. Database features will be unavailable.`,
    }
  }

  return {
    valid: true,
    config: {
      url: result.SUPABASE_URL!,
      serviceRoleKey: result.SUPABASE_SERVICE_ROLE_KEY!,
    },
  }
}

const validatePaymentConfig = () => {
  const result = optionalPaymentSchema.parse(process.env)

  const missing = []
  if (!result.RECEIVING_WALLET) missing.push('RECEIVING_WALLET')

  if (missing.length > 0) {
    return {
      valid: false,
      missing,
      message: `Payment configuration incomplete: ${missing.join(', ')}. Payment features will be unavailable.`,
    }
  }

  return {
    valid: true,
    config: {
      receivingWallet: result.RECEIVING_WALLET!,
    },
  }
}

export { validateSupabaseConfig, validatePaymentConfig }
