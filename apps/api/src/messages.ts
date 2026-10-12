import express, { type Request, type Response } from 'express'
import { PublicKey } from '@solana/web3.js'
import nacl from 'tweetnacl'
import { getSupabaseClient } from './services/supabase.js'

const router = express.Router()

const PRODUCTS_TABLE = 'solmart_marketplace_products'
const CONVERSATIONS_TABLE = 'solmart_conversations'
const MESSAGES_TABLE = 'solmart_messages'
const CHALLENGES_TABLE = 'solmart_wallet_challenges'

const MESSAGING_PURPOSE =
  'Purpose: Verify wallet ownership to access SolMart messaging.'

function sendError(
  res: Response,
  status: number,
  message: string,
) {
  res.status(status).json({
    success: false,
    error: message,
  })
}

async function authenticateWallet(
  body: Record<string, unknown>,
): Promise<string> {
  const { walletAddress, challengeMessage, signature } = body

  if (
    typeof walletAddress !== 'string' ||
    typeof challengeMessage !== 'string' ||
    typeof signature !== 'string'
  ) {
    throw new Error('Wallet verification details are required.')
  }

  let publicKey: PublicKey

  try {
    publicKey = new PublicKey(walletAddress)
  } catch {
    throw new Error('Invalid wallet address.')
  }

  const wallet = publicKey.toBase58()
  const message = challengeMessage.replace(/\r\n/g, '\n')

  if (!message.includes(MESSAGING_PURPOSE)) {
    throw new Error('A messaging-specific wallet challenge is required.')
  }

  let signatureBytes: Buffer

  try {
    signatureBytes = Buffer.from(signature, 'base64')
  } catch {
    throw new Error('Invalid wallet signature.')
  }

  if (
    signatureBytes.length !== 64 ||
    signatureBytes.toString('base64') !== signature
  ) {
    throw new Error('Invalid wallet signature.')
  }

  const validSignature = nacl.sign.detached.verify(
    new Uint8Array(Buffer.from(message, 'utf8')),
    new Uint8Array(signatureBytes),
    publicKey.toBytes(),
  )

  if (!validSignature) {
    throw new Error('Wallet signature verification failed.')
  }

  const supabase = getSupabaseClient()

  const { data: challenge, error } = await supabase
    .from(CHALLENGES_TABLE)
    .select('id, wallet_address, challenge, expires_at, used_at')
    .eq('wallet_address', wallet)
    .eq('challenge', message)
    .maybeSingle()

  if (error) {
    throw new Error('Could not verify wallet challenge.')
  }

  if (!challenge) {
    throw new Error('Wallet challenge not found.')
  }

  if (challenge.used_at) {
    throw new Error('Wallet challenge has already been used.')
  }

  const now = new Date()

  if (new Date(challenge.expires_at).getTime() <= now.getTime()) {
    throw new Error('Wallet challenge expired. Please try again.')
  }

  const { data: consumed, error: consumeError } = await supabase
    .from(CHALLENGES_TABLE)
    .update({ used_at: now.toISOString() })
    .eq('id', challenge.id)
    .is('used_at', null)
    .gt('expires_at', now.toISOString())
    .select('id')
    .maybeSingle()

  if (consumeError || !consumed) {
    throw new Error('Wallet challenge expired or was already used.')
  }

  return wallet
}

function getErrorStatus(message: string): number {
  if (
    message.includes('required') ||
    message.includes('Invalid') ||
    message.includes('challenge') ||
    message.includes('signature') ||
    message.includes('expired') ||
    message.includes('used')
  ) {
    return 401
  }

  return 500
}

async function getConversationForParticipant(
  conversationId: string,
  wallet: string,
) {
  const supabase = getSupabaseClient()

  const { data, error } = await supabase
    .from(CONVERSATIONS_TABLE)
    .select('*')
    .eq('id', conversationId)
    .maybeSingle()

  if (error) {
    throw new Error('Could not load conversation.')
  }

  if (!data) {
    throw new Error('Conversation not found.')
  }

  if (
    data.buyer_wallet !== wallet &&
    data.seller_wallet !== wallet
  ) {
    throw new Error('You are not a participant in this conversation.')
  }

  return data
}

// Start or reopen a conversation about a published product.
router.post('/conversations/start', async (req: Request, res: Response) => {
  try {
    const wallet = await authenticateWallet(req.body ?? {})
    const productId = req.body?.productId

    if (
      typeof productId !== 'string' ||
      !productId.trim() ||
      productId.length > 100
    ) {
      sendError(res, 400, 'A valid product ID is required.')
      return
    }

    const supabase = getSupabaseClient()

    const { data: product, error: productError } = await supabase
      .from(PRODUCTS_TABLE)
      .select('id, seller_wallet, status')
      .eq('id', productId)
      .eq('status', 'published')
      .maybeSingle()

    if (productError) {
      sendError(res, 500, 'Could not find the product.')
      return
    }

    if (!product) {
      sendError(res, 404, 'This product is no longer available.')
      return
    }

    if (product.seller_wallet === wallet) {
      sendError(res, 400, 'You cannot message yourself about your own product.')
      return
    }

    const { data: conversation, error: conversationError } = await supabase
      .from(CONVERSATIONS_TABLE)
      .upsert(
        {
          buyer_wallet: wallet,
          seller_wallet: product.seller_wallet,
          product_id: String(product.id),
          updated_at: new Date().toISOString(),
        },
        {
          onConflict: 'buyer_wallet,seller_wallet,product_id',
        },
      )
      .select()
      .single()

    if (conversationError) {
      console.error('Conversation creation failed:', conversationError.message)
      sendError(res, 500, 'Could not start this conversation.')
      return
    }

    res.json({
      success: true,
      conversation,
    })
  } catch (error) {
    const message =
      error instanceof Error ? error.message : 'Could not start conversation.'

    sendError(res, getErrorStatus(message), message)
  }
})

// List conversations for the authenticated wallet.
router.post('/conversations/list', async (req: Request, res: Response) => {
  try {
    const wallet = await authenticateWallet(req.body ?? {})
    const supabase = getSupabaseClient()

    const { data, error } = await supabase
      .from(CONVERSATIONS_TABLE)
      .select('*')
      .or(`buyer_wallet.eq.${wallet},seller_wallet.eq.${wallet}`)
      .order('updated_at', { ascending: false })

    if (error) {
      sendError(res, 500, 'Could not load your conversations.')
      return
    }

    res.json({
      success: true,
      conversations: data ?? [],
    })
  } catch (error) {
    const message =
      error instanceof Error ? error.message : 'Could not load conversations.'

    sendError(res, getErrorStatus(message), message)
  }
})

// Retrieve messages after verifying conversation membership.
router.post(
  '/conversations/:conversationId/list',
  async (req: Request, res: Response) => {
    try {
      const wallet = await authenticateWallet(req.body ?? {})
      const conversation = await getConversationForParticipant(
        req.params.conversationId,
        wallet,
      )

      const supabase = getSupabaseClient()

      const { data, error } = await supabase
        .from(MESSAGES_TABLE)
        .select('id, conversation_id, sender_wallet, body, created_at')
        .eq('conversation_id', conversation.id)
        .order('created_at', { ascending: true })
        .limit(200)

      if (error) {
        sendError(res, 500, 'Could not load messages.')
        return
      }

      res.json({
        success: true,
        messages: data ?? [],
      })
    } catch (error) {
      const message =
        error instanceof Error ? error.message : 'Could not load messages.'

      sendError(res, getErrorStatus(message), message)
    }
  },
)

// Send a message as the authenticated wallet.
router.post(
  '/conversations/:conversationId/send',
  async (req: Request, res: Response) => {
    try {
      const wallet = await authenticateWallet(req.body ?? {})
      const conversation = await getConversationForParticipant(
        req.params.conversationId,
        wallet,
      )

      const body = req.body?.body

      if (typeof body !== 'string' || !body.trim() || body.length > 5000) {
        sendError(res, 400, 'Messages must contain 1–5000 characters.')
        return
      }

      const supabase = getSupabaseClient()

      const { data: message, error } = await supabase
        .from(MESSAGES_TABLE)
        .insert({
          conversation_id: conversation.id,
          sender_wallet: wallet,
          body: body.trim(),
        })
        .select()
        .single()

      if (error) {
        console.error('Message insert failed:', error.message)
        sendError(res, 500, 'Could not send your message.')
        return
      }

      const { error: updateError } = await supabase
        .from(CONVERSATIONS_TABLE)
        .update({ updated_at: new Date().toISOString() })
        .eq('id', conversation.id)

      if (updateError) {
        console.error('Conversation timestamp update failed:', updateError.message)
      }

      res.status(201).json({
        success: true,
        message,
      })
    } catch (error) {
      const message =
        error instanceof Error ? error.message : 'Could not send message.'

      sendError(res, getErrorStatus(message), message)
    }
  },
)

export default router
