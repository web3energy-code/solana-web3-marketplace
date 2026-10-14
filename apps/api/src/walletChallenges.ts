import { randomBytes } from 'node:crypto'
import { PublicKey } from '@solana/web3.js'
import { getSupabaseClient } from './services/supabase.js'

const CHALLENGE_EXPIRY_MINUTES = 5

export interface WalletChallenge {
  walletAddress: string
  message: string
  expiresAt: string
}

export async function createWalletChallenge(
  walletAddress: string,
  purpose: 'listing' | 'seller_profile' | 'messaging' | 'checkout' = 'listing',
): Promise<WalletChallenge> {
  let publicKey: PublicKey

  try {
    publicKey = new PublicKey(walletAddress)
  } catch {
    throw new Error('Invalid Solana wallet address.')
  }

  const normalizedWallet = publicKey.toBase58()
  const purposeText =
  purpose === 'seller_profile'
    ? 'Verify wallet ownership to create or update a seller profile.'
    : purpose === 'messaging'
      ? 'Verify wallet ownership to access SolMart messaging.'
      : purpose === 'checkout'
        ? 'Verify wallet ownership to create a SolMart checkout order.'
        : 'Verify wallet ownership to publish a marketplace listing.'
  const nonce = randomBytes(32).toString('hex')
  const createdAt = new Date()
  const expiresAt = new Date(
    createdAt.getTime() + CHALLENGE_EXPIRY_MINUTES * 60_000,
  )

  const message = [
    'SolMart Wallet Verification',
    `Wallet: ${normalizedWallet}`,
    `Nonce: ${nonce}`,
    `Issued At: ${createdAt.toISOString()}`,
    `Expiration Time: ${expiresAt.toISOString()}`,
    `Purpose: ${purposeText}`,,
    'This signature does not authorize a blockchain transaction.',
  ].join('\n')

  const supabase = getSupabaseClient()

  const { error } = await supabase
    .from('solmart_wallet_challenges')
    .insert({
      wallet_address: normalizedWallet,
      challenge: message,
      created_at: createdAt.toISOString(),
      expires_at: expiresAt.toISOString(),
      used_at: null,
    })

  if (error) {
    console.error('Failed to create wallet challenge:', error.message)
    throw new Error('Could not create wallet verification challenge.')
  }

  return {
    walletAddress: normalizedWallet,
    message,
    expiresAt: expiresAt.toISOString(),
  }
}
