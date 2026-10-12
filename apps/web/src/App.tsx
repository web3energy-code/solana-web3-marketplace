import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { WalletMultiButton } from '@solana/wallet-adapter-react-ui'
import { useWallet } from '@solana/wallet-adapter-react'
import SellPage from './pages/SellPage'
import {
  Search,
  ShoppingCart,
  Heart,
  MapPin,
  Plus,
  Minus,
  X,
  ArrowRight,
  Package,
  ShieldCheck,
  Truck,
  Store,
  Home,
  MessageCircle,
  User,
  Tag,
} from 'lucide-react'

type Page =
  | 'marketplace'
  | 'sell'
  | 'messages'
  | 'profile'
  | 'wishlist'
  | 'product-details'

type SellerProfile = {
  seller_wallet: string
  full_name: string
  username: string | null
  profile_image_url: string | null
  location: string
  bio: string
  seller_type: 'individual' | 'business'
  created_at?: string
  updated_at?: string
}

type Product = {
  id: string | number
  name: string
  description: string
  category: string
  condition: string
  price: number
  currency: 'SOL' | 'USDC'
  quantity: number
  location: string
  image_urls: string[]
  seller_wallet: string
  status: string
  created_at?: string
}

const API_URL = 'https://solana-web3-marketplace-3et8.vercel.app'
const PRODUCT_REFRESH_INTERVAL = 15_000

const categories = [
  'All products',
  'Electronics',
  'Fashion',
  'Beauty',
  'Accessories',
]

const money = (amount: number, currency: string) =>
  `${amount.toLocaleString('en-US', {
    maximumFractionDigits: 8,
  })} ${currency}`

export default function App() {
  const { publicKey, connected, signMessage } = useWallet()

  // Seller profile state
  const [sellerProfile, setSellerProfile] =
    useState<SellerProfile | null>(null)

  const [profileFullName, setProfileFullName] = useState('')
  const [profileUsername, setProfileUsername] = useState('')
  const [profileImageUrl, setProfileImageUrl] = useState('')
  const [profileImageFile, setProfileImageFile] =
  useState<File | null>(null)

  const [profileImagePreview, setProfileImagePreview] =
  useState('')
  const [profileImageUploading, setProfileImageUploading] =
  useState(false)

  const profileImageInputRef = useRef<HTMLInputElement>(null)
  const [profileLocation, setProfileLocation] = useState('')
  const [profileBio, setProfileBio] = useState('')
  const [profileSellerType, setProfileSellerType] =
    useState<'individual' | 'business'>('individual')

  const [profileLoading, setProfileLoading] = useState(false)
  const [profileSaving, setProfileSaving] = useState(false)
  const [profileMessage, setProfileMessage] = useState('')
  const [profileError, setProfileError] = useState('')

  // Load the connected seller's saved profile.
useEffect(() => {
  if (!connected || !publicKey) {
    setSellerProfile(null)
    setProfileFullName('')
    setProfileUsername('')
    setProfileImageUrl('')
    setProfileImageFile(null)
    setProfileImagePreview((previous) => {
 if (previous.startsWith('blob:')) {
   URL.revokeObjectURL(previous)
  }
  return ''
})
    setProfileLocation('')
    setProfileBio('')
    setProfileSellerType('individual')
    return
  }

  let cancelled = false

  async function loadSellerProfile() {
    setProfileLoading(true)
    setProfileError('')

    try {
      const walletAddress = publicKey!.toBase58()

      const response = await fetch(
        `${API_URL}/seller-profiles/${encodeURIComponent(walletAddress)}`,
      )

      const result = await response.json()

      if (!response.ok || !result.success) {
        throw new Error(
          result.error || 'Could not load your seller profile.',
        )
      }

      if (cancelled) return

      const profile = result.profile as SellerProfile | null

      setSellerProfile(profile)
      setProfileFullName(profile?.full_name ?? '')
      setProfileUsername(profile?.username ?? '')
      setProfileImageUrl(profile?.profile_image_url ?? '')
      setProfileLocation(profile?.location ?? '')
      setProfileBio(profile?.bio ?? '')
      setProfileSellerType(profile?.seller_type ?? 'individual')
    } catch (error) {
      if (!cancelled) {
        setProfileError(
          error instanceof Error
            ? error.message
            : 'Could not load your seller profile.',
        )
      }
    } finally {
      if (!cancelled) {
        setProfileLoading(false)
      }
    }
  }

  void loadSellerProfile()

  return () => {
    cancelled = true
  }
}, [connected, publicKey])

// Save the seller profile after wallet verification.
  function handleProfileImageChange(
    event: React.ChangeEvent<HTMLInputElement>,
  ) {
  const file = event.target.files?.[0]

    if (!file) return
    
    if (!file.type.startsWith('image/')) {
      setProfileError('Please select an image file.')
      event.target.value = ''
      return
    }
   
    if (file.size > 5 * 1024 * 1024) {
      setProfileError('Your profile picture must be 5 MB or smaller.')
      event.target.value = ''
      return
    }
    setProfileError('')
    setProfileImageFile(file)

    const previewUrl = URL.createObjectURL(file)
    setProfileImagePreview((previous) => {
      if (previous.startsWith('blob:')) {
        URL.revokeObjectURL(previous)
      }
  
      return previewUrl
   })

 }

// Save the seller profile after wallet verification.
    async function saveSellerProfile() {
  if (!connected || !publicKey || !signMessage) {
    setProfileError(
      'Connect a wallet that supports message signing before saving your profile.',
    )
    return
  }

  setProfileSaving(true)
  setProfileError('')
  setProfileMessage('')

  try {
    const walletAddress = publicKey.toBase58()
    let finalProfileImageUrl = profileImageUrl

    // Upload a newly selected profile picture first.
    if (profileImageFile) {
      setProfileImageUploading(true)

      try {
        // Request a fresh challenge for the image upload.
        const uploadChallengeResponse = await fetch(
          `${API_URL}/wallet/challenge`,
          {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              walletAddress,
              purpose: 'seller_profile',
            }),
          },
        )

        const uploadChallengeResult =
          await uploadChallengeResponse.json()

        if (
          !uploadChallengeResponse.ok ||
          !uploadChallengeResult.success
        ) {
          throw new Error(
            uploadChallengeResult.error ||
              'Could not verify your wallet for image upload.',
          )
        }

        // Sign the upload challenge.
        const uploadMessageBytes = new TextEncoder().encode(
          uploadChallengeResult.message,
        )

        const uploadSignature = await signMessage(
          uploadMessageBytes,
        )

        let uploadBinarySignature = ''

        for (const byte of uploadSignature) {
          uploadBinarySignature += String.fromCharCode(byte)
        }

        const uploadSignatureBase64 = btoa(
          uploadBinarySignature,
        )

        // Send the image and wallet verification details.
        const formData = new FormData()

        formData.append('image', profileImageFile)
        formData.append('walletAddress', walletAddress)
        formData.append(
          'challengeMessage',
          uploadChallengeResult.message,
        )
        formData.append('signature', uploadSignatureBase64)

        const uploadResponse = await fetch(
          `${API_URL}/seller-profiles/image`,
          {
            method: 'POST',
            body: formData,
          },
        )

        const uploadResult = await uploadResponse.json()

        if (!uploadResponse.ok || !uploadResult.success) {
          throw new Error(
            uploadResult.error ||
              'Could not upload your profile picture.',
          )
        }

        if (typeof uploadResult.imageUrl !== 'string') {
          throw new Error(
            'The server did not return a valid profile image URL.',
          )
        }

        finalProfileImageUrl = uploadResult.imageUrl
        setProfileImageUrl(finalProfileImageUrl)
      } finally {
        setProfileImageUploading(false)
      }
    }

    // Request a separate challenge to save the seller profile.
    const challengeResponse = await fetch(
      `${API_URL}/wallet/challenge`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          walletAddress,
          purpose: 'seller_profile',
        }),
      },
    )

    const challengeResult = await challengeResponse.json()

    if (!challengeResponse.ok || !challengeResult.success) {
      throw new Error(
        challengeResult.error ||
          'Could not verify your wallet to save your profile.',
      )
    }

    // Sign the profile-saving challenge.
    const messageBytes = new TextEncoder().encode(
      challengeResult.message,
    )

    const signature = await signMessage(messageBytes)

    let binarySignature = ''

    for (const byte of signature) {
      binarySignature += String.fromCharCode(byte)
    }

    const signatureBase64 = btoa(binarySignature)

    // Save the profile, including the uploaded image URL.
    const saveResponse = await fetch(
      `${API_URL}/seller-profiles`,
      {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          walletAddress,
          challengeMessage: challengeResult.message,
          signature: signatureBase64,
          full_name: profileFullName,
          username: profileUsername,
          profile_image_url: finalProfileImageUrl,
          location: profileLocation,
          bio: profileBio,
          seller_type: profileSellerType,
        }),
      },
    )

    const saveResult = await saveResponse.json()

    if (!saveResponse.ok || !saveResult.success) {
      throw new Error(
        saveResult.error || 'Could not save your seller profile.',
      )
    }

    setSellerProfile(saveResult.profile)
    setProfileImageFile(null)
    setProfileMessage(
      'Your seller profile has been saved successfully.',
    )
  } catch (error) {
    setProfileError(
      error instanceof Error
        ? error.message
        : 'Could not save your seller profile.',
    )
  } finally {
    setProfileSaving(false)
  }
}

  const [activePage, setActivePage] = useState<Page>('marketplace')
  const [search, setSearch] = useState('')
  const [category, setCategory] = useState('All products')
  const [cart, setCart] = useState<Record<string, number>>({})
  const [showCart, setShowCart] = useState(false)
  const [notice, setNotice] = useState('')
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null)
  const [wishlist, setWishlist] = useState<string[]>(() => {
  try {
    const saved = localStorage.getItem('solmart-wishlist')
    return saved ? JSON.parse(saved) : []
  } catch {
    return []
  }
})

  const [products, setProducts] = useState<Product[]>([])
  const [loadingProducts, setLoadingProducts] = useState(true)
  const [productsError, setProductsError] = useState('')
  const [lastProductsUpdate, setLastProductsUpdate] = useState(0)

  const requestInProgress = useRef(false)
  const mounted = useRef(false)

  const loadProducts = useCallback(async (initialLoad = false) => {
    if (requestInProgress.current) return

    requestInProgress.current = true

    if (initialLoad) {
      setLoadingProducts(true)
    }

    try {
      const response = await fetch(`${API_URL}/products`, {
        method: 'GET',
        headers: {
          Accept: 'application/json',
        },
        cache: 'no-store',
      })

      if (!response.ok) {
        throw new Error(
          `Could not load products. Server returned ${response.status}.`,
        )
      }

      const result = await response.json()

      if (!result.success || !Array.isArray(result.products)) {
        throw new Error(
          'The marketplace returned an invalid response.',
        )
      }

      const publishedProducts = result.products.filter(
        (product: Product) =>
          product &&
          product.status === 'published' &&
          product.id !== undefined &&
          product.id !== null,
      )

      if (!mounted.current) return

      setProducts(publishedProducts)
      setProductsError('')
      setLastProductsUpdate(Date.now())
    } catch (error) {
      if (!mounted.current) return

      const message =
        error instanceof Error
          ? error.message
          : 'Could not load published products.'

      setProductsError(message)
    } finally {
      requestInProgress.current = false

      if (mounted.current && initialLoad) {
        setLoadingProducts(false)
      }
    }
  }, [])

  useEffect(() => {
    mounted.current = true

    void loadProducts(true)

    const refreshInterval = window.setInterval(() => {
      if (document.visibilityState === 'visible') {
        void loadProducts(false)
      }
    }, PRODUCT_REFRESH_INTERVAL)

    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        void loadProducts(false)
      }
    }

    const handleWindowFocus = () => {
      void loadProducts(false)
    }

    document.addEventListener(
      'visibilitychange',
      handleVisibilityChange,
    )
    window.addEventListener('focus', handleWindowFocus)
    window.addEventListener('pageshow', handleWindowFocus)

    return () => {
      mounted.current = false
      window.clearInterval(refreshInterval)

      document.removeEventListener(
        'visibilitychange',
        handleVisibilityChange,
      )
      window.removeEventListener('focus', handleWindowFocus)
      window.removeEventListener('pageshow', handleWindowFocus)
    }
  }, [loadProducts])

  useEffect(() => {
    if (activePage === 'marketplace') {
      void loadProducts(false)
    }
  }, [activePage, loadProducts])

  const filtered = useMemo(() => {
    const query = search.trim().toLowerCase()

    return products.filter((product) => {
      const productCategory = String(product.category || '').toLowerCase()
      const productName = String(product.name || '').toLowerCase()
      const sellerWallet = String(product.seller_wallet || '').toLowerCase()
      const location = String(product.location || '').toLowerCase()

      const matchesCategory =
        category === 'All products' ||
        productCategory === category.toLowerCase()

      const matchesSearch =
        !query ||
        productName.includes(query) ||
        sellerWallet.includes(query) ||
        location.includes(query) ||
        productCategory.includes(query)

      return matchesCategory && matchesSearch
    })
  }, [products, search, category])

  const cartCount = Object.values(cart).reduce(
    (total, quantity) => total + quantity,
    0,
  )

  const cartItems = products.filter((product) => cart[String(product.id)])

const cartCurrencies = [
  ...new Set(cartItems.map((product) => product.currency)),
]

useEffect(() => {
  localStorage.setItem('solmart-wishlist', JSON.stringify(wishlist))
}, [wishlist])

function toggleWishlist(productId: string | number) {
  const id = String(productId)

  setWishlist((previous) =>
    previous.includes(id)
      ? previous.filter((savedId) => savedId !== id)
      : [...previous, id],
  )
}

function showNotice(message: string) {
  setNotice(message)
  window.setTimeout(() => setNotice(''), 3500)
}

function addToCart(id: string | number) {
  const product = products.find(
    (item) => String(item.id) === String(id),
  )

  if (!product) {
    showNotice('Product not found. Please refresh the marketplace.')
    return
  }

  const key = String(product.id)
  const currentQuantity = cart[key] || 0

  if (currentQuantity >= product.quantity) {
    showNotice('You have reached the available quantity.')
    return
  }

  setCart((previous) => ({
    ...previous,
    [key]: (previous[key] || 0) + 1,
  }))

  showNotice(`${product.name} added to your cart.`)
}

  function changeQuantity(id: string | number, amount: number) {
    setCart((previous) => {
      const key = String(id)
      const next = { ...previous }
      const quantity = (next[key] || 0) + amount

      if (quantity <= 0) {
        delete next[key]
      } else {
        next[key] = quantity
      }

      return next
    })
  }

  function navigate(page: Page) {
    setActivePage(page)
    setNotice('')

    if (page === 'marketplace') {
      void loadProducts(false)
    }

    window.scrollTo({
      top: 0,
      behavior: 'auto',
    })
  }

  return (
    <div className="app">
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;600;700&family=Manrope:wght@400;500;600;700;800&display=swap');

        * { box-sizing: border-box; }

        body {
          margin: 0;
          font-family: 'DM Sans', sans-serif;
          color: #20251f;
          background: #fff;
        }

        button, input, select, textarea { font: inherit; }
        button { cursor: pointer; }

        .app { min-height: 100vh; padding-bottom: 82px; }

        .topline {
          background: #173d2c;
          color: #fff;
          text-align: center;
          padding: 10px 12px;
          font-size: 12px;
          letter-spacing: .2px;
        }

        .topline b { color: #d5f27b; }

        .header {
          border-bottom: 1px solid #eceee9;
          position: sticky;
          top: 0;
          background: #fff;
          z-index: 10;
        }

        .headinner {
          max-width: 1200px;
          margin: auto;
          padding: 17px 24px;
          display: flex;
          align-items: center;
          gap: 18px;
        }

        .logo {
          display: flex;
          align-items: center;
          gap: 9px;
          font-family: Manrope, sans-serif;
          font-size: 23px;
          font-weight: 800;
          letter-spacing: -1px;
          white-space: nowrap;
        }

        .logoicon {
          background: #b9ed65;
          color: #173d2c;
          width: 35px;
          height: 35px;
          display: grid;
          place-items: center;
          border-radius: 11px;
        }

        .searchbox { flex: 1; position: relative; min-width: 0; }

        .searchbox input {
          width: 100%;
          padding: 13px 16px 13px 43px;
          border: 1px solid #e5e8e1;
          border-radius: 11px;
          background: #f8f9f6;
          outline: none;
          font-size: 13px;
        }

        .searchbox input:focus { border-color: #87b94a; }

        .searchicon {
          position: absolute;
          left: 14px;
          top: 13px;
          color: #72786f;
        }

        .headbtn {
          background: #fff;
          border: 1px solid #e7e9e4;
          border-radius: 9px;
          padding: 9px 10px;
          display: flex;
          gap: 7px;
          align-items: center;
          color: #252a24;
          font-size: 12px;
          flex-shrink: 0;
        }

        .cartbtn { position: relative; }

        .badge {
          background: #b9ed65;
          color: #173d2c;
          border-radius: 20px;
          min-width: 19px;
          height: 19px;
          display: grid;
          place-items: center;
          font-size: 10px;
          font-weight: 800;
        }

        .wallet-button {
          display: flex;
          align-items: center;
          justify-content: flex-end;
          flex-shrink: 0;
          margin-left: auto;
        }

        .wallet-button .wallet-adapter-dropdown {
          display: flex;
          align-items: center;
        }

        .wallet-button .wallet-adapter-button {
          background: #173d2c !important;
          color: #fff !important;
          height: 30px !important;
          min-height: 30px !important;
          min-width: 0 !important;
          padding: 0 9px !important;
          border-radius: 7px !important;
          font-family: 'DM Sans', sans-serif !important;
          font-size: 10px !important;
          font-weight: 600 !important;
          line-height: 30px !important;
          white-space: nowrap !important;
        }

        .wallet-button .wallet-adapter-button:not([disabled]):hover {
          background: #28583d !important;
        }

        .wallet-button .wallet-adapter-button-start-icon {
          width: 13px !important;
          height: 13px !important;
          margin-right: 4px !important;
        }

        .locationbar {
          border-bottom: 1px solid #eceee9;
          padding: 10px 24px;
          color: #656c62;
          font-size: 12px;
        }

        .locationinner {
          max-width: 1152px;
          margin: auto;
          display: flex;
          align-items: center;
          gap: 7px;
        }

        .hero {
          max-width: 1200px;
          margin: 25px auto 0;
          padding: 0 24px;
        }

        .herobox {
          background: #173d2c;
          color: white;
          border-radius: 22px;
          min-height: 330px;
          padding: 48px 52px;
          display: flex;
          position: relative;
          overflow: hidden;
          align-items: center;
        }

        .herotext { position: relative; z-index: 1; max-width: 560px; }

        .eyebrow {
          color: #c9ef88;
          font-size: 11px;
          font-weight: 700;
          text-transform: uppercase;
          letter-spacing: 2px;
        }

        h1 {
          font-family: Manrope, sans-serif;
          font-size: clamp(32px, 5vw, 55px);
          line-height: 1.1;
          letter-spacing: -2px;
          margin: 16px 0;
        }

        .herotext p {
          color: #d5e0d5;
          font-size: 14px;
          line-height: 1.8;
          max-width: 430px;
        }

        .primary {
          background: #c3f17b;
          color: #173d2c;
          border: 0;
          border-radius: 10px;
          padding: 14px 19px;
          font-weight: 800;
          font-size: 13px;
          display: inline-flex;
          align-items: center;
          gap: 10px;
          margin-top: 15px;
        }

        .heroart {
          position: absolute;
          right: 55px;
          top: 22px;
          width: 300px;
          height: 290px;
          display: grid;
          place-items: center;
        }

        .orbit {
          width: 265px;
          height: 265px;
          border: 1px solid #52715c;
          border-radius: 50%;
          display: grid;
          place-items: center;
          position: relative;
        }

        .orbit:before, .orbit:after {
          content: '';
          position: absolute;
          border: 1px solid #52715c;
          border-radius: 50%;
          inset: 25px;
        }

        .orbit:after { inset: 52px; }

        .bagart {
          font-size: 110px;
          filter: drop-shadow(0 18px 15px #0b2419);
        }

        .floatpill {
          position: absolute;
          background: #fff;
          color: #253528;
          border-radius: 12px;
          padding: 12px 15px;
          box-shadow: 0 12px 35px #102a1d55;
          font-size: 12px;
          font-weight: 700;
        }

        .pillone { right: -5px; top: 42px; }
        .pilltwo { left: -14px; bottom: 37px; }

        .section {
          max-width: 1200px;
          margin: 42px auto;
          padding: 0 24px;
        }

        .sectionhead {
          display: flex;
          justify-content: space-between;
          align-items: end;
          gap: 15px;
          margin-bottom: 21px;
        }

        .sectionhead h2 {
          font-family: Manrope, sans-serif;
          font-size: 25px;
          letter-spacing: -1px;
          margin: 0;
        }

        .sub { font-size: 12px; color: #7b8177; margin-top: 7px; }

        .categories {
          display: flex;
          gap: 9px;
          overflow: auto;
          padding-bottom: 5px;
        }

        .cat {
          white-space: nowrap;
          padding: 11px 17px;
          border: 1px solid #e5e8e1;
          border-radius: 30px;
          background: white;
          color: #62695f;
          font-size: 12px;
          font-weight: 600;
        }

        .cat.active {
          background: #173d2c;
          color: white;
          border-color: #173d2c;
        }

        .grid {
          display: grid;
          grid-template-columns: repeat(4, minmax(0, 1fr));
          gap: 18px;
          margin-top: 22px;
        }

        .card {
          border: 1px solid #eceee8;
          border-radius: 15px;
          overflow: hidden;
          background: white;
          transition: transform .2s, box-shadow .2s;
          min-width: 0;
        }

        .card:hover {
          transform: translateY(-3px);
          box-shadow: 0 12px 30px #173d2c0d;
        }

        .productvisual {
          height: 190px;
          display: grid;
          place-items: center;
          position: relative;
          background: #f0f3ec;
          overflow: hidden;
        }

        .productvisual img {
          width: 100%;
          height: 100%;
          object-fit: cover;
        }

        .heart {
          position: absolute;
          right: 12px;
          top: 12px;
          border: 0;
          background: #ffffffd9;
          border-radius: 50%;
          width: 32px;
          height: 32px;
          display: grid;
          place-items: center;
          color: #596056;
        }

        .productbody { padding: 15px; }

        .seller {
          font-size: 10px;
          color: #83897f;
          margin-bottom: 7px;
          overflow-wrap: anywhere;
        }

        .productname {
          font-size: 13px;
          font-weight: 700;
          line-height: 1.45;
          min-height: 37px;
          overflow-wrap: anywhere;
        }

        .rating {
          font-size: 11px;
          color: #777e73;
          margin: 8px 0;
          line-height: 1.5;
        }

        .prices { display: flex; align-items: center; gap: 8px; flex-wrap: wrap; }

        .price {
          font-size: 17px;
          font-weight: 800;
          letter-spacing: -.4px;
          overflow-wrap: anywhere;
        }

        .addbtn {
          margin-top: 13px;
          width: 100%;
          padding: 10px;
          border: 1px solid #dfe5d9;
          border-radius: 8px;
          background: #fff;
          color: #21452e;
          font-size: 12px;
          font-weight: 700;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 7px;
        }

        .addbtn:hover { background: #c3f17b; border-color: #c3f17b; }

        .trust {
          max-width: 1152px;
          margin: 30px auto 60px;
          padding: 0 24px;
          display: grid;
          grid-template-columns: repeat(3, 1fr);
          gap: 14px;
        }

        .trustitem {
          border: 1px solid #e9ece6;
          border-radius: 13px;
          padding: 20px;
          display: flex;
          gap: 13px;
          align-items: center;
        }

        .trusticon {
          width: 42px;
          height: 42px;
          border-radius: 12px;
          background: #eff7e4;
          color: #315b31;
          display: grid;
          place-items: center;
          flex-shrink: 0;
        }

        .trustitem b { font-size: 12px; }

        .trustitem p {
          font-size: 11px;
          color: #777e73;
          margin: 5px 0 0;
          line-height: 1.5;
        }

        footer {
          background: #f6f7f3;
          padding: 35px 24px;
          color: #6d746a;
          font-size: 12px;
        }

        .footerinner {
          max-width: 1152px;
          margin: auto;
          display: flex;
          justify-content: space-between;
          gap: 20px;
          flex-wrap: wrap;
        }

        .footlogo {
          color: #173d2c;
          font-size: 18px;
          font-weight: 800;
          margin-bottom: 8px;
        }

        .notice {
          position: fixed;
          bottom: 90px;
          left: 50%;
          transform: translateX(-50%);
          width: max-content;
          max-width: calc(100% - 32px);
          background: #173d2c;
          color: white;
          padding: 13px 20px;
          border-radius: 12px;
          z-index: 50;
          font-size: 13px;
          box-shadow: 0 8px 30px #0002;
          text-align: center;
        }

        .overlay {
          position: fixed;
          inset: 0;
          background: #0006;
          z-index: 30;
          display: flex;
          justify-content: flex-end;
        }

        .drawer {
          background: white;
          width: min(420px, 100%);
          height: 100%;
          padding: 25px;
          overflow: auto;
        }

        .drawertop {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 25px;
        }

        .drawertop h2 { margin: 0; font-family: Manrope, sans-serif; }

        .closebtn {
          border: 0;
          background: #f1f3ee;
          border-radius: 9px;
          padding: 9px;
          display: grid;
          place-items: center;
        }

        .cartrow {
          display: flex;
          gap: 13px;
          padding: 15px 0;
          border-bottom: 1px solid #eee;
        }

        .cartimage {
          width: 65px;
          height: 65px;
          border-radius: 10px;
          object-fit: cover;
          flex-shrink: 0;
        }

        .cartdetails { flex: 1; min-width: 0; }
        .cartdetails b { font-size: 13px; overflow-wrap: anywhere; }
        .cartdetails p { font-size: 13px; font-weight: 800; }

        .qty {
          display: flex;
          gap: 12px;
          align-items: center;
          font-size: 12px;
        }

        .qty button {
          border: 1px solid #e4e7e0;
          background: white;
          border-radius: 6px;
          padding: 4px;
          display: grid;
          place-items: center;
        }

        .totalrow {
          display: flex;
          justify-content: space-between;
          gap: 10px;
          font-weight: 800;
          margin-top: 25px;
        }

        .checkout {
          width: 100%;
          margin-top: 17px;
          background: #173d2c;
          color: white;
          border: 0;
          border-radius: 10px;
          padding: 15px;
          font-weight: 700;
        }

        .empty { text-align: center; padding: 55px 10px; color: #777; }
        .empty span { font-size: 45px; }
        .empty p { font-size: 13px; line-height: 1.6; }

        .bottom-nav {
          position: fixed;
          bottom: 0;
          left: 0;
          right: 0;
          z-index: 20;
          display: grid;
          grid-template-columns: repeat(5, minmax(0, 1fr));
          background: #fff;
          border-top: 1px solid #e5e8e1;
          padding: 7px 4px calc(7px + env(safe-area-inset-bottom));
        }

        .bottom-nav button {
          border: 0;
          background: transparent;
          color: #7b8177;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          gap: 3px;
          font-size: 9px;
          font-weight: 600;
          padding: 4px 0;
          min-width: 0; nowrap;
        }

        .bottom-nav button.active { color: #173d2c; }
        .bottom-nav button.active svg { color: #173d2c; stroke-width: 2.5; }

        .page-placeholder {
          width: 100%;
          max-width: 760px;
          min-height: 65vh;
          margin: 35px auto;
          padding: 0 18px 40px;
        }

        .page-placeholder h1 { font-size: 30px; letter-spacing: -1px; }

        .page-placeholder-card {
          padding: 22px;
          background: #f7faf6;
          border: 1px solid #e5ece5;
          border-radius: 16px;
          line-height: 1.7;
          overflow-wrap: anywhere;
        }

        .profile-avatar {
          width: 65px;
          height: 65px;
          border-radius: 20px;
          background: #eaf5dc;
          color: #173d2c;
          display: grid;
          place-items: center;
          margin-bottom: 16px;
        }

        .profile-label { color: #7b8177; font-size: 12px; margin-bottom: 5px; }

        .profile-value {
          font-size: 13px;
          font-weight: 600;
          overflow-wrap: anywhere;
          margin-bottom: 18px;
        }

        @media(max-width: 850px) {
          .headinner { gap: 10px; padding: 13px 16px; flex-wrap: wrap; }
          .logo { font-size: 20px; }
          .hero { padding: 0 16px; }
          .herobox { padding: 35px 28px; min-height: 315px; }
          .heroart { right: 5px; opacity: .45; }
          .herotext { max-width: 500px; }
          .section { padding: 0 16px; }
          .grid { grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 12px; }
          .productvisual { height: 155px; }
          .trust { padding: 0 16px; grid-template-columns: 1fr; }
          .locationbar { padding-left: 16px; padding-right: 16px; }
          .searchbox { order: 3; flex-basis: 100%; }
          .wallet-button { margin-left: auto; }
        }

        @media(max-width: 420px) {
          .headinner { gap: 8px; padding: 12px; }
          .logo { font-size: 18px; gap: 6px; }
          .logoicon { width: 30px; height: 30px; }
          .wallet-button .wallet-adapter-button {
            height: 28px !important;
            min-height: 28px !important;
            line-height: 28px !important;
            padding: 0 7px !important;
            font-size: 9px !important;
          }
          .wallet-button .wallet-adapter-button-start-icon {
            width: 12px !important;
            height: 12px !important;
            margin-right: 3px !important;
          }
          .headbtn { padding: 7px; font-size: 11px; }
          .herobox { padding: 30px 22px; min-height: 330px; }
          .heroart { right: -100px; opacity: .24; }
          .herotext p { font-size: 13px; }
          h1 { font-size: 35px; }
          .sectionhead h2 { font-size: 22px; }
          .productvisual { height: 135px; }
          .productbody { padding: 12px; }
          .price { font-size: 15px; }
          .grid { gap: 9px; }
          .locationinner { font-size: 11px; }
          .page-placeholder { padding-left: 16px; padding-right: 16px; }
        }

        @media(min-width: 851px) {
          .bottom-nav {
            left: 50%;
            right: auto;
            transform: translateX(-50%);
            width: min(520px, 90%);
            bottom: 12px;
            border: 1px solid #e5e8e1;
            border-radius: 18px;
            box-shadow: 0 5px 25px #173d2c15;
            padding-bottom: 9px;
          }
          .app { padding-bottom: 95px; }
        }
      `}</style>

      <div className="topline">
        <b>Discover web3 sellers. Shop smarter.</b>
      </div>

      <header className="header">
        <div className="headinner">
          <button
            type="button"
            className="logo"
            onClick={() => navigate('marketplace')}
            style={{
              border: 0,
              background: 'transparent',
              padding: 0,
              color: '#20251f',
            }}
          >
            <span className="logoicon">
              <Store size={21} />
            </span>
            SolMart<span style={{ color: '#7c9e53' }}>.</span>
          </button>

          {activePage === 'marketplace' && (
            <div className="searchbox">
              <Search size={17} className="searchicon" />
              <input
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Search products, stores and more..."
                aria-label="Search products and stores"
              />
            </div>
          )}

          <div className="wallet-button">
            <WalletMultiButton />
          </div>

          <button
            className="headbtn cartbtn"
            onClick={() => setShowCart(true)}
            type="button"
          >
            <ShoppingCart size={16} />
            Cart
            <span className="badge">{cartCount}</span>
          </button>
        </div>
      </header>

      {activePage === 'marketplace' && (
        <div className="locationbar">
          <div className="locationinner">
            <MapPin size={14} />
            Shopping across Nigeria
            <span style={{ marginLeft: 'auto' }}>
              Prices in SOL and USDC
            </span>
          </div>
        </div>
      )}

      <main>
        {activePage === 'marketplace' && (
          <>
            <section className="hero">
              <div className="herobox">
                <div className="herotext">
                  <div className="eyebrow">
                    Your marketplace. Your people.
                  </div>

                  <h1>
                    Good finds.
                    <br />
                    Better prices.
                  </h1>

                  <p>
                    Discover everyday essentials, fashion and gadgets from
                    sellers across Nigeriaâall in one place.
                  </p>

                  <button
                    className="primary"
                    onClick={() =>
                      document.getElementById('shop')?.scrollIntoView({
                        behavior: 'smooth',
                      })
                    }
                  >
                    Explore marketplace <ArrowRight size={16} />
                  </button>
                </div>

                <div className="heroart">
                  <div className="orbit">
                    <span className="bagart">ðï¸</span>
                  </div>
                  <div className="floatpill pillone">â¨ Local finds</div>
                  <div className="floatpill pilltwo">ð³ð¬ Made for you</div>
                </div>
              </div>
            </section>

            <section className="section" id="shop">
              <div className="sectionhead">
                <div>
                  <h2>Find your next favourite</h2>
                  <div className="sub">
                    Fresh picks from sellers around Nigeria
                  </div>
                </div>

                <span style={{ fontSize: 12, color: '#777' }}>
                  {loadingProducts
                    ? 'Loadingâ¦'
                    : `${filtered.length} products`}
                </span>
              </div>

              <div className="categories">
                {categories.map((item) => (
                  <button
                    key={item}
                    onClick={() => setCategory(item)}
                    className={'cat ' + (category === item ? 'active' : '')}
                  >
                    {item}
                  </button>
                ))}
              </div>

              {loadingProducts && (
                <div
                  style={{
                    textAlign: 'center',
                    padding: 50,
                    color: '#777',
                  }}
                >
                  <Package size={34} />
                  <p>Loading published products...</p>
                </div>
              )}

              {!loadingProducts && productsError && products.length === 0 && (
                <div
                  style={{
                    textAlign: 'center',
                    padding: 40,
                    color: '#777',
                  }}
                >
                  <Package size={34} />
                  <h3>We couldn't load the marketplace</h3>
                  <p>{productsError}</p>
                  <button
                    className="primary"
                    onClick={() => void loadProducts(true)}
                  >
                    Try again <ArrowRight size={15} />
                  </button>
                </div>
              )}

              {!loadingProducts &&
                !productsError &&
                products.length === 0 && (
                  <div
                    style={{
                      textAlign: 'center',
                      padding: 50,
                      color: '#777',
                    }}
                  >
                    <Package size={42} />
                    <h3>No products listed yet</h3>
                    <p>
                      Be the first to publish a product on SolMart.
                    </p>
                    <button
                      className="primary"
                      onClick={() => navigate('sell')}
                    >
                      List a product <ArrowRight size={15} />
                    </button>
                  </div>
                )}

              {!loadingProducts && products.length > 0 && (
                <>
                  <div className="grid">
                    {filtered.map((product) => (
                      <article
                        className="card"
                        key={product.id}
                        onClick={() => {
                          setSelectedProduct(product)
                          navigate('product-details')
                        }}
                          style={{ cursor: 'pointer' }}
                      >

                        <div className="productvisual">
                          {product.image_urls?.[0] ? (
                            <img
                              src={product.image_urls[0]}
                              alt={product.name}
                              loading="lazy"
                            />
                          ) : (
                            <Package size={48} color="#8b9684" />
                          )}

                          <button
                            className="heart"
                            aria-label={
                              wishlist.includes(String(product.id))
                               ? 'Remove from wishlist'
                               : 'Add to wishlist'
                            }
                            onClick={(event) => {
                              event.stopPropagation()

                              const alreadySaved = wishlist.includes(String(product.id))

                              toggleWishlist(product.id)
                              
                              showNotice(
                                alreadySaved
                                  ? 'Removed from wishlist.'
                                  : 'Added to wishlist.',
                              )
                          } }
                       >
                            <Heart 
                              size={16} 
                              fill={
                                wishlist.includes(String(product.id))
                                  ? '#e53935'
                                  : 'none'                     
                              }
                              color={
                                wishlist.includes(String(product.id))
                                  ? '#e53935'
                                  : 'currentColor'
                              }
                            />
                          
                          </button>
                        </div>

                        <div className="productbody">
                          <div className="seller">
                            <MapPin
                              size={11}
                              style={{
                                display: 'inline',
                                verticalAlign: 'middle',
                              }}
                            />{' '}
                            {product.location} Â· {product.condition}
                          </div>

                          <div className="productname">{product.name}</div>

                          <div className="rating">
                            {product.category} Â· {product.quantity}{' '}
                            available
                          </div>

                          <div className="prices">
                            <span className="price">
                              {money(product.price, product.currency)}
                            </span>
                          </div>

                          <button
                            className="addbtn"
                            onClick={() => addToCart(product.id)}
                          >
                            <Plus size={15} /> Add to cart
                          </button>
                        </div>
                      </article>
                    ))}
                  </div>

                  {filtered.length === 0 && (
                    <p
                      style={{
                        textAlign: 'center',
                        padding: 40,
                        color: '#777',
                      }}
                    >
                      No products found. Try another search or category.
                    </p>
                  )}
                </>
              )}

              {!loadingProducts && products.length > 0 && productsError && (
                <p
                  style={{
                    textAlign: 'center',
                    padding: 12,
                    color: '#777',
                    fontSize: 11,
                  }}
                >
                  Showing saved results. We couldn't refresh the latest
                  products just now.
                </p>
              )}

              {!loadingProducts && lastProductsUpdate > 0 && (
                <span style={{ display: 'none' }}>
                  Products last updated: {lastProductsUpdate}
                </span>
              )}
            </section>

            <section className="trust">
              <div className="trustitem">
                <div className="trusticon">
                  <Truck size={21} />
                </div>
                <div>
                  <b>Shop across Nigeria</b>
                  <p>
                    Discover products from local sellers and businesses.
                  </p>
                </div>
              </div>

              <div className="trustitem">
                <div className="trusticon">
                  <ShieldCheck size={21} />
                </div>
                <div>
                  <b>Built for a better checkout</b>
                  <p>
                    Secure checkout and payment processing are still being
                    developed.
                  </p>
                </div>
              </div>

              <div className="trustitem">
                <div className="trusticon">
                  <Package size={21} />
                </div>
                <div>
                  <b>Discover something new</b>
                  <p>
                    Explore real products published by SolMart sellers.
                  </p>
                </div>
              </div>
            </section>

            <footer>
              <div className="footerinner">
                <div>
                  <div className="footlogo">SolMart.</div>
                  <div>Your marketplace, made for Nigeria.</div>
                </div>

                <div>Electronics Â· Fashion Â· Beauty Â· Accessories</div>

                <div>Â© 2026 SolMart.</div>
              </div>
            </footer>
          </>
        )}

      {activePage === 'product-details' && selectedProduct && (
  <section className="section" style={{ paddingBottom: 100 }}>
    <button
      className="addbtn"
      style={{ width: 'auto', padding: '10px 16px', marginBottom: 24 }}
      onClick={() => navigate('marketplace')}
    >
      ← Back to marketplace
    </button>

    <div
      style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 320px), 1fr))',
        gap: 32,
        alignItems: 'start',
      }}
    >
      {/* PRODUCT IMAGE */}
      <div>
        <div
          className="productvisual"
          style={{
            height: 'auto',
            minHeight: 280,
            maxHeight: 480,
            borderRadius: 18,
          }}
        >
          {selectedProduct.image_urls?.[0] ? (
            <img
              src={selectedProduct.image_urls[0]}
              alt={selectedProduct.name}
              style={{
                width: '100%',
                height: '100%',
                minHeight: 280,
                maxHeight: 480,
                objectFit: 'contain',
              }}
            />
          ) : (
            <Package size={70} color="#8b9684" />
          )}
        </div>

        {selectedProduct.image_urls?.length > 1 && (
          <div
            style={{
              display: 'flex',
              gap: 10,
              overflowX: 'auto',
              marginTop: 12,
            }}
          >
            {selectedProduct.image_urls.map((image, index) => (
              <img
                key={`${image}-${index}`}
                src={image}
                alt={`${selectedProduct.name} image ${index + 1}`}
                style={{
                  width: 75,
                  height: 75,
                  objectFit: 'cover',
                  borderRadius: 10,
                  border: '1px solid #e5e8e1',
                  flexShrink: 0,
                }}
              />
            ))}
          </div>
        )}
      </div>

      {/* PRODUCT INFORMATION */}
      <div>
        <div className="sub">
          {selectedProduct.category} · {selectedProduct.condition}
        </div>

        <h1 style={{ fontSize: 32, letterSpacing: '-1px' }}>
          {selectedProduct.name}
        </h1>

        <div
          style={{
            fontSize: 27,
            fontWeight: 800,
            color: '#173d2c',
            margin: '18px 0',
          }}
        >
          {money(selectedProduct.price, selectedProduct.currency)}
        </div>

        <div
          style={{
            display: 'inline-block',
            background:
              selectedProduct.quantity > 0 ? '#eff7e4' : '#fdeaea',
            color:
              selectedProduct.quantity > 0 ? '#28583d' : '#b42318',
            borderRadius: 20,
            padding: '7px 12px',
            fontSize: 12,
            fontWeight: 700,
          }}
        >
          {selectedProduct.quantity > 0
            ? `${selectedProduct.quantity} available`
            : 'Out of stock'}
        </div>

        <div
          style={{
            marginTop: 22,
            padding: 18,
            border: '1px solid #e5e8e1',
            borderRadius: 14,
          }}
        >
          <h3 style={{ marginTop: 0 }}>Product description</h3>

          <p
            style={{
              fontSize: 14,
              lineHeight: 1.8,
              whiteSpace: 'pre-wrap',
              overflowWrap: 'anywhere',
              color: '#596056',
            }}
          >
            {selectedProduct.description?.trim() ||
              'The seller has not provided a description for this product.'}
          </p>

          <div style={{ marginTop: 18 }}>
            <div className="profile-label">Condition</div>
            <div className="profile-value">
              {selectedProduct.condition || 'Not specified'}
            </div>

            <div className="profile-label">Category</div>
            <div className="profile-value">
              {selectedProduct.category || 'Not specified'}
            </div>

            <div className="profile-label">Location</div>
            <div className="profile-value">
              {selectedProduct.location || 'Not specified'}
            </div>

            <div className="profile-label">Quantity available</div>
            <div className="profile-value">
              {selectedProduct.quantity}
            </div>
          </div>
        </div>

        {/* SELLER INFORMATION */}
        <div
          style={{
            marginTop: 18,
            padding: 18,
            border: '1px solid #e5e8e1',
            borderRadius: 14,
          }}
        >
          <h3 style={{ marginTop: 0 }}>Seller information</h3>

          <div className="profile-label">Seller wallet address</div>

          <div
            className="profile-value"
            style={{
              overflowWrap: 'anywhere',
              wordBreak: 'break-word',
            }}
          >
           {selectedProduct.seller_wallet
             ? `${selectedProduct.seller_wallet.slice(0, 4)}...${selectedProduct.seller_wallet.slice(-4)}`
             : 'Wallet unavailable'}
          </div>

          <p className="sub">
            This is the seller wallet address recorded for this listing.
            It does not independently verify the seller's identity.
          </p>

          <button
            className="addbtn"
            onClick={() =>
              showNotice(
                'Seller messaging is not connected yet.',
              )
            }
          >
            <MessageCircle size={16} />
            Message Seller
          </button>
        </div>

        {/* REVIEWS */}
        <div
          style={{
            marginTop: 18,
            padding: 18,
            border: '1px solid #e5e8e1',
            borderRadius: 14,
          }}
        >
          <h3 style={{ marginTop: 0 }}>
            <ShieldCheck
              size={19}
              style={{ verticalAlign: 'middle' }}
            />{' '}
            Buyer reviews & ratings
          </h3>

          <p
            style={{
              fontSize: 13,
              lineHeight: 1.7,
              color: '#777',
            }}
          >
            Buyer reviews and ratings will appear here when the
            review system is connected.
          </p>
        </div>

        <button
          className="primary"
          style={{
            width: '100%',
            justifyContent: 'center',
            marginTop: 22,
            opacity: selectedProduct.quantity > 0 ? 1 : 0.5,
          }}
          disabled={selectedProduct.quantity <= 0}
          onClick={() => addToCart(selectedProduct.id)}
        >
          <ShoppingCart size={18} />
          Add to Cart
        </button>
      </div>
    </div>

    {/* OTHER PRODUCTS FROM THIS SELLER */}
    <div style={{ marginTop: 48 }}>
      <div className="sectionhead">
        <div>
          <h2>More from this seller</h2>
          <div className="sub">
            Discover other products listed by the same seller.
          </div>
        </div>
      </div>

      {products.filter(
        (product) =>
          String(product.id) !== String(selectedProduct.id) &&
          product.seller_wallet === selectedProduct.seller_wallet,
      ).length === 0 ? (
        <p style={{ color: '#777', fontSize: 13 }}>
          This seller has no other published products yet.
        </p>
      ) : (
        <div className="grid">
          {products
            .filter(
              (product) =>
                String(product.id) !== String(selectedProduct.id) &&
                product.seller_wallet === selectedProduct.seller_wallet,
            )
            .map((product) => (
              <article
                className="card"
                key={product.id}
                onClick={() => setSelectedProduct(product)}
                style={{ cursor: 'pointer' }}
              >
                <div className="productvisual">
                  {product.image_urls?.[0] ? (
                    <img
                      src={product.image_urls[0]}
                      alt={product.name}
                      loading="lazy"
                    />
                  ) : (
                    <Package size={40} color="#8b9684" />
                  )}
                </div>

                <div className="productbody">
                  <div className="productname">{product.name}</div>

                  <div className="rating">
                    {product.quantity > 0
                      ? `${product.quantity} available`
                      : 'Out of stock'}
                  </div>

                  <div className="price">
                    {money(product.price, product.currency)}
                  </div>
                </div>
              </article>
            ))}
        </div>
      )}
    </div>
  </section>
)}
        
        {activePage === 'sell' && <SellPage />}

        {activePage === 'messages' && (
          <section className="page-placeholder">
            <h1>Messages</h1>

            <p className="sub">
              Keep your conversations with buyers and sellers in one place.
            </p>

            <div className="page-placeholder-card">
              <MessageCircle size={32} />

              <h3>No conversations yet</h3>

              <p>
                Your buyerâseller conversations will appear here when the
                messaging system is connected.
              </p>

              <p style={{ color: '#78877c', fontSize: 12 }}>
                Messaging is not connected to a database yet.
              </p>
            </div>
          </section>
        )}

        {activePage === 'profile' && (
  <section className="section" style={{ paddingBottom: 100 }}>
    <div style={{ maxWidth: 760, margin: '0 auto' }}>
      <div style={{ marginBottom: 28 }}>
        <h1 style={{ fontSize: 32, letterSpacing: '-1px' }}>
          My Seller Profile
        </h1>

        <p className="sub">
          Create your seller identity on SolMart. Your profile helps buyers
          learn about you before purchasing your products.
        </p>
      </div>

      {/* WALLET STATUS */}
      <div
        className="page-placeholder-card"
        style={{ marginBottom: 24 }}
      >
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 14,
          }}
        >
          <div className="profile-avatar">
            <User size={28} />
          </div>

          <div style={{ minWidth: 0, flex: 1 }}>
            <h3 style={{ margin: '0 0 6px' }}>
              {connected ? 'Wallet connected' : 'Connect your wallet'}
            </h3>

            <p className="sub" style={{ margin: 0 }}>
              {connected
                ? 'Your seller profile is associated with this wallet.'
                : 'Connect Phantom or Solflare to create or edit your profile.'}
            </p>
          </div>
        </div>

        <div className="profile-label" style={{ marginTop: 20 }}>
          Wallet address
        </div>

        <div
          className="profile-value"
          style={{
            overflowWrap: 'anywhere',
            wordBreak: 'break-word',
          }}
        >
          {publicKey
            ? publicKey.toBase58()
            : 'No wallet connected'}
        </div>

        <div className="profile-label">Published products</div>

        <div className="profile-value">
          {products.filter(
            (product) =>
              product.seller_wallet === publicKey?.toBase58(),
          ).length}{' '}
          products associated with your connected wallet.
        </div>
      </div>

      {/* PROFILE FORM */}
      <form
        onSubmit={(event) => {
          event.preventDefault()
          void saveSellerProfile()
        }}
        className="page-placeholder-card"
        style={{ padding: 24 }}
      >
        <h2 style={{ marginTop: 0 }}>
          Seller details
        </h2>

        <p className="sub">
          Complete your details and save them to your seller profile.
        </p>

        {/* PROFILE PICTURE */}
        <div style={{ marginTop: 24, marginBottom: 24 }}>
          <label
            htmlFor="profileImageUrl"
            className="profile-label"
            style={{ display: 'block', marginBottom: 10 }}
          >
            Profile picture URL
          </label>

          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 16,
              marginBottom: 14,
            }}
          >
            <div
              style={{
                width: 76,
                height: 76,
                borderRadius: '50%',
                border: '1px solid #e5e8e1',
                background: '#f4f6f0',
                overflow: 'hidden',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                flexShrink: 0,
              }}
            >
              {profileImageUrl.trim() ? (
                <img
                  src={profileImageUrl.trim()}
                  alt="Seller profile"
                  onError={(event) => {
                    event.currentTarget.style.display = 'none'
                  }}
                  style={{
                    width: '100%',
                    height: '100%',
                    objectFit: 'cover',
                  }}
                />
              ) : (
                <User size={32} color="#8b9684" />
              )}
            </div>
         
          </div>

          <input
             ref={profileImageInputRef}
             id="profileImageFile"
             type="file"
             accept="image/jpeg,image/png,image/webp,image/gif"
             onChange={handleProfileImageChange}
             disabled={!connected || profileLoading || profileSaving || profileImageUploading}
             style={{ display: 'none' }}
       />

       <div
         style={{
           display: 'flex',
           alignItems: 'center',
           gap: 14,
           flexWrap: 'wrap',
           marginTop: 12,
         }}
       >
         {profileImagePreview || profileImageUrl ? (
           <img
             src={profileImagePreview || profileImageUrl}
             alt="Seller profile preview"
             style={{
               width: 84,
               height: 84,
               borderRadius: '50%',
               objectFit: 'cover',
               border: '1px solid #e5e8e1',
             }}
           />
         ) : (
           <div
             style={{
               width: 84,
               height: 84,
               borderRadius: '50%',
               background: '#f3f4ef',
               border: '1px solid #e5e8e1',
               display: 'flex',
               alignItems: 'center',
               justifyContent: 'center',
               fontSize: 28,
             }}
           >
             👤
           </div>
         )}

     <button
       type="button"
       onClick={() => profileImageInputRef.current?.click()}
       disabled={
         !connected ||
         profileLoading ||
         profileSaving ||
         profileImageUploading
       }
       style={{
         padding: '12px 16px',
         border: '1px solid #e5e8e1',
         borderRadius: 10,
         background: '#fff',
         cursor: 'pointer',
         font: 'inherit',
       }}
     >
       {profileImageFile
         ? 'Choose Another Picture'
         : 'Choose Profile Picture'}
     </button>

     {profileImageFile && (
       <span style={{ fontSize: 13, color: '#666' }}>
       {profileImageFile.name}
       </span>
     )}
     </div>

     {profileImageUploading && (
       <div className="sub" style={{ marginTop: 8 }}>
         Uploading profile picture...
       </div>
)}
 {profileImageUploading && (

  <div className="sub" style={{ marginTop: 8 }}>
    Uploading profile picture...
  </div>
)}
        </div>

        {/* FULL NAME */}
        <div style={{ marginBottom: 20 }}>
          <label
            htmlFor="profileFullName"
            className="profile-label"
            style={{ display: 'block', marginBottom: 8 }}
          >
            Full name
          </label>

          <input
            id="profileFullName"
            type="text"
            value={profileFullName}
            onChange={(event) =>
              setProfileFullName(event.target.value)
            }
            placeholder="Enter your full name"
            maxLength={100}
            required
            disabled={!connected || profileLoading || profileSaving}
            style={{
              width: '100%',
              boxSizing: 'border-box',
              padding: 13,
              border: '1px solid #e5e8e1',
              borderRadius: 10,
              font: 'inherit',
            }}
          />
        </div>

        {/* USERNAME */}
        <div style={{ marginBottom: 20 }}>
          <label
            htmlFor="profileUsername"
            className="profile-label"
            style={{ display: 'block', marginBottom: 8 }}
          >
            Username
          </label>

          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              border: '1px solid #e5e8e1',
              borderRadius: 10,
              overflow: 'hidden',
            }}
          >
            <span style={{ paddingLeft: 13, color: '#777' }}>
              @
            </span>

            <input
              id="profileUsername"
              type="text"
              value={profileUsername}
              onChange={(event) =>
                setProfileUsername(
                  event.target.value
                    .replace(/^@/, '')
                    .toLowerCase(),
                )
              }
              placeholder="yourusername"
              maxLength={30}
              disabled={!connected || profileLoading || profileSaving}
              style={{
                width: '100%',
                minWidth: 0,
                padding: 13,
                border: 'none',
                outline: 'none',
                font: 'inherit',
              }}
            />
          </div>

          <p className="sub" style={{ marginTop: 7 }}>
            Use lowercase letters, numbers, and underscores. Usernames must
            be unique.
          </p>
        </div>

        {/* LOCATION */}
        <div style={{ marginBottom: 20 }}>
          <label
            htmlFor="profileLocation"
            className="profile-label"
            style={{ display: 'block', marginBottom: 8 }}
          >
            Location
          </label>

          <input
            id="profileLocation"
            type="text"
            value={profileLocation}
            onChange={(event) =>
              setProfileLocation(event.target.value)
            }
            placeholder="e.g. Owerri, Imo State"
            maxLength={150}
            disabled={!connected || profileLoading || profileSaving}
            style={{
              width: '100%',
              boxSizing: 'border-box',
              padding: 13,
              border: '1px solid #e5e8e1',
              borderRadius: 10,
              font: 'inherit',
            }}
          />
        </div>

        {/* SELLER TYPE */}
        <div style={{ marginBottom: 20 }}>
          <label
            htmlFor="profileSellerType"
            className="profile-label"
            style={{ display: 'block', marginBottom: 8 }}
          >
            Seller type
          </label>

          <select
            id="profileSellerType"
            value={profileSellerType}
            onChange={(event) =>
              setProfileSellerType(
                event.target.value as 'individual' | 'business',
              )
            }
            disabled={!connected || profileLoading || profileSaving}
            style={{
              width: '100%',
              boxSizing: 'border-box',
              padding: 13,
              border: '1px solid #e5e8e1',
              borderRadius: 10,
              background: '#fff',
              font: 'inherit',
            }}
          >
            <option value="individual">Individual seller</option>
            <option value="business">Business seller</option>
          </select>
        </div>

        {/* BIO */}
        <div style={{ marginBottom: 24 }}>
          <label
            htmlFor="profileBio"
            className="profile-label"
            style={{ display: 'block', marginBottom: 8 }}
          >
            About you
          </label>

          <textarea
            id="profileBio"
            value={profileBio}
            onChange={(event) =>
              setProfileBio(event.target.value)
            }
            placeholder="Tell buyers about yourself, your business, and what you sell..."
            maxLength={1000}
            rows={5}
            disabled={!connected || profileLoading || profileSaving}
            style={{
              width: '100%',
              boxSizing: 'border-box',
              padding: 13,
              border: '1px solid #e5e8e1',
              borderRadius: 10,
              resize: 'vertical',
              font: 'inherit',
              lineHeight: 1.6,
            }}
          />

          <div
            className="sub"
            style={{ textAlign: 'right', marginTop: 5 }}
          >
            {profileBio.length}/1000 characters
          </div>
        </div>

        {/* STATUS MESSAGES */}
        {profileLoading && (
          <p className="sub">
            Loading your saved seller profile...
          </p>
        )}

        {profileError && (
          <div
            role="alert"
            style={{
              background: '#fdeaea',
              color: '#b42318',
              padding: 12,
              borderRadius: 10,
              marginBottom: 16,
              fontSize: 13,
              overflowWrap: 'anywhere',
            }}
          >
            {profileError}
          </div>
        )}

        {profileMessage && (
          <div
            role="status"
            style={{
              background: '#eff7e4',
              color: '#28583d',
              padding: 12,
              borderRadius: 10,
              marginBottom: 16,
              fontSize: 13,
            }}
          >
            {profileMessage}
          </div>
        )}

        {/* SAVE BUTTON */}
        <button
          type="submit"
          className="primary"
          disabled={
            !connected ||
            !signMessage ||
            profileLoading ||
            profileSaving
          }
          style={{
            width: '100%',
            justifyContent: 'center',
            opacity:
              !connected ||
              !signMessage ||
              profileLoading ||
              profileSaving
                ? 0.6
                : 1,
            cursor:
              !connected ||
              !signMessage ||
              profileLoading ||
              profileSaving
                ? 'not-allowed'
                : 'pointer',
          }}
        >
          {profileSaving
            ? 'Saving profile...'
            : sellerProfile
              ? 'Save Profile Changes'
              : 'Create Seller Profile'}
        </button>

        {!connected && (
          <p
            className="sub"
            style={{ textAlign: 'center', marginTop: 14 }}
          >
            Connect your Solana wallet before saving your profile.
          </p>
        )}

        {connected && !signMessage && (
          <p
            className="sub"
            style={{ textAlign: 'center', marginTop: 14 }}
          >
            Your connected wallet does not support message signing.
            Try a compatible wallet.
          </p>
        )}
      </form>
    </div>
  </section>
)}

                {activePage === 'wishlist' && (
          <section className="section" style={{ paddingBottom: 100 }}>
            <div className="sectionhead">
              <div>
                <h2>
                  My Wishlist <Heart size={20} style={{ verticalAlign: 'middle' }} />
                </h2>
                <div className="sub">
                  Your favourite finds, all in one place.
                </div>
              </div>

              <span style={{ fontSize: 12, color: '#777' }}>
                {
                  products.filter((product) =>
                    wishlist.includes(String(product.id))
                  ).length
                } saved
              </span>
            </div>

            {loadingProducts && (
              <div style={{ textAlign: 'center', padding: 40, color: '#777' }}>
                <Package size={32} />
                <p>Loading your saved products...</p>
              </div>
            )}

            {!loadingProducts &&
              productsError &&
              products.length === 0 && (
                <div style={{ textAlign: 'center', padding: 40, color: '#777' }}>
                  <Package size={32} />
                  <h3>We couldn't load your saved products</h3>
                  <p>{productsError}</p>
                  <button
                    className="primary"
                    onClick={() => void loadProducts(true)}
                  >
                    Try again <ArrowRight size={15} />
                  </button>
                </div>
              )}

            {!loadingProducts &&
              !(productsError && products.length === 0) &&
              products.filter((product) =>
                wishlist.includes(String(product.id))
              ).length === 0 && (
                <div style={{ textAlign: 'center', padding: '45px 20px' }}>
                  <Heart size={42} color="#8b9684" />
                  <h3>Your wishlist is empty</h3>
                  <p>Tap the heart on any product to save it here.</p>
                  <button
                    className="primary"
                    onClick={() => navigate('marketplace')}
                  >
                    Explore marketplace <ArrowRight size={15} />
                  </button>
                </div>
              )}

            {!loadingProducts &&
              products.filter((product) =>
                wishlist.includes(String(product.id))
              ).length > 0 && (
                <div className="grid">
                  {products
                    .filter((product) =>
                      wishlist.includes(String(product.id))
                    )
                    .map((product) => (
                     <article
                       className="card"
                       key={product.id}
                       onClick={() => {
                         setSelectedProduct(product)
                         navigate('product-details')
                       }}
                       style={{ cursor: 'pointer' }}
                     >
                        <div className="productvisual">
                          {product.image_urls?.[0] ? (
                            <img
                              src={product.image_urls[0]}
                              alt={product.name}
                              loading="lazy"
                            />
                          ) : (
                            <Package size={48} color="#8b9684" />
                          )}
                        </div>

                        <div className="productbody">
                          <div className="seller">
                            <MapPin
                              size={11}
                              style={{
                                display: 'inline',
                                verticalAlign: 'middle',
                              }}
                            />{' '}
                            {product.location} · {product.condition}
                          </div>

                          <div className="productname">{product.name}</div>

                          <div className="rating">
                            {product.category} · {product.quantity} available
                          </div>

                          <div className="prices">
                            <span className="price">
                              {money(product.price, product.currency)}
                            </span>
                          </div>

                          <button
                            className="addbtn"
                            onClick={(event) => {
                              event.stopPropagation()
                              addToCart(product.id)
                            }}
                          >
                            <Plus size={15} /> Add to cart
                          </button>

                          <button
                            className="addbtn"
                            onClick={() => {
                              toggleWishlist(product.id)
                              showNotice('Removed from wishlist.')
                            }}
                          >
                            <Heart
                              size={15}
                              fill="#e53935"
                              color="#e53935"
                            />
                            Remove from wishlist
                          </button>
                        </div>
                      </article>
                    ))}
                </div>
              )}
          </section>
        )}
      </main>

      {notice && (
        <div className="notice" role="status">
          {notice}
        </div>
      )}

      {showCart && (
        <div className="overlay" onClick={() => setShowCart(false)}>
          <aside
            className="drawer"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="drawertop">
              <h2>Your cart ({cartCount})</h2>

              <button
                className="closebtn"
                onClick={() => setShowCart(false)}
                aria-label="Close cart"
              >
                <X size={19} />
              </button>
            </div>

            {cartCount === 0 ? (
              <div className="empty">
                <span>ðï¸</span>
                <h3>Your cart is empty</h3>

                <p>
                  Explore the marketplace and discover products you love.
                </p>

                <button
                  className="primary"
                  onClick={() => {
                    setShowCart(false)
                    navigate('marketplace')
                  }}
                >
                  Start shopping <ArrowRight size={15} />
                </button>
              </div>
            ) : (
              <>
                {cartItems.map((product) => (
                  <div className="cartrow" key={product.id}>
                    {product.image_urls?.[0] ? (
                      <img
                        className="cartimage"
                        src={product.image_urls[0]}
                        alt={product.name}
                      />
                    ) : (
                      <div
                        className="cartimage"
                        style={{
                          display: 'grid',
                          placeItems: 'center',
                          background: '#f0f3ec',
                        }}
                      >
                        <Package size={25} />
                      </div>
                    )}

                    <div className="cartdetails">
                      <b>{product.name}</b>
                      <p>{money(product.price, product.currency)}</p>

                      <div className="qty">
                        <button
                          onClick={() => changeQuantity(product.id, -1)}
                          aria-label={`Remove one ${product.name}`}
                        >
                          <Minus size={13} />
                        </button>

                        {cart[String(product.id)]}

                        <button
                          onClick={() => changeQuantity(product.id, 1)}
                          aria-label={`Add one ${product.name}`}
                          disabled={
                            (cart[String(product.id)] || 0) >=
                            product.quantity
                          }
                        >
                          <Plus size={13} />
                        </button>
                      </div>
                    </div>
                  </div>
                ))}

                {cartCurrencies.map((currency) => {
                  const subtotal = cartItems
                    .filter((product) => product.currency === currency)
                    .reduce(
                      (sum, product) =>
                        sum +
                        product.price * (cart[String(product.id)] || 0),
                      0,
                    )

                  return (
                    <div className="totalrow" key={currency}>
                      <span>{currency} subtotal</span>
                      <span>{money(subtotal, currency)}</span>
                    </div>
                  )
                })}

                <p
                  style={{
                    fontSize: 11,
                    color: '#777',
                    lineHeight: 1.6,
                  }}
                >
                  Checkout and payment processing are not connected. No
                  payment will be made from this cart.
                </p>

                <button
                  className="checkout"
                  onClick={() => {
                    setShowCart(false)
                    showNotice(
                      'Real checkout is not connected yet. No payment has been made.',
                    )
                  }}
                >
                  Checkout not available yet
                </button>
              </>
            )}
          </aside>
        </div>
      )}

      <nav className="bottom-nav" aria-label="Main navigation">
        <button
          type="button"
          className={activePage === 'marketplace' ? 'active' : ''}
          aria-current={activePage === 'marketplace' ? 'page' : undefined}
          onClick={() => navigate('marketplace')}
        >
          <Home size={21} />
          <span>Marketplace</span>
        </button>

        <button
          type="button"
          className={activePage === 'sell' ? 'active' : ''}
          aria-current={activePage === 'sell' ? 'page' : undefined}
          onClick={() => navigate('sell')}
        >
          <Tag size={21} />
          <span>Sell</span>
        </button>

        <button
          type="button"
          className={activePage === 'messages' ? 'active' : ''}
          aria-current={activePage === 'messages' ? 'page' : undefined}
          onClick={() => navigate('messages')}
        >
          <MessageCircle size={21} />
          <span>Messages</span>
        </button>

        <button
          type="button"
          className={activePage === 'wishlist' ? 'active' : ''}
          aria-current={activePage === 'wishlist' ? 'page' : undefined}
          onClick={() => navigate('wishlist')}
        >
          <Heart size={21} />
          <span>Wishlist</span>
        </button>
        
        <button
          type="button"
          className={activePage === 'profile' ? 'active' : ''}
          aria-current={activePage === 'profile' ? 'page' : undefined}
          onClick={() => navigate('profile')}
        >
          <User size={21} />
          <span>Profile</span>
        </button>
      </nav>
    </div>
  )
}
