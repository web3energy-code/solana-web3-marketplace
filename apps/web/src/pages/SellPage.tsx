import { useEffect, useRef, useState } from 'react'
import { useWallet } from '@solana/wallet-adapter-react'

const MAX_PHOTOS = 10

type ProductPhoto = {
  id: string
  file: File
  preview: string
}

const categories = [
  'Electronics',
  'Fashion',
  'Home & Living',
  'Beauty',
  'Accessories',
  'Phones & Tablets',
  'Gaming',
  'Food & Groceries',
  'Other',
]

export default function SellPage() {
  const { publicKey, connected } = useWallet()

  const fileInputRef = useRef<HTMLInputElement>(null)
  const photosRef = useRef<ProductPhoto[]>([])

  const [photos, setPhotos] = useState<ProductPhoto[]>([])
  const [coverId, setCoverId] = useState('')
  const [productName, setProductName] = useState('')
  const [category, setCategory] = useState('Electronics')
  const [description, setDescription] = useState('')
  const [condition, setCondition] = useState('New')
  const [price, setPrice] = useState('')
  const [currency, setCurrency] = useState('SOL')
  const [quantity, setQuantity] = useState('1')
  const [location, setLocation] = useState('')
  const [notice, setNotice] = useState('')
  const [showPreview, setShowPreview] = useState(false)

  useEffect(() => {
    photosRef.current = photos
  }, [photos])

  useEffect(() => {
    return () => {
      photosRef.current.forEach((photo) => {
        URL.revokeObjectURL(photo.preview)
      })
    }
  }, [])

  function handlePhotoSelection(
    event: React.ChangeEvent<HTMLInputElement>,
  ) {
    const selectedFiles = Array.from(event.target.files ?? [])
    event.target.value = ''

    if (selectedFiles.length === 0) return

    const remaining = MAX_PHOTOS - photos.length

    if (remaining <= 0) {
      setNotice('You can upload a maximum of 10 photos.')
      return
    }

    const imageFiles = selectedFiles.filter((file) =>
      file.type.startsWith('image/'),
    )

    const validFiles = imageFiles.filter(
      (file) => file.size <= 10 * 1024 * 1024,
    )

    if (validFiles.length < selectedFiles.length) {
      setNotice(
        'Some files were skipped. Select images smaller than 10 MB each.',
      )
    } else {
      setNotice('')
    }

    const acceptedFiles = validFiles.slice(0, remaining)

    if (validFiles.length > remaining) {
      setNotice('Only 10 photos can be added to one product.')
    }

    const newPhotos: ProductPhoto[] = acceptedFiles.map((file) => ({
      id: `${Date.now()}-${Math.random().toString(36).slice(2)}`,
      file,
      preview: URL.createObjectURL(file),
    }))

    setPhotos((current) => {
      const updated = [...current, ...newPhotos]

      if (!coverId && updated.length > 0) {
        setCoverId(updated[0].id)
      }

      return updated
    })

    if (photos.length === 0 && newPhotos.length > 0) {
      setCoverId(newPhotos[0].id)
    }
  }

  function removePhoto(id: string) {
    const photo = photos.find((item) => item.id === id)

    if (photo) {
      URL.revokeObjectURL(photo.preview)
    }

    const updated = photos.filter((item) => item.id !== id)

    setPhotos(updated)

    if (coverId === id) {
      setCoverId(updated[0]?.id ?? '')
    }

    setNotice('')
  }

  function validateForm() {
    if (!connected || !publicKey) {
      setNotice('Connect your Solana wallet before preparing your listing.')
      return false
    }

    if (photos.length === 0) {
      setNotice('Please add at least one product photo.')
      return false
    }

    if (!productName.trim()) {
      setNotice('Please enter a product name.')
      return false
    }

    if (!description.trim()) {
      setNotice('Please describe your product.')
      return false
    }

    if (!price.trim() || !Number.isFinite(Number(price)) || Number(price) <= 0) {
      setNotice('Enter a valid price greater than zero.')
      return false
    }

    if (!Number.isInteger(Number(quantity)) || Number(quantity) < 1) {
      setNotice('Quantity must be a whole number of at least 1.')
      return false
    }

    if (!location.trim()) {
      setNotice('Please enter the product location.')
      return false
    }

    return true
  }

  function handlePreview() {
    setNotice('')

    if (!validateForm()) return

    setShowPreview(true)

    window.scrollTo({
      top: 0,
      behavior: 'smooth',
    })
  }

  function handleSubmit() {
    setNotice(
      'Your listing details are ready, but publishing is not connected yet. Supabase storage and database integration are required to save this product permanently.',
    )
  }

  const coverPhoto =
    photos.find((photo) => photo.id === coverId) ?? photos[0]

  const inputStyle: React.CSSProperties = {
    width: '100%',
    boxSizing: 'border-box',
    padding: '12px 14px',
    border: '1px solid #dce5dd',
    borderRadius: '10px',
    background: '#fff',
    color: '#173d2c',
    fontSize: '14px',
    outlineColor: '#173d2c',
  }

  const labelStyle: React.CSSProperties = {
    display: 'block',
    marginBottom: '8px',
    fontWeight: 700,
    fontSize: '14px',
    color: '#173d2c',
  }

  return (
    <main className="solmart-sell">
      <style>{`
        .solmart-sell {
          min-height: 100vh;
          padding: 24px 16px 110px;
          background: #f7faf6;
          color: #173d2c;
          font-family: Arial, sans-serif;
        }

        .sell-container {
          width: 100%;
          max-width: 760px;
          margin: 0 auto;
        }

        .sell-heading {
          font-size: 29px;
          font-weight: 800;
          margin: 0 0 8px;
          letter-spacing: -0.8px;
        }

        .sell-subtitle {
          color: #718075;
          font-size: 14px;
          line-height: 1.6;
          margin: 0 0 24px;
        }

        .sell-card {
          background: #fff;
          border: 1px solid #e5ece5;
          border-radius: 18px;
          padding: 20px;
          margin-bottom: 18px;
          box-shadow: 0 4px 18px rgba(23, 61, 44, 0.035);
        }

        .sell-section-title {
          font-size: 17px;
          font-weight: 800;
          margin: 0 0 7px;
        }

        .sell-help {
          font-size: 12px;
          line-height: 1.6;
          color: #78877c;
          margin: 0 0 18px;
        }

        .sell-photo-grid {
          display: grid;
          grid-template-columns: repeat(3, minmax(0, 1fr));
          gap: 10px;
        }

        .sell-photo {
          position: relative;
          aspect-ratio: 1 / 1;
          border-radius: 12px;
          overflow: hidden;
          background: #f0f5ef;
          border: 1px solid #e0e9df;
        }

        .sell-photo img {
          width: 100%;
          height: 100%;
          object-fit: cover;
        }

        .sell-cover-badge {
          position: absolute;
          left: 5px;
          bottom: 5px;
          padding: 5px 7px;
          background: #c3f17b;
          color: #173d2c;
          font-size: 10px;
          font-weight: 800;
          border-radius: 6px;
        }

        .sell-photo-remove {
          position: absolute;
          top: 5px;
          right: 5px;
          width: 27px;
          height: 27px;
          border: none;
          border-radius: 50%;
          background: #fff;
          color: #b42318;
          font-size: 17px;
          cursor: pointer;
        }

        .sell-photo-cover {
          position: absolute;
          left: 5px;
          top: 5px;
          padding: 5px 7px;
          border: none;
          border-radius: 6px;
          background: rgba(255,255,255,.95);
          color: #173d2c;
          font-size: 10px;
          font-weight: 700;
          cursor: pointer;
        }

        .sell-add-photo {
          aspect-ratio: 1 / 1;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          gap: 8px;
          border: 1.5px dashed #a9bca9;
          border-radius: 12px;
          background: #f7faf6;
          color: #315b40;
          font-size: 12px;
          font-weight: 700;
          cursor: pointer;
          padding: 8px;
          text-align: center;
        }

        .sell-add-photo span {
          font-size: 28px;
        }

        .sell-field {
          margin-bottom: 18px;
        }

        .sell-field:last-child {
          margin-bottom: 0;
        }

        .sell-textarea {
          resize: vertical;
          min-height: 110px;
          font-family: inherit;
          line-height: 1.6;
        }

        .sell-two-columns {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 12px;
        }

        .sell-primary-button {
          width: 100%;
          padding: 15px;
          border: none;
          border-radius: 11px;
          background: #173d2c;
          color: white;
          font-weight: 800;
          font-size: 15px;
          cursor: pointer;
        }

        .sell-primary-button:disabled {
          opacity: .5;
          cursor: not-allowed;
        }

        .sell-secondary-button {
          width: 100%;
          padding: 13px;
          border: 1px solid #dce5dd;
          border-radius: 11px;
          background: white;
          color: #173d2c;
          font-weight: 700;
          cursor: pointer;
          margin-bottom: 10px;
        }

        .sell-notice {
          margin: 16px 0;
          padding: 13px;
          background: #fff8df;
          border: 1px solid #f0e2a7;
          color: #755d13;
          border-radius: 10px;
          font-size: 13px;
          line-height: 1.6;
          overflow-wrap: anywhere;
        }

        .sell-wallet {
          padding: 12px;
          background: #f0f7e9;
          border-radius: 10px;
          font-size: 12px;
          line-height: 1.7;
          overflow-wrap: anywhere;
        }

        .sell-preview-image {
          width: 100%;
          max-height: 360px;
          object-fit: cover;
          border-radius: 12px;
          margin: 12px 0;
        }

        @media (max-width: 420px) {
          .sell-card {
            padding: 15px;
          }

          .sell-photo-grid {
            grid-template-columns: repeat(3, minmax(0, 1fr));
            gap: 7px;
          }

          .sell-cover-badge,
          .sell-photo-cover {
            font-size: 9px;
            padding: 4px 5px;
          }

          .sell-two-columns {
            gap: 8px;
          }
        }
      `}</style>

      <div className="sell-container">
        {!showPreview ? (
          <>
            <h1 className="sell-heading">Sell on SolMart</h1>

            <p className="sell-subtitle">
              List your product, add clear photos, and prepare it for buyers
              on SolMart.
            </p>

            <section className="sell-card">
              <h2 className="sell-section-title">Product photos</h2>

              <p className="sell-help">
                Add up to 10 photos of the same product. Each image must be
                10 MB or smaller. Choose a cover photo to display first.
              </p>

              <div className="sell-photo-grid">
                {photos.map((photo) => (
                  <div className="sell-photo" key={photo.id}>
                    <img src={photo.preview} alt="Product preview" />

                    {coverId === photo.id ? (
                      <span className="sell-cover-badge">Cover photo</span>
                    ) : (
                      <button
                        type="button"
                        className="sell-photo-cover"
                        onClick={() => setCoverId(photo.id)}
                      >
                        Set cover
                      </button>
                    )}

                    <button
                      type="button"
                      className="sell-photo-remove"
                      aria-label="Remove photo"
                      onClick={() => removePhoto(photo.id)}
                    >
                      ×
                    </button>
                  </div>
                ))}

                {photos.length < MAX_PHOTOS && (
                  <button
                    type="button"
                    className="sell-add-photo"
                    onClick={() => fileInputRef.current?.click()}
                  >
                    <span>＋</span>
                    Add photos
                    <small>
                      {photos.length}/{MAX_PHOTOS}
                    </small>
                  </button>
                )}
              </div>

              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                multiple
                onChange={handlePhotoSelection}
                style={{ display: 'none' }}
              />

              {photos.length > 0 && (
                <p className="sell-help" style={{ marginTop: 12, marginBottom: 0 }}>
                  {photos.length} photo{photos.length === 1 ? '' : 's'} selected.
                  Tap “Set cover” to change the main image.
                </p>
              )}
            </section>

            <section className="sell-card">
              <h2 className="sell-section-title">Product information</h2>

              <p className="sell-help">
                Give buyers enough information to understand exactly what
                you are selling.
              </p>

              <div className="sell-field">
                <label style={labelStyle}>Product name *</label>
                <input
                  style={inputStyle}
                  value={productName}
                  onChange={(e) => setProductName(e.target.value)}
                  placeholder="e.g. iPhone 13 Pro"
                  maxLength={100}
                />
              </div>

              <div className="sell-field">
                <label style={labelStyle}>Category *</label>
                <select
                  style={inputStyle}
                  value={category}
                  onChange={(e) => setCategory(e.target.value)}
                >
                  {categories.map((item) => (
                    <option key={item} value={item}>
                      {item}
                    </option>
                  ))}
                </select>
              </div>

              <div className="sell-field">
                <label style={labelStyle}>Description *</label>
                <textarea
                  className="sell-textarea"
                  style={inputStyle}
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Describe the product, its features, and anything buyers should know."
                  maxLength={3000}
                />
                <small style={{ color: '#78877c' }}>
                  {description.length}/3000 characters
                </small>
              </div>

              <div className="sell-field">
                <label style={labelStyle}>Product condition *</label>
                <select
                  style={inputStyle}
                  value={condition}
                  onChange={(e) => setCondition(e.target.value)}
                >
                  <option value="New">New</option>
                  <option value="Used - Like New">Used - Like New</option>
                  <option value="Used - Good">Used - Good</option>
                  <option value="Used - Fair">Used - Fair</option>
                </select>
              </div>
            </section>

            <section className="sell-card">
              <h2 className="sell-section-title">Price and availability</h2>

              <p className="sell-help">
                Choose the cryptocurrency in which you want to price your item.
                This does not initiate a payment.
              </p>

              <div className="sell-two-columns">
                <div className="sell-field">
                  <label style={labelStyle}>Price *</label>
                  <input
                    style={inputStyle}
                    type="number"
                    min="0"
                    step="any"
                    inputMode="decimal"
                    value={price}
                    onChange={(e) => setPrice(e.target.value)}
                    placeholder="0.00"
                  />
                </div>

                <div className="sell-field">
                  <label style={labelStyle}>Currency *</label>
                  <select
                    style={inputStyle}
                    value={currency}
                    onChange={(e) => setCurrency(e.target.value)}
                  >
                    <option value="SOL">SOL</option>
                    <option value="USDC">USDC</option>
                  </select>
                </div>
              </div>

              <div className="sell-field">
                <label style={labelStyle}>Available quantity *</label>
                <input
                  style={inputStyle}
                  type="number"
                  min="1"
                  step="1"
                  inputMode="numeric"
                  value={quantity}
                  onChange={(e) => setQuantity(e.target.value)}
                />
              </div>

              <div className="sell-field">
                <label style={labelStyle}>Product location *</label>
                <input
                  style={inputStyle}
                  value={location}
                  onChange={(e) => setLocation(e.target.value)}
                  placeholder="e.g. Port Harcourt, Rivers State"
                  maxLength={120}
                />
              </div>
            </section>

            <section className="sell-card">
              <h2 className="sell-section-title">Seller wallet</h2>

              <p className="sell-help">
                Your connected wallet will be associated with the listing.
                SolMart is currently configured for Solana Devnet.
              </p>

              <div className="sell-wallet">
                <strong>Status: </strong>
                {connected && publicKey ? 'Wallet connected' : 'Wallet not connected'}
                <br />

                <strong>Network: </strong>
                Solana Devnet
                <br />

                <strong>Wallet address: </strong>
                {publicKey?.toBase58() ?? 'Connect your wallet to continue'}
              </div>

              {!connected && (
                <p className="sell-help" style={{ marginTop: 12, marginBottom: 0 }}>
                  Use the wallet button in the main SolMart header to connect
                  Phantom or Solflare.
                </p>
              )}
            </section>

            <button
              type="button"
              className="sell-primary-button"
              onClick={handlePreview}
            >
              Preview product listing
            </button>
          </>
        ) : (
          <>
            <h1 className="sell-heading">Review your listing</h1>

            <p className="sell-subtitle">
              Check your product details before continuing.
            </p>

            <section className="sell-card">
              {coverPhoto && (
                <img
                  className="sell-preview-image"
                  src={coverPhoto.preview}
                  alt={productName}
                />
              )}

              <h2 className="sell-section-title">{productName}</h2>

              <p style={{ fontSize: 20, fontWeight: 800 }}>
                {price} {currency}
              </p>

              <p style={{ color: '#718075', fontSize: 13 }}>
                {category} · {condition}
              </p>

              <p style={{ lineHeight: 1.7, whiteSpace: 'pre-wrap' }}>
                {description}
              </p>

              <p>Quantity: {quantity}</p>
              <p>Location: {location}</p>

              <p>
                Photos: {photos.length}
              </p>

              <div className="sell-photo-grid">
                {photos.map((photo) => (
                  <div className="sell-photo" key={photo.id}>
                    <img src={photo.preview} alt="Product preview" />
                    {coverId === photo.id && (
                      <span className="sell-cover-badge">Cover photo</span>
                    )}
                  </div>
                ))}
              </div>

              <hr
                style={{
                  border: 0,
                  borderTop: '1px solid #e5ece5',
                  margin: '20px 0',
                }}
              />

              <div className="sell-wallet">
                <strong>Seller wallet</strong>
                <br />
                {publicKey?.toBase58()}
                <br />
                <strong>Network:</strong> Devnet
              </div>
            </section>

            <button
              type="button"
              className="sell-secondary-button"
              onClick={() => {
                setShowPreview(false)
                setNotice('')
              }}
            >
              ← Edit listing
            </button>

            <button
              type="button"
              className="sell-primary-button"
              onClick={handleSubmit}
            >
              Continue to publish
            </button>
          </>
        )}

        {notice && (
          <div className="sell-notice" role="status">
            {notice}
          </div>
        )}

        <p
          style={{
            marginTop: 20,
            fontSize: 11,
            lineHeight: 1.7,
            color: '#849087',
            textAlign: 'center',
          }}
        >
          SolMart is under development. Product publishing, permanent photo
          storage, and payments are not connected yet. Never send funds to
          complete this form.
        </p>
      </div>
    </main>
  )
}
