import { createHash, randomBytes } from 'node:crypto'
import express, { type NextFunction, type Request, type Response } from 'express'
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

// ---------------------------------------------------------------------------
// Live chat: sign in once, then chat freely (WhatsApp-style messaging screen)
// ---------------------------------------------------------------------------

const SESSIONS_TABLE = 'solmart_message_sessions'
const PROFILES_TABLE = 'solmart_seller_profiles'
const CHAT_SESSION_HOURS = 24
const MAX_CHAT_MESSAGES_PER_MINUTE = 30
const CHAT_COLUMNS = 'id, conversation_id, sender_wallet, body, created_at, read_at'

function hashToken(token: string) {
  return createHash('sha256').update(token).digest('hex')
}

function chatFail(res: Response, error: unknown, fallback: string) {
  const message = error instanceof Error ? error.message : fallback

  const status = message.includes('not found')
    ? 404
    : message.includes('not a participant')
      ? 403
      : getErrorStatus(message)

  sendError(res, status, message)
}

async function requireChatSession(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  const header = req.headers.authorization ?? ''
  const token = header.startsWith('Bearer ') ? header.slice(7).trim() : ''

  if (!token || token.length > 200) {
    sendError(res, 401, 'Please sign in to your messages.')
    return
  }

  try {
    const { data, error } = await getSupabaseClient()
      .from(SESSIONS_TABLE)
      .select('wallet_address, expires_at')
      .eq('token_hash', hashToken(token))
      .maybeSingle()

    if (error) {
      throw new Error(error.message)
    }

    if (!data || new Date(data.expires_at).getTime() <= Date.now()) {
      sendError(res, 401, 'Your messaging session expired. Please sign in again.')
      return
    }

    res.locals.wallet = String(data.wallet_address)
    next()
  } catch (error) {
    console.error(
      'Chat session check failed:',
      error instanceof Error ? error.message : 'Unknown error',
    )
    sendError(res, 500, 'Could not check your messaging session.')
  }
}

// Turns raw conversation rows into what the chat screen needs: the other
// person's profile, the product, the last message and the unread count.
async function describeConversations(
  conversations: Array<Record<string, any>>,
  wallet: string,
  includeEmpty: boolean,
) {
  if (conversations.length === 0) {
    return []
  }

  const supabase = getSupabaseClient()
  const ids = conversations.map((conversation) => conversation.id)
  const productIds = Array.from(
    new Set(conversations.map((conversation) => String(conversation.product_id))),
  )
  const otherWallets = Array.from(
    new Set(
      conversations.map((conversation) =>
        conversation.buyer_wallet === wallet
          ? conversation.seller_wallet
          : conversation.buyer_wallet,
      ),
    ),
  )

  const [messagesResult, productsResult, profilesResult] = await Promise.all([
    supabase
      .from(MESSAGES_TABLE)
      .select(CHAT_COLUMNS)
      .in('conversation_id', ids)
      .order('created_at', { ascending: false })
      .limit(1000),
    supabase
      .from(PRODUCTS_TABLE)
      .select('id, name, price, currency, image_urls')
      .in('id', productIds),
    supabase
      .from(PROFILES_TABLE)
      .select('seller_wallet, full_name, username, profile_image_url')
      .in('seller_wallet', otherWallets),
  ])

  if (messagesResult.error) {
    throw new Error('Could not load your messages.')
  }

  const lastByConversation = new Map<string, Record<string, any>>()
  const unreadByConversation = new Map<string, number>()

  // Newest first, so the first message we see per conversation is the last one.
  for (const message of messagesResult.data ?? []) {
    const key = String(message.conversation_id)

    if (!lastByConversation.has(key)) {
      lastByConversation.set(key, message)
    }

    if (message.sender_wallet !== wallet && !message.read_at) {
      unreadByConversation.set(key, (unreadByConversation.get(key) ?? 0) + 1)
    }
  }

  const productById = new Map(
    (productsResult.data ?? []).map((product) => [String(product.id), product]),
  )
  const profileByWallet = new Map(
    (profilesResult.data ?? []).map((profile) => [
      String(profile.seller_wallet),
      profile,
    ]),
  )

  return conversations
    .filter(
      (conversation) =>
        includeEmpty || lastByConversation.has(String(conversation.id)),
    )
    .map((conversation) => {
      const key = String(conversation.id)
      const other =
        conversation.buyer_wallet === wallet
          ? conversation.seller_wallet
          : conversation.buyer_wallet
      const product = productById.get(String(conversation.product_id))
      const profile = profileByWallet.get(String(other))
      const last = lastByConversation.get(key)

      return {
        id: key,
        productId: String(conversation.product_id),
        product: product
          ? {
              id: String(product.id),
              name: String(product.name ?? ''),
              price: Number(product.price) || 0,
              currency: String(product.currency ?? 'SOL'),
              image:
                Array.isArray(product.image_urls) &&
                typeof product.image_urls[0] === 'string'
                  ? (product.image_urls[0] as string)
                  : null,
            }
          : null,
        other: {
          wallet: String(other),
          name: profile?.full_name ?? null,
          username: profile?.username ?? null,
          image: profile?.profile_image_url ?? null,
        },
        lastMessage: last
          ? {
              body: String(last.body),
              senderWallet: String(last.sender_wallet),
              createdAt: String(last.created_at),
              readAt: last.read_at ?? null,
            }
          : null,
        unread: unreadByConversation.get(key) ?? 0,
        updatedAt: String(conversation.updated_at ?? ''),
      }
    })
    .sort((a, b) => {
      const aTime = Date.parse(a.lastMessage?.createdAt ?? a.updatedAt) || 0
      const bTime = Date.parse(b.lastMessage?.createdAt ?? b.updatedAt) || 0

      return bTime - aTime
    })
}

// Verifies the wallet signature ONCE and returns a 24 hour messaging session.
router.post('/session', async (req: Request, res: Response) => {
  try {
    const wallet = String(req.body?.walletAddress ?? '').trim()

    try {
      new PublicKey(wallet)
    } catch {
      sendError(res, 400, 'A valid wallet address is required.')
      return
    }

    const token = randomBytes(32).toString('hex')
    const expiresAt = new Date(Date.now() + CHAT_SESSION_HOURS * 3_600_000)

    const { error } = await getSupabaseClient().from(SESSIONS_TABLE).insert({
      token_hash: hashToken(token),
      wallet_address: wallet,
      expires_at: expiresAt.toISOString(),
    })

    if (error) {
      console.error('Chat session create failed:', error.message)
      sendError(res, 500, 'Could not start your messaging session.')
      return
    }

    res.json({
      success: true,
      token,
      walletAddress: wallet,
      expiresAt: expiresAt.toISOString(),
    })
  } catch (error) {
    chatFail(res, error, 'Could not sign you in to messaging.')
  }
})

// Conversation list (only chats that have at least one message).
router.get('/inbox', requireChatSession, async (_req: Request, res: Response) => {
  try {
    const wallet = String(res.locals.wallet)

    const { data, error } = await getSupabaseClient()
      .from(CONVERSATIONS_TABLE)
      .select('*')
      .or(`buyer_wallet.eq.${wallet},seller_wallet.eq.${wallet}`)
      .order('updated_at', { ascending: false })
      .limit(100)

    if (error) {
      throw new Error('Could not load your conversations.')
    }

    res.set('Cache-Control', 'no-store')
    res.json({
      success: true,
      conversations: await describeConversations(data ?? [], wallet, false),
    })
  } catch (error) {
    chatFail(res, error, 'Could not load your conversations.')
  }
})

// Total unread messages (for the badge on the Messages tab).
router.get('/unread', requireChatSession, async (_req: Request, res: Response) => {
  try {
    const wallet = String(res.locals.wallet)
    const supabase = getSupabaseClient()

    const { data: conversations, error } = await supabase
      .from(CONVERSATIONS_TABLE)
      .select('id')
      .or(`buyer_wallet.eq.${wallet},seller_wallet.eq.${wallet}`)
      .limit(200)

    if (error) {
      throw new Error('Could not check your messages.')
    }

    const ids = (conversations ?? []).map((conversation) => conversation.id)

    if (ids.length === 0) {
      res.json({ success: true, unread: 0 })
      return
    }

    const { count, error: countError } = await supabase
      .from(MESSAGES_TABLE)
      .select('id', { count: 'exact', head: true })
      .in('conversation_id', ids)
      .neq('sender_wallet', wallet)
      .is('read_at', null)

    if (countError) {
      throw new Error('Could not check your messages.')
    }

    res.set('Cache-Control', 'no-store')
    res.json({ success: true, unread: count ?? 0 })
  } catch (error) {
    chatFail(res, error, 'Could not check your messages.')
  }
})

// Start (or reopen) a chat with a seller about a product.
router.post('/start', requireChatSession, async (req: Request, res: Response) => {
  try {
    const wallet = String(res.locals.wallet)
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

    const findExisting = () =>
      supabase
        .from(CONVERSATIONS_TABLE)
        .select('*')
        .eq('buyer_wallet', wallet)
        .eq('seller_wallet', product.seller_wallet)
        .eq('product_id', String(product.id))
        .maybeSingle()

    const { data: existing, error: existingError } = await findExisting()

    if (existingError) {
      sendError(res, 500, 'Could not start this conversation.')
      return
    }

    let conversation = existing

    if (!conversation) {
      const { data: created, error: createError } = await supabase
        .from(CONVERSATIONS_TABLE)
        .insert({
          buyer_wallet: wallet,
          seller_wallet: product.seller_wallet,
          product_id: String(product.id),
          updated_at: new Date().toISOString(),
        })
        .select()
        .single()

      if (createError || !created) {
        // Two quick taps can race to create the same chat; reuse the winner.
        const { data: raced } = await findExisting()

        if (!raced) {
          console.error('Conversation creation failed:', createError?.message)
          sendError(res, 500, 'Could not start this conversation.')
          return
        }

        conversation = raced
      } else {
        conversation = created
      }
    }

    const [item] = await describeConversations([conversation], wallet, true)

    res.json({ success: true, conversation: item })
  } catch (error) {
    chatFail(res, error, 'Could not start this conversation.')
  }
})

// Messages in a chat. Pass ?after=<time of the newest message you have> to get
// only new ones. Opening a chat marks the other person's messages as read.
router.get(
  '/chat/:conversationId',
  requireChatSession,
  async (req: Request, res: Response) => {
    try {
      const wallet = String(res.locals.wallet)
      const conversation = await getConversationForParticipant(
        req.params.conversationId,
        wallet,
      )

      const supabase = getSupabaseClient()
      const afterRaw = typeof req.query.after === 'string' ? req.query.after : ''
      const after =
        afterRaw && afterRaw.length <= 40 && !Number.isNaN(Date.parse(afterRaw))
          ? afterRaw
          : ''

      let rows: Array<Record<string, any>> = []

      if (after) {
        const { data, error } = await supabase
          .from(MESSAGES_TABLE)
          .select(CHAT_COLUMNS)
          .eq('conversation_id', conversation.id)
          .gt('created_at', after)
          .order('created_at', { ascending: true })
          .limit(200)

        if (error) throw new Error('Could not load messages.')
        rows = data ?? []
      } else {
        const { data, error } = await supabase
          .from(MESSAGES_TABLE)
          .select(CHAT_COLUMNS)
          .eq('conversation_id', conversation.id)
          .order('created_at', { ascending: false })
          .limit(200)

        if (error) throw new Error('Could not load messages.')
        rows = (data ?? []).slice().reverse()
      }

      if (rows.some((m) => m.sender_wallet !== wallet && !m.read_at)) {
        const { error: readError } = await supabase
          .from(MESSAGES_TABLE)
          .update({ read_at: new Date().toISOString() })
          .eq('conversation_id', conversation.id)
          .neq('sender_wallet', wallet)
          .is('read_at', null)

        if (readError) {
          console.error('Marking messages read failed:', readError.message)
        }
      }

      // The newest of MY messages that the other person has already read.
      const { data: readRows } = await supabase
        .from(MESSAGES_TABLE)
        .select('created_at')
        .eq('conversation_id', conversation.id)
        .eq('sender_wallet', wallet)
        .not('read_at', 'is', null)
        .order('created_at', { ascending: false })
        .limit(1)

      res.set('Cache-Control', 'no-store')
      res.json({
        success: true,
        messages: rows,
        readUpTo: readRows?.[0]?.created_at ?? null,
      })
    } catch (error) {
      chatFail(res, error, 'Could not load messages.')
    }
  },
)

router.post(
  '/chat/:conversationId/send',
  requireChatSession,
  async (req: Request, res: Response) => {
    try {
      const wallet = String(res.locals.wallet)
      const conversation = await getConversationForParticipant(
        req.params.conversationId,
        wallet,
      )

      const body = req.body?.body

      if (typeof body !== 'string' || !body.trim() || body.length > 2000) {
        sendError(res, 400, 'Messages must contain 1 to 2000 characters.')
        return
      }

      const supabase = getSupabaseClient()

      const { count } = await supabase
        .from(MESSAGES_TABLE)
        .select('id', { count: 'exact', head: true })
        .eq('sender_wallet', wallet)
        .gte('created_at', new Date(Date.now() - 60_000).toISOString())

      if ((count ?? 0) >= MAX_CHAT_MESSAGES_PER_MINUTE) {
        sendError(res, 429, 'You are sending messages too quickly. Please wait a moment.')
        return
      }

      const { data: message, error } = await supabase
        .from(MESSAGES_TABLE)
        .insert({
          conversation_id: conversation.id,
          sender_wallet: wallet,
          body: body.trim(),
        })
        .select(CHAT_COLUMNS)
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

      res.status(201).json({ success: true, message })
    } catch (error) {
      chatFail(res, error, 'Could not send your message.')
    }
  },
)


export default router
