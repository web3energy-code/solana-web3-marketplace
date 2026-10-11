import { randomUUID, createPublicKey, verify as cryptoVerify } from 'node:crypto'
import express, { type Request, type Response } from 'express'
import multer from 'multer'
import { PublicKey } from '@solana/web3.js'
import nacl from 'tweetnacl'
import { getSupabaseClient } from './services/supabase.js'

const router = express.Router()

const MAX_PHOTOS = 10
const MAX_FILE_SIZE = 5 * 1024 * 1024
const STORAGE_BUCKET = 'solmart-marketplace-images'
const PRODUCTS_TABLE = 'solmart_marketplace_products'
const CHALLENGES_TABLE = 'solmart_wallet_challenges'

const allowedMimeTypes = new Set([
  'image/jpeg',
  'image/png',
  'image/webp',
])

const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    files: MAX_PHOTOS,
    fileSize: MAX_FILE_SIZE,
  },
  fileFilter: (_req, file, callback) => {
    if (!allowedMimeTypes.has(file.mimetype)) {
      callback(new Error('Only JPEG, PNG, and WebP images are allowed.'))
      return
    }

    callback(null, true)
  },
})

function sendError(res: Response, status: number, message: string) {
  res.status(status).json({
    success: false,
    error: message,
  })
}

/**
 * Verify a Solana Ed25519 signature using Node.js crypto.
 * Solana public keys are 32-byte Ed25519 public keys.
 */
function verifySolanaSignature(
  message: Buffer,
  signature: Buffer,
  publicKeyBytes: Uint8Array,
): boolean {
  if (signature.length !== 64 || publicKeyBytes.length !== 32) {
    return false
  }

  // Ed25519 SPKI DER prefix for a raw 32-byte public key.
  const spkiPrefix = Buffer.from('302a300506032b6570032100', 'hex')
  const derPublicKey = Buffer.concat([
    spkiPrefix,
    Buffer.from(publicKeyBytes),
  ])

  const keyObject = createPublicKey({
    key: derPublicKey,
    format: 'der',
    type: 'spki',
  })

  return cryptoVerify(
    null,
    message,
    keyObject,
    signature,
  )
}

async function publishProduct(
  req: Request,
  res: Response,
): Promise<void> {
  const uploadedPaths: string[] = []
  let supabase: ReturnType<typeof getSupabaseClient> | undefined

  try {
    supabase = getSupabaseClient()

    const {
      walletAddress,
      challengeMessage,
      signature,
      name,
      description,
      category,
      condition,
      price,
      currency,
      quantity,
      location,
      coverIndex,
    } = req.body ?? {}

    const files = (req.files as Express.Multer.File[] | undefined) ?? []

    if (
      typeof walletAddress !== 'string' ||
      typeof challengeMessage !== 'string' ||
      typeof signature !== 'string' ||
      typeof name !== 'string' ||
      typeof description !== 'string' ||
      typeof category !== 'string' ||
      typeof condition !== 'string' ||
      typeof location !== 'string' ||
      typeof price !== 'string' ||
      typeof quantity !== 'string' ||
      typeof currency !== 'string'
    ) {
      sendError(res, 400, 'Missing or invalid product fields.')
      return
    }

    if (
      !name.trim() ||
      !description.trim() ||
      !category.trim() ||
      !condition.trim() ||
      !location.trim()
    ) {
      sendError(res, 400, 'Please complete all required product fields.')
      return
    }

    if (name.length > 150 || description.length > 5000) {
      sendError(res, 400, 'Product name or description is too long.')
      return
    }

    if (!['SOL', 'USDC'].includes(currency)) {
      sendError(res, 400, 'Currency must be SOL or USDC.')
      return
    }

    const parsedPrice = Number(price)
    const parsedQuantity = Number(quantity)

    if (!Number.isFinite(parsedPrice) || parsedPrice <= 0) {
      sendError(res, 400, 'Enter a valid price greater than zero.')
      return
    }

    if (!Number.isSafeInteger(parsedQuantity) || parsedQuantity < 1) {
      sendError(res, 400, 'Quantity must be a whole number of at least one.')
      return
    }

    if (files.length < 1) {
      sendError(res, 400, 'Upload at least one product photo.')
      return
    }

    if (files.some((file) => !allowedMimeTypes.has(file.mimetype))) {
      sendError(res, 400, 'One or more product photos have an unsupported format.')
      return
    }

    let publicKey: PublicKey

    try {
      publicKey = new PublicKey(walletAddress)
    } catch {
      sendError(res, 400, 'Invalid Solana wallet address.')
      return
    }

    const normalizedWallet = publicKey.toBase58()

    let signatureBytes: Buffer

    try {
      signatureBytes = Buffer.from(signature, 'base64')
    } catch {
      sendError(res, 400, 'Invalid wallet signature.')
      return
    }

    if (
      signatureBytes.length !== 64 ||
      signatureBytes.toString('base64') !== signature
    ) {
      sendError(res, 400, 'Invalid wallet signature.')
      return
    }

    const messageBytes = Buffer.from(challengeMessage, 'utf8')
    const publicKeyBytes = publicKey.toBytes()

    let naclValid = false
    let cryptoValid = false

    try {
      naclValid = nacl.sign.detached.verify(
        new Uint8Array(messageBytes),
        new Uint8Array(signatureBytes),
        publicKeyBytes,
      )
    } catch (error) {
      console.error(
        'TweetNaCl verification error:',
        error instanceof Error ? error.message : 'Unknown error',
      )
    }

    try {
      cryptoValid = verifySolanaSignature(
        messageBytes,
        signatureBytes,
        publicKeyBytes,
      )
    } catch (error) {
      console.error(
        'Node crypto verification error:',
        error instanceof Error ? error.message : 'Unknown error',
      )
    }

    console.log('Wallet signature verification diagnostic:', {
      walletAddress: normalizedWallet,
      messageLength: messageBytes.length,
      signatureLength: signatureBytes.length,
      publicKeyLength: publicKeyBytes.length,
      naclValid,
      cryptoValid,
    })

    if (!naclValid && !cryptoValid) {
      sendError(res, 401, 'Wallet signature verification failed.')
      return
    }

    const { data: challenge, error: challengeError } = await supabase
      .from(CHALLENGES_TABLE)
      .select('id, wallet_address, challenge, expires_at, used_at')
      .eq('wallet_address', normalizedWallet)
      .eq('challenge', challengeMessage)
      .maybeSingle()

    if (challengeError) {
      console.error('Challenge lookup failed:', challengeError.message)
      sendError(res, 500, 'Could not verify wallet challenge.')
      return
    }

    if (!challenge) {
      sendError(res, 401, 'Wallet challenge not found.')
      return
    }

    if (challenge.used_at) {
      sendError(res, 401, 'This wallet challenge has already been used.')
      return
    }

    const now = new Date()

    if (new Date(challenge.expires_at).getTime() <= now.getTime()) {
      sendError(res, 401, 'Wallet challenge has expired. Please try again.')
      return
    }

    const { data: consumedChallenge, error: consumeError } = await supabase
      .from(CHALLENGES_TABLE)
      .update({ used_at: now.toISOString() })
      .eq('id', challenge.id)
      .is('used_at', null)
      .gt('expires_at', now.toISOString())
      .select('id')
      .maybeSingle()

    if (consumeError) {
      console.error('Challenge consumption failed:', consumeError.message)
      sendError(res, 500, 'Could not complete wallet verification.')
      return
    }

    if (!consumedChallenge) {
      sendError(
        res,
        401,
        'Wallet challenge expired or was already used. Please try again.',
      )
      return
    }

    const imageUrls: string[] = []

    for (const file of files) {
      const safeExtension =
        file.mimetype === 'image/jpeg'
          ? 'jpg'
          : file.mimetype === 'image/png'
            ? 'png'
            : 'webp'

      const storagePath =
        `${normalizedWallet}/${randomUUID()}.${safeExtension}`

      const { error: storageError } = await supabase.storage
        .from(STORAGE_BUCKET)
        .upload(storagePath, file.buffer, {
          contentType: file.mimetype,
          upsert: false,
        })

      if (storageError) {
        console.error('Product image upload failed:', storageError.message)
        throw new Error('Could not upload product photos.')
      }

      uploadedPaths.push(storagePath)

      const { data: publicUrlData } = supabase.storage
        .from(STORAGE_BUCKET)
        .getPublicUrl(storagePath)

      imageUrls.push(publicUrlData.publicUrl)
    }

    const parsedCoverIndex =
      coverIndex === undefined || coverIndex === ''
        ? 0
        : Number(coverIndex)

    if (
      !Number.isInteger(parsedCoverIndex) ||
      parsedCoverIndex < 0 ||
      parsedCoverIndex >= imageUrls.length
    ) {
      throw new Error('Invalid cover photo selection.')
    }

    const orderedImageUrls = [...imageUrls]
    const [coverUrl] = orderedImageUrls.splice(parsedCoverIndex, 1)
    orderedImageUrls.unshift(coverUrl)

    const { data: product, error: productError } = await supabase
      .from(PRODUCTS_TABLE)
      .insert({
        seller_wallet: normalizedWallet,
        name: name.trim(),
        description: description.trim(),
        category: category.trim(),
        condition: condition.trim(),
        price: parsedPrice,
        currency,
        quantity: parsedQuantity,
        location: location.trim(),
        image_urls: orderedImageUrls,
        status: 'published',
      })
      .select()
      .single()

    if (productError) {
      console.error('Product database insert failed:', productError.message)
      throw new Error('Could not save your product.')
    }

    res.status(201).json({
      success: true,
      message: 'Product published successfully.',
      product,
    })
  } catch (error) {
    console.error(
      'Product publishing failed:',
      error instanceof Error ? error.message : 'Unknown error',
    )

    if (supabase && uploadedPaths.length > 0) {
      const { error: cleanupError } = await supabase.storage
        .from(STORAGE_BUCKET)
        .remove(uploadedPaths)

      if (cleanupError) {
        console.error('Image cleanup failed:', cleanupError.message)
      }
    }

    sendError(
      res,
      500,
      error instanceof Error
        ? error.message
        : 'Could not publish your product.',
    )
  }
}

router.post('/', (req: Request, res: Response) => {
  upload.array('photos', MAX_PHOTOS)(
    req,
    res,
    (uploadError: unknown) => {
      if (uploadError) {
        const message =
          uploadError instanceof Error
            ? uploadError.message
            : 'Photo upload failed.'

        sendError(res, 400, message)
        return
      }

      void publishProduct(req, res)
    },
  )
})

export default router
