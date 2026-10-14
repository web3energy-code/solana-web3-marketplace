import { useMemo, useState } from 'react'
import { useWallet } from '@solana/wallet-adapter-react'

type Product = {
  id: string | number
  name: string
  price: number
  currency: 'USDC' | 'SOL'
  quantity: number
  image_urls?: string[]
  image_url?: string
  seller_wallet?: string
}

type Props = {
  products: Product[]
  cart: Record<string, number>
  changeQuantity: (id: string | number, amount: number) => void
  onBack?: () => void
}

export default function CheckoutPage({
  products,
  cart,
  onBack,
}: Props) {
  const { publicKey, wallet } = useWallet()

  const [currency, setCurrency] = useState<'USDC' | 'SOL'>('USDC')
  const [address, setAddress] = useState('')
  const [notice, setNotice] = useState('')
  const [addressError, setAddressError] = useState(false)

  const items = useMemo(
    () =>
      products
        .filter((product) => (cart[String(product.id)] || 0) > 0)
        .map((product) => ({
          ...product,
          cartQuantity: cart[String(product.id)] || 0,
        })),
    [products, cart],
  )

  const total = items.reduce(
    (sum, item) => sum + Number(item.price) * item.cartQuantity,
    0,
  )

  const mixedCurrencies =
    new Set(items.map((item) => item.currency)).size > 1

  const walletAddress = publicKey?.toBase58() || ''
  const walletName = wallet?.adapter.name || 'No wallet connected'

  const shortAddress = walletAddress
    ? `${walletAddress.slice(0, 4)}…${walletAddress.slice(-4)}`
    : 'Connect wallet first'

  const totalCurrency = items[0]?.currency || 'USDC'

  function money(amount: number) {
    return `$${amount.toLocaleString('en-US', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    })}`
  }

  function productImage(item: Product) {
    return item.image_urls?.[0] || item.image_url || ''
  }

  function showNotice(message: string) {
    setNotice(message)
    window.setTimeout(() => setNotice(''), 3000)
  }

  function handlePay() {
    if (address.trim().length < 8) {
      setAddressError(true)
      showNotice('Enter your delivery address first.')
      return
    }

    setAddressError(false)

    if (!publicKey) {
      showNotice('Connect your Solana wallet before checkout.')
      return
    }

    showNotice(
      'Payments are not connected yet. No funds have been sent.',
    )
  }

  return (
    <div className="sm-checkout">
      <style>{`
        .sm-checkout {
          --head: #0B3D2B;
          --bg: #F2F7F3;
          --card: #FFFFFF;
          --line: #D9E6DD;
          --line2: #C5D8CB;
          --ink: #0C1F16;
          --mute: #52665A;
          --acc: #0F7A3D;
          --tint: #E4F3E9;
          --tint-line: #B7DEC4;
          min-height: 100%;
          background: var(--bg);
          color: var(--ink);
          font-family: Manrope, system-ui, -apple-system,
            BlinkMacSystemFont, "Segoe UI", sans-serif;
          font-size: 15px;
          line-height: 1.45;
          padding-top: env(safe-area-inset-top, 0px);
          padding-bottom: env(safe-area-inset-bottom, 0px);
        }

        .sm-checkout * { box-sizing: border-box; }
        .sm-checkout button,
        .sm-checkout input,
        .sm-checkout textarea { font: inherit; }
        .sm-checkout button { cursor: pointer; }
        .sm-checkout button:focus-visible,
        .sm-checkout textarea:focus-visible {
          outline: 2px solid var(--acc);
          outline-offset: 3px;
        }

        .sm-app {
          max-width: 480px;
          min-height: 100vh;
          margin: 0 auto;
          display: flex;
          flex-direction: column;
        }

        .sm-header {
          background: var(--head);
          color: white;
          padding: 14px 16px 14px 8px;
          display: flex;
          align-items: center;
          gap: 6px;
        }

        .sm-back {
          width: 44px;
          height: 44px;
          display: grid;
          place-items: center;
          color: white;
          border-radius: 10px;
          flex: 0 0 auto;
        }

        .sm-back:hover { background: #14573D; }

        .sm-header h1 {
          font-size: 19px;
          font-weight: 800;
          letter-spacing: -.02em;
          flex: 1;
          margin: 0;
        }

        .sm-net {
          font-size: 12px;
          font-weight: 700;
          padding: 5px 10px;
          border-radius: 999px;
          background: #14573D;
          color: #BFF0D4;
          white-space: nowrap;
        }

        .sm-main {
          padding: 16px;
          display: flex;
          flex-direction: column;
          gap: 14px;
          flex: 1;
        }

        .sm-card {
          background: var(--card);
          border: 1px solid var(--line);
          border-radius: 16px;
          padding: 14px;
        }

        .sm-item {
          display: flex;
          gap: 12px;
          align-items: center;
          padding: 12px;
        }

        .sm-thumb {
          width: 72px;
          height: 72px;
          border-radius: 12px;
          background: linear-gradient(135deg, #0F7A3D, #6FD39A);
          display: grid;
          place-items: center;
          color: white;
          flex: 0 0 auto;
          overflow: hidden;
        }

        .sm-thumb img {
          width: 100%;
          height: 100%;
          object-fit: cover;
        }

        .sm-info { flex: 1; min-width: 0; }

        .sm-info b {
          display: block;
          font-size: 14px;
          overflow-wrap: anywhere;
        }

        .sm-info span {
          display: block;
          font-size: 12px;
          color: var(--mute);
          overflow-wrap: anywhere;
        }

        .sm-price {
          font-weight: 800;
          font-size: 14px;
          color: var(--acc);
          white-space: nowrap;
        }

        .sm-checkout .sm-card h2,
        .sm-checkout .sm-card label {
          display: block;
          font-size: 14px;
          font-weight: 700;
          margin: 0 0 10px;
        }

        .sm-address {
          width: 100%;
          height: 68px;
          border: 1px solid var(--line2);
          border-radius: 10px;
          padding: 10px 12px;
          font-size: 13px;
          resize: vertical;
          background: transparent;
          color: var(--ink);
        }

        .sm-address::placeholder { color: var(--mute); }

        .sm-err {
          color: #C0392B;
          font-size: 12px;
          margin-top: 8px;
        }

        .sm-tokens { display: flex; gap: 10px; }

        .sm-token {
          flex: 1;
          min-width: 0;
          min-height: 56px;
          border-radius: 12px;
          border: 1px solid var(--line2);
          background: var(--card);
          color: var(--ink);
          font-weight: 800;
          font-size: 15px;
          padding: 7px;
          text-align: center;
        }

        .sm-token small {
          display: block;
          font-weight: 600;
          font-size: 11px;
          color: var(--mute);
          overflow-wrap: anywhere;
        }

        .sm-token[aria-pressed="true"] {
          border: 2px solid var(--acc);
          background: var(--tint);
        }

        .sm-wallet {
          display: flex;
          align-items: center;
          gap: 9px;
          margin-top: 12px;
          padding-top: 12px;
          border-top: 1px solid var(--line);
          min-width: 0;
        }

        .sm-dot {
          width: 8px;
          height: 8px;
          border-radius: 50%;
          background: ${walletAddress ? '#16A34A' : '#9CA3AF'};
          flex: 0 0 auto;
        }

        .sm-who {
          flex: 1;
          min-width: 0;
          font-size: 12px;
          overflow-wrap: anywhere;
        }

        .sm-mono {
          font-family: ui-monospace, Menlo, Consolas, monospace;
          color: var(--mute);
          font-size: 11px;
        }

        .sm-link {
          color: var(--acc);
          font-weight: 700;
          font-size: 12px;
          min-height: 40px;
          padding: 0 4px;
          flex: 0 0 auto;
        }

        .sm-row {
          display: flex;
          justify-content: space-between;
          gap: 12px;
          padding: 4px 0;
          font-size: 13px;
        }

        .sm-row span:first-child { color: var(--mute); }
        .sm-row span:last-child { text-align: right; }

        .sm-total {
          display: flex;
          justify-content: space-between;
          align-items: baseline;
          gap: 12px;
          margin-top: 6px;
          padding-top: 10px;
          border-top: 1px solid var(--line);
        }

        .sm-total b { font-size: 14px; }
        .sm-total .sm-amount {
          font-size: 19px;
          color: var(--acc);
          overflow-wrap: anywhere;
        }

        .sm-total small {
          display: block;
          text-align: right;
          font-size: 11px;
          color: var(--mute);
        }

        .sm-escrow {
          background: var(--tint);
          border: 1px solid var(--tint-line);
          border-radius: 14px;
          padding: 12px 14px;
          display: flex;
          gap: 12px;
          font-size: 12px;
          line-height: 1.5;
        }

        .sm-escrow svg {
          flex: 0 0 auto;
          margin-top: 1px;
          color: var(--acc);
        }

        .sm-rate {
          color: var(--mute);
          font-size: 11px;
          margin-top: 10px;
          line-height: 1.5;
        }

        .sm-footer {
          position: sticky;
          bottom: 0;
          background: var(--card);
          border-top: 1px solid var(--line);
          padding: 12px 16px calc(16px + env(safe-area-inset-bottom, 0px));
        }

        .sm-pay {
          width: 100%;
          min-height: 54px;
          border-radius: 14px;
          background: var(--acc);
          color: white;
          font-weight: 800;
          font-size: 15px;
          padding: 10px;
        }

        .sm-pay:disabled {
          opacity: .55;
          cursor: not-allowed;
        }

        .sm-footer p {
          text-align: center;
          font-size: 11px;
          color: var(--mute);
          margin: 8px 0 0;
        }

        .sm-toast {
          position: fixed;
          z-index: 999;
          left: 50%;
          bottom: 110px;
          transform: translateX(-50%);
          background: var(--head);
          color: white;
          padding: 10px 16px;
          border-radius: 10px;
          font-size: 12px;
          font-weight: 600;
          max-width: 88%;
          width: max-content;
          text-align: center;
          box-shadow: 0 6px 24px #0002;
        }

        @media (prefers-color-scheme: dark) {
          .sm-checkout {
            --bg: #07140E;
            --card: #0E2218;
            --line: #1C3A2B;
            --line2: #2A4D3A;
            --ink: #EAF6EE;
            --mute: #9DB8A8;
            --acc: #2FBF71;
            --tint: #12362A;
            --tint-line: #1F5A41;
          }
          .sm-pay { color: #04140C; }
        }
      `}</style>

      <div className="sm-app">
        <header className="sm-header">
          <button
            type="button"
            className="sm-back"
            aria-label="Back to marketplace"
            onClick={onBack}
          >
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none"
              stroke="currentColor" strokeWidth="2"
              strokeLinecap="round" strokeLinejoin="round">
              <path d="M15 5l-7 7 7 7" />
            </svg>
          </button>

          <h1>Checkout</h1>
          <span className="sm-net">Devnet</span>
        </header>

        <main className="sm-main">
          {items.length === 0 ? (
            <section className="sm-card" style={{ textAlign: 'center', padding: 28 }}>
              <h2>Your cart is empty</h2>
              <p style={{ color: 'var(--mute)', fontSize: 13 }}>
                Add a product to your cart before checking out.
              </p>
              <button type="button" className="sm-link" onClick={onBack}>
                Back to marketplace
              </button>
            </section>
          ) : (
            <>
              {items.map((item) => {
                const image = productImage(item)

                return (
                  <section
                    className="sm-card sm-item"
                    aria-label="Order item"
                    key={String(item.id)}
                  >
                    <div className="sm-thumb">
                      {image ? (
                        <img src={image} alt={item.name} />
                      ) : (
                        <svg width="30" height="30" viewBox="0 0 24 24"
                          fill="none" stroke="currentColor"
                          strokeWidth="1.7" strokeLinecap="round"
                          strokeLinejoin="round" aria-hidden="true">
                          <path d="M5 8h14l-1 12H6z" />
                          <path d="M9 8V6a3 3 0 0 1 6 0v2" />
                        </svg>
                      )}
                    </div>

                    <div className="sm-info">
                      <b>{item.name}</b>
                      <span>Quantity: {item.cartQuantity}</span>
                      <span>
                        {item.seller_wallet
                          ? `Seller: ${item.seller_wallet.slice(0, 4)}…${item.seller_wallet.slice(-4)}`
                          : 'SolMart marketplace'}
                      </span>
                    </div>

                    <div className="sm-price">
                      {money(Number(item.price) * item.cartQuantity)}
                    </div>
                  </section>
                )
              })}

              <section className="sm-card">
                <label htmlFor="sm-delivery">Delivery address</label>
                <textarea
                  id="sm-delivery"
                  className="sm-address"
                  value={address}
                  onChange={(event) => {
                    setAddress(event.target.value)
                    if (event.target.value.trim().length >= 8) {
                      setAddressError(false)
                    }
                  }}
                  placeholder="Street, city and a phone number for the courier"
                  aria-invalid={addressError}
                />

                {addressError && (
                  <div className="sm-err" role="alert">
                    Enter your delivery address so the seller can ship.
                  </div>
                )}
              </section>

              <section className="sm-card">
                <h2>Pay with</h2>

                <div className="sm-tokens" role="group" aria-label="Payment token">
                  <button
                    type="button"
                    className="sm-token"
                    aria-pressed={currency === 'USDC'}
                    onClick={() => setCurrency('USDC')}
                  >
                    USDC
                    <small>Dollar stablecoin</small>
                  </button>

                  <button
                    type="button"
                    className="sm-token"
                    aria-pressed={currency === 'SOL'}
                    onClick={() => setCurrency('SOL')}
                  >
                    ◎ SOL
                    <small>Solana</small>
                  </button>
                </div>

                <div className="sm-wallet">
                  <span className="sm-dot" />

                  <div className="sm-who">
                    <b>{walletName}</b>{' '}
                    <span className="sm-mono">{shortAddress}</span>
                  </div>

                  <button
                    type="button"
                    className="sm-link"
                    onClick={() =>
                      showNotice(
                        'Connect or switch your wallet using the marketplace wallet button.',
                      )
                    }
                  >
                    Change
                  </button>
                </div>

                <div className="sm-rate">
                  {currency === 'SOL'
                    ? 'Live SOL/USD rate and locked quote are not connected yet.'
                    : 'USDC is intended to be priced against the US dollar.'}
                </div>
              </section>

              <section className="sm-card" aria-label="Order summary">
                <div className="sm-row">
                  <span>Item price</span>
                  <span>{money(total)}</span>
                </div>

                <div className="sm-row">
                  <span>Delivery</span>
                  <span>Calculated at checkout</span>
                </div>

                <div className="sm-row">
                  <span>Network fee</span>
                  <span>Shown by wallet</span>
                </div>

                <div className="sm-total">
                  <span><b>Total</b></span>

                  <span>
                    <b className="sm-amount">
                      {currency === 'SOL'
                        ? 'SOL quote unavailable'
                        : `${total.toFixed(2)} USDC`}
                    </b>
                    <small>Item subtotal: {money(total)}</small>
                  </span>
                </div>

                {mixedCurrencies && (
                  <div className="sm-rate">
                    Your cart contains listings with different currencies.
                    The final payable amount must be calculated by the
                    checkout service.
                  </div>
                )}
              </section>

              <div className="sm-escrow">
                <svg width="22" height="22" viewBox="0 0 24 24"
                  fill="none" stroke="currentColor" strokeWidth="1.8"
                  strokeLinecap="round" strokeLinejoin="round"
                  aria-hidden="true">
                  <path d="M12 3l8 3v6c0 5-3.4 8.4-8 9-4.6-.6-8-4-8-9V6z" />
                  <path d="M8.5 12l2.5 2.5 4.5-5" />
                </svg>

                <div>
                  <b>Protected by escrow.</b>{' '}
                  Your payment should be held until you confirm delivery.
                  Seller payouts and dispute protection must be enforced
                  by the marketplace escrow system.
                </div>
              </div>
            </>
          )}
        </main>

        {items.length > 0 && (
          <footer className="sm-footer">
            <button
              type="button"
              className="sm-pay"
              onClick={handlePay}
              disabled={!publicKey}
            >
              {!publicKey
                ? 'Connect wallet to continue'
                : currency === 'SOL'
                  ? 'SOL payment coming soon'
                  : 'Checkout opens soon'}
            </button>

            <p>You will approve any payment in your wallet.</p>
          </footer>
        )}
      </div>

      {notice && (
        <div className="sm-toast" role="status">
          {notice}
        </div>
      )}
    </div>
  )
}
