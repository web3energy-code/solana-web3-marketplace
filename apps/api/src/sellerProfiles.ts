import express, { type Request, type Response } from 'express'
import { PublicKey } from '@solana/web3.js'
import nacl from 'tweetnacl'
import { getSupabaseClient } from './services/supabase.js'

const router = express.Router()

const PROFILES_TABLE = 'solmart_seller_profiles'
const CHALLENGES_TABLE = 'solmart_wallet_challenges'

function sendError(
  res: Response,
  status: number,
  error: string,
) {
  return res.status(status).json({
    success: false,
    error,
  })
}

// Retrieve a seller's saved profile.
router.get('/:walletAddress', async (req: Request, res: Response) => {
  try {
    const walletAddress = req.params.walletAddress

    if (typeof walletAddress !== 'string') {
      return sendError(res, 400, 'Invalid wallet address.')
    }

    let normalizedWallet: string

    try {
      normalizedWallet = new PublicKey(walletAddress).toBase58()
    } catch {
      return sendError(res, 400, 'Invalid Solana wallet address.')
    }

    const supabase = getSupabaseClient()

    const { data, error } = await supabase
      .from(PROFILES_TABLE)
      .select(
        'seller_wallet, full_name, username, profile_image_url, location, bio, seller_type, created_at, updated_at',
      )
      .eq('seller_wallet', normalizedWallet)
      .maybeSingle()

    if (error) {
      console.error('Could not retrieve seller profile:', error)
      return sendError(res, 500, 'Could not retrieve seller profile.')
    }

    return res.status(200).json({
      success: true,
      profile: data,
    })
  } catch (error) {
    console.error('Seller profile retrieval failed:', error)
    return sendError(res, 500, 'An unexpected error occurred.')
  }
})

// Save or update a seller's profile.
// The wallet must sign a valid, unused wallet challenge.
router.put('/', async (req: Request, res: Response) => {
  try {
    const {
      walletAddress,
      challengeMessage: rawChallengeMessage,
      signature,
      full_name,
      username,
      profile_image_url,
      location,
      bio,
      seller_type,
    } = req.body ?? {}

    if (
      typeof walletAddress !== 'string' ||
      typeof rawChallengeMessage !== 'string' ||
      typeof signature !== 'string'
    ) {
      return sendError(res, 400, 'Wallet authentication details are required.')
    }

    let normalizedWallet: string

    try {
      normalizedWallet = new PublicKey(walletAddress).toBase58()
    } catch {
      return sendError(res, 400, 'Invalid Solana wallet address.')
    }

    const challengeMessage = rawChallengeMessage.replace(/\r\n/g, '\n')

    if (
      typeof full_name !== 'string' ||
      typeof username !== 'string' ||
      typeof profile_image_url !== 'string' ||
      typeof location !== 'string' ||
      typeof bio !== 'string' ||
      !['individual', 'business'].includes(seller_type)
    ) {
      return sendError(res, 400, 'Please provide valid profile information.')
    }

    const cleanName = full_name.trim()
    const cleanUsername = username.trim().replace(/^@/, '').toLowerCase()
    const cleanImageUrl = profile_image_url.trim()
    const cleanLocation = location.trim()
    const cleanBio = bio.trim()

    if (cleanName.length > 100) {
      return sendError(res, 400, 'Full name must be 100 characters or fewer.')
    }

    if (
      cleanUsername.length > 30 ||
      (cleanUsername !== '' &&
        !/^[a-z0-9_]+$/.test(cleanUsername))
    ) {
      return sendError(
        res,
        400,
        'Username can contain only lowercase letters, numbers, and underscores.',
      )
    }

    if (cleanLocation.length > 150 || cleanBio.length > 1000) {
      return sendError(res, 400, 'Location or bio is too long.')
    }

    if (cleanImageUrl !== '') {
      try {
        const imageUrl = new URL(cleanImageUrl)

        if (imageUrl.protocol !== 'https:') {
          return sendError(res, 400, 'Profile image URL must use HTTPS.')
        }
      } catch {
        return sendError(res, 400, 'Invalid profile image URL.')
      }
    }

    let signatureBytes: Uint8Array

    try {
      signatureBytes = Buffer.from(signature, 'base64')

      if (
        signatureBytes.length !== 64 ||
        signatureBytes.toString('base64') !== signature
      ) {
        return sendError(res, 400, 'Invalid wallet signature format.')
      }
    } catch {
      return sendError(res, 400, 'Invalid wallet signature.')
    }

    const supabase = getSupabaseClient()

    // Find the exact, unexpired challenge issued for this wallet.
    const { data: challenge, error: challengeError } = await supabase
      .from(CHALLENGES_TABLE)
      .select('id, wallet_address, challenge, expires_at, used_at')
      .eq('wallet_address', normalizedWallet)
      .eq('challenge', challengeMessage)
      .maybeSingle()

    if (challengeError) {
      console.error('Wallet challenge lookup failed:', challengeError)
      return sendError(res, 500, 'Could not verify wallet authentication.')
    }

    if (!challenge) {
      return sendError(
        res,
        401,
        'Wallet challenge was not found. Please reconnect your wallet and try again.',
      )
    }

    if (challenge.used_at) {
      return sendError(
        res,
        401,
        'This wallet challenge has already been used. Please try again.',
      )
    }

    const now = new Date()

    if (new Date(challenge.expires_at).getTime() <= now.getTime()) {
      return sendError(
        res,
        401,
        'Wallet challenge expired. Please reconnect your wallet and try again.',
      )
    }

    // Verify that the connected wallet signed the exact challenge.
    const walletPublicKey = new PublicKey(normalizedWallet)

    const validSignature = nacl.sign.detached.verify(
      new Uint8Array(Buffer.from(challengeMessage, 'utf8')),
      signatureBytes,
      walletPublicKey.toBytes(),
    )

    if (!validSignature) {
      return sendError(res, 401, 'Wallet signature verification failed.')
    }

    // Consume the challenge only once.
    const { data: consumedChallenge, error: consumeError } =
      await supabase
        .from(CHALLENGES_TABLE)
        .update({ used_at: now.toISOString() })
        .eq('id', challenge.id)
        .is('used_at', null)
        .gt('expires_at', now.toISOString())
        .select('id')
        .maybeSingle()

    if (consumeError) {
      console.error('Could not consume wallet challenge:', consumeError)
      return sendError(res, 500, 'Could not complete wallet authentication.')
    }

    if (!consumedChallenge) {
      return sendError(
        res,
        401,
        'Wallet challenge is expired or has already been used.',
      )
    }

    // Save the profile against the wallet that signed the challenge.
    const { data: profile, error: saveError } = await supabase
      .from(PROFILES_TABLE)
      .upsert(
        {
          seller_wallet: normalizedWallet,
          full_name: cleanName,
          username: cleanUsername || null,
          profile_image_url: cleanImageUrl || null,
          location: cleanLocation,
          bio: cleanBio,
          seller_type,
          updated_at: new Date().toISOString(),
        },
        { onConflict: 'seller_wallet' },
      )
      .select()
      .single()

    if (saveError) {
      console.error('Could not save seller profile:', saveError)

      if (saveError.code === '23505') {
        return sendError(
          res,
          409,
          'That username is already taken. Please choose another.',
        )
      }

      return sendError(res, 500, 'Could not save seller profile.')
    }

    return res.status(200).json({
      success: true,
      message: 'Seller profile saved successfully.',
      profile,
    })
  } catch (error) {
    console.error('Seller profile update failed:', error)
    return sendError(res, 500, 'An unexpected error occurred.')
  }
})

export default router
