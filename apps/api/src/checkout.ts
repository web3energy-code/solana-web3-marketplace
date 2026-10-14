import { Router } from 'express'
import { PublicKey } from '@solana/web3.js'
import nacl from 'tweetnacl'
import { getSupabaseClient } from './services/supabase.js'

const router = Router()

router.post('/orders', async (req, res) => {
  try {
    const {
      buyerWallet,
      productId,
      quantity,
      challengeMessage,
      signature,
    } = req.body ?? {}

    if (
      typeof buyerWallet !== 'string' ||
      typeof productId !== 'string' ||
      !Number.isSafeInteger(quantity) ||
      quantity < 1 ||
      typeof challengeMessage !== 'string' ||
      typeof signature !== 'string'
    ) {
      return res.status(400).json({
        error: 'Invalid checkout request.',
      })
    }

    let publicKey: PublicKey

    try {
      publicKey = new PublicKey(buyerWallet)
    } catch {
      return res.status(400).json({
        error: 'Invalid Solana wallet address.',
      })
    }

    const wallet = publicKey.toBase58()

    // Validate the exact checkout challenge.
    if (
      !challengeMessage.includes(`Wallet: ${wallet}\n`) ||
      !challengeMessage.includes(
        'Purpose: Verify wallet ownership to create a SolMart checkout order.',
      )
    ) {
      return res.status(401).json({
        error: 'Invalid checkout wallet challenge.',
      })
    }

    // Decode and verify the wallet's Ed25519 signature.
    let signatureBytes: Buffer

    try {
      signatureBytes = Buffer.from(signature, 'base64')
    } catch {
      return res.status(400).json({
        error: 'Invalid wallet signature.',
      })
    }

    if (
      signatureBytes.length !== 64 ||
      !nacl.sign.detached.verify(
        new TextEncoder().encode(challengeMessage),
        new Uint8Array(signatureBytes),
        publicKey.toBytes(),
      )
    ) {
      return res.status(401).json({
        error: 'Wallet signature verification failed.',
      })
    }

    const supabase = getSupabaseClient()
    const now = new Date().toISOString()

    // Find an unused, unexpired challenge belonging to this wallet.
    const { data: challenge, error: challengeError } = await supabase
      .from('solmart_wallet_challenges')
      .select('id')
      .eq('wallet_address', wallet)
      .eq('challenge', challengeMessage)
      .is('used_at', null)
      .gt('expires_at', now)
      .maybeSingle()

    if (challengeError) {
      console.error('Checkout challenge lookup failed:', challengeError.message)

      return res.status(500).json({
        error: 'Could not verify checkout challenge.',
      })
    }

    if (!challenge) {
      return res.status(401).json({
        error: 'Checkout challenge is invalid, expired, or already used.',
      })
    }

    // Consume the challenge atomically so it cannot be reused.
    const { data: consumed, error: consumeError } = await supabase
      .from('solmart_wallet_challenges')
      .update({ used_at: now })
      .eq('id', challenge.id)
      .is('used_at', null)
      .gt('expires_at', now)
      .select('id')
      .maybeSingle()

    if (consumeError) {
      console.error('Checkout challenge consumption failed:', consumeError.message)

      return res.status(500).json({
        error: 'Could not complete wallet verification.',
      })
    }

    if (!consumed) {
      return res.status(401).json({
        error: 'Checkout challenge has already been used or expired.',
      })
    }

    // The database calculates the price and reserves stock.
    const { data: order, error: orderError } = await supabase.rpc(
      'solmart_create_checkout_order',
      {
        p_buyer_wallet: wallet,
        p_product_id: productId,
        p_quantity: quantity,
      },
    )

    if (orderError) {
      console.error('Checkout order creation failed:', orderError.message)

      return res.status(409).json({
        error: 'Could not create the order. Check product availability and stock.',
      })
    }

    return res.status(201).json({
      message: 'Pending checkout order created.',
      order,
    })
  } catch (error) {
    console.error('Checkout API error:', error)

    return res.status(500).json({
      error: 'An unexpected checkout error occurred.',
    })
  }
})

export default router
