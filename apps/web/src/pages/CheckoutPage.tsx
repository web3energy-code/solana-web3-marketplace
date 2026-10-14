import { useMemo, useState } from 'react'
import {
  ArrowLeft,
  ShieldCheck,
  LockKeyhole,
  Wallet,
  Minus,
  Plus,
  Trash2,
  ShoppingBag,
  BadgeCheck,
  Clock3,
  Coins,
  ArrowRight,
  Info,
} from 'lucide-react'

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
  changeQuantity,
  onBack,
}: Props) {
  const [currency, setCurrency] = useState<'USDC' | 'SOL'>('USDC')
  const [notice, setNotice] = useState('')

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

  const itemCount = items.reduce(
    (sum, item) => sum + item.cartQuantity,
    0,
  )

  const mixedCurrencies =
    new Set(items.map((item) => item.currency)).size > 1

  function formatMoney(amount: number, unit: string) {
    return `${unit === 'USDC' ? '$' : ''}${amount.toLocaleString(
      'en-US',
      {
        minimumFractionDigits: 2,
        maximumFractionDigits: 4,
      },
    )}${unit === 'SOL' ? ' SOL' : ''}`
  }

  function getImage(item: Product) {
    return item.image_urls?.[0] || item.image_url || ''
  }

  function handlePayment() {
    setNotice(
      'Payment processing is not connected yet. No funds have been sent.',
    )
  }

  return (
    <main className="min-h-screen bg-[#f7f8f4] px-4 py-6 text-[#17251d] sm:px-6 lg:px-10">
      <div className="mx-auto max-w-6xl">
        <button
          type="button"
          onClick={onBack}
          className="mb-7 inline-flex items-center gap-2 rounded-full border border-[#e3e8df] bg-white px-4 py-2.5 text-sm font-semibold transition hover:bg-[#f0f5ec]"
        >
          <ArrowLeft size={17} />
          Back to marketplace
        </button>

        <div className="mb-8">
          <div className="mb-3 inline-flex items-center gap-2 rounded-full bg-[#e8f6d8] px-3 py-1.5 text-xs font-bold uppercase tracking-wide text-[#426d21]">
            <LockKeyhole size={14} />
            Secure checkout
          </div>

          <h1 className="text-3xl font-black tracking-tight sm:text-4xl">
            Almost yours.
          </h1>

          <p className="mt-2 max-w-xl text-sm leading-6 text-gray-600 sm:text-base">
            Review your items, choose your payment currency, and get ready
            to complete your order.
          </p>
        </div>

        {items.length === 0 ? (
          <section className="rounded-3xl border border-[#e5e9e1] bg-white px-6 py-14 text-center shadow-sm">
            <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-[#eff7e8] text-[#537f2c]">
              <ShoppingBag size={30} />
            </div>

            <h2 className="text-xl font-extrabold">
              Your cart is empty
            </h2>

            <p className="mx-auto mt-2 max-w-sm text-sm leading-6 text-gray-500">
              Find something you love in the marketplace and it will show
              up here.
            </p>

            <button
              type="button"
              onClick={onBack}
              className="mt-6 rounded-xl bg-[#c6f36b] px-6 py-3 font-bold transition hover:bg-[#b8e85b]"
            >
              Explore marketplace
            </button>
          </section>
        ) : (
          <div className="grid gap-6 lg:grid-cols-[1fr_360px]">
            <section className="space-y-5">
              <div className="rounded-3xl border border-[#e5e9e1] bg-white p-5 shadow-sm sm:p-6">
                <div className="mb-5 flex items-center justify-between gap-3">
                  <div>
                    <h2 className="text-lg font-extrabold">
                      Your items
                    </h2>
                    <p className="mt-1 text-sm text-gray-500">
                      {itemCount} {itemCount === 1 ? 'item' : 'items'} in
                      your cart
                    </p>
                  </div>

                  <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-[#eff7e8] text-[#537f2c]">
                    <ShoppingBag size={21} />
                  </div>
                </div>

                <div className="divide-y divide-gray-100">
                  {items.map((item) => {
                    const image = getImage(item)

                    return (
                      <article
                        key={String(item.id)}
                        className="flex gap-4 py-5 first:pt-0 last:pb-0"
                      >
                        <div className="h-24 w-24 shrink-0 overflow-hidden rounded-2xl bg-[#f1f3ee] sm:h-28 sm:w-28">
                          {image ? (
                            <img
                              src={image}
                              alt={item.name}
                              className="h-full w-full object-cover"
                            />
                          ) : (
                            <div className="flex h-full w-full items-center justify-center text-[#8a9985]">
                              <ShoppingBag size={28} />
                            </div>
                          )}
                        </div>

                        <div className="flex min-w-0 flex-1 flex-col justify-between gap-3">
                          <div>
                            <h3 className="line-clamp-2 font-bold">
                              {item.name}
                            </h3>

                            <p className="mt-1 text-sm text-gray-500">
                              Listed price:{' '}
                              {formatMoney(
                                Number(item.price),
                                item.currency,
                              )}
                            </p>
                          </div>

                          <div className="flex flex-wrap items-center justify-between gap-3">
                            <div className="inline-flex items-center rounded-xl border border-gray-200">
                              <button
                                type="button"
                                aria-label={`Decrease quantity of ${item.name}`}
                                onClick={() =>
                                  changeQuantity(item.id, -1)
                                }
                                className="p-2.5 text-gray-600 transition hover:bg-gray-50"
                              >
                                <Minus size={15} />
                              </button>

                              <span className="min-w-8 text-center text-sm font-bold">
                                {item.cartQuantity}
                              </span>

                              <button
                                type="button"
                                aria-label={`Increase quantity of ${item.name}`}
                                onClick={() => {
                                  if (
                                    item.cartQuantity >= item.quantity
                                  ) {
                                    setNotice(
                                      'You have reached the available quantity.',
                                    )
                                    return
                                  }

                                  changeQuantity(item.id, 1)
                                }}
                                className="p-2.5 text-gray-600 transition hover:bg-gray-50"
                              >
                                <Plus size={15} />
                              </button>
                            </div>

                            <button
                              type="button"
                              onClick={() =>
                                changeQuantity(
                                  item.id,
                                  -item.cartQuantity,
                                )
                              }
                              aria-label={`Remove ${item.name} from cart`}
                              className="inline-flex items-center gap-1.5 text-xs font-semibold text-red-500 transition hover:text-red-700"
                            >
                              <Trash2 size={14} />
                              Remove
                            </button>
                          </div>
                        </div>
                      </article>
                    )
                  })}
                </div>
              </div>

              <div className="rounded-3xl border border-[#e5e9e1] bg-white p-5 shadow-sm sm:p-6">
                <div className="mb-5">
                  <h2 className="text-lg font-extrabold">
                    How would you like to pay?
                  </h2>

                  <p className="mt-1 text-sm leading-6 text-gray-500">
                    Choose the cryptocurrency you want to use at checkout.
                  </p>
                </div>

                <div className="grid gap-3 sm:grid-cols-2">
                  <button
                    type="button"
                    onClick={() => setCurrency('USDC')}
                    aria-pressed={currency === 'USDC'}
                    className={`rounded-2xl border-2 p-4 text-left transition ${
                      currency === 'USDC'
                        ? 'border-[#7baa42] bg-[#f4faed]'
                        : 'border-gray-100 bg-white hover:border-gray-200'
                    }`}
                  >
                    <div className="mb-4 flex items-center justify-between">
                      <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-[#e6f2ff] text-lg font-black text-[#2775ca]">
                        $
                      </div>

                      <span
                        className={`flex h-5 w-5 items-center justify-center rounded-full border ${
                          currency === 'USDC'
                            ? 'border-[#5f8e31] bg-[#5f8e31] text-white'
                            : 'border-gray-300'
                        }`}
                      >
                        {currency === 'USDC' && (
                          <span className="text-xs">✓</span>
                        )}
                      </span>
                    </div>

                    <p className="font-extrabold">USDC</p>
                    <p className="mt-1 text-xs leading-5 text-gray-500">
                      Dollar-pegged stablecoin
                    </p>
                  </button>

                  <button
                    type="button"
                    onClick={() => setCurrency('SOL')}
                    aria-pressed={currency === 'SOL'}
                    className={`rounded-2xl border-2 p-4 text-left transition ${
                      currency === 'SOL'
                        ? 'border-[#7baa42] bg-[#f4faed]'
                        : 'border-gray-100 bg-white hover:border-gray-200'
                    }`}
                  >
                    <div className="mb-4 flex items-center justify-between">
                      <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-[#eee8ff] text-lg font-black text-[#7951d9]">
                        ◎
                      </div>

                      <span
                        className={`flex h-5 w-5 items-center justify-center rounded-full border ${
                          currency === 'SOL'
                            ? 'border-[#5f8e31] bg-[#5f8e31] text-white'
                            : 'border-gray-300'
                        }`}
                      >
                        {currency === 'SOL' && (
                          <span className="text-xs">✓</span>
                        )}
                      </span>
                    </div>

                    <p className="font-extrabold">Solana (SOL)</p>
                    <p className="mt-1 text-xs leading-5 text-gray-500">
                      Pay with SOL from your wallet
                    </p>
                  </button>
                </div>

                {mixedCurrencies && (
                  <div className="mt-4 flex items-start gap-2 rounded-xl bg-amber-50 p-3 text-xs leading-5 text-amber-800">
                    <Info size={16} className="mt-0.5 shrink-0" />
                    <p>
                      Your cart contains products with different listed
                      currencies. Each seller's listing price must be
                      handled correctly before payment can be completed.
                    </p>
                  </div>
                )}

                <div className="mt-4 flex items-start gap-2 rounded-xl bg-gray-50 p-3 text-xs leading-5 text-gray-600">
                  <Coins size={16} className="mt-0.5 shrink-0" />
                  <p>
                    The live SOL exchange rate and payment quote must be
                    connected before the SOL amount can be calculated.
                  </p>
                </div>
              </div>

              <div className="rounded-3xl border border-[#e5e9e1] bg-white p-5 shadow-sm sm:p-6">
                <div className="flex items-start gap-3">
                  <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-[#eaf6dc] text-[#4e7c27]">
                    <ShieldCheck size={23} />
                  </div>

                  <div>
                    <h2 className="font-extrabold">
                      Buyer protection
                    </h2>

                    <p className="mt-1 text-sm leading-6 text-gray-500">
                      Your marketplace should protect eligible orders
                      while delivery and dispute handling are completed.
                    </p>
                  </div>
                </div>

                <div className="mt-5 grid gap-4 sm:grid-cols-2">
                  <div className="flex gap-3">
                    <BadgeCheck
                      size={19}
                      className="mt-0.5 shrink-0 text-[#65963b]"
                    />

                    <div>
                      <p className="text-sm font-bold">
                        Order tracking
                      </p>
                      <p className="mt-1 text-xs leading-5 text-gray-500">
                        Keep your order details available.
                      </p>
                    </div>
                  </div>

                  <div className="flex gap-3">
                    <Clock3
                      size={19}
                      className="mt-0.5 shrink-0 text-[#65963b]"
                    />

                    <div>
                      <p className="text-sm font-bold">
                        Dispute support
                      </p>
                      <p className="mt-1 text-xs leading-5 text-gray-500">
                        Dispute and release rules must be enforced by
                        the backend.
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </section>

            <aside className="h-fit rounded-3xl border border-[#e5e9e1] bg-white p-5 shadow-sm sm:p-6 lg:sticky lg:top-6">
              <h2 className="text-lg font-extrabold">
                Order summary
              </h2>

              <div className="mt-5 space-y-4">
                <div className="flex items-center justify-between gap-3 text-sm">
                  <span className="text-gray-500">
                    Subtotal ({itemCount}{' '}
                    {itemCount === 1 ? 'item' : 'items'})
                  </span>

                  <span className="font-bold">
                    {formatMoney(total, items[0]?.currency || 'USDC')}
                  </span>
                </div>

                <div className="flex items-center justify-between gap-3 text-sm">
                  <span className="text-gray-500">
                    Network fee
                  </span>
                  <span className="text-right text-xs text-gray-500">
                    Calculated by wallet
                  </span>
                </div>

                <div className="border-t border-dashed border-gray-200 pt-4">
                  <div className="flex items-center justify-between gap-3">
                    <span className="font-bold">Order total</span>

                    <span className="text-xl font-black tracking-tight">
                      {formatMoney(total, items[0]?.currency || 'USDC')}
                    </span>
                  </div>

                  <p className="mt-2 text-xs leading-5 text-gray-500">
                    Displayed total uses the listing currencies. A
                    connected quote service is needed to calculate the
                    exact amount payable in your chosen currency.
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={handlePayment}
                className="mt-6 flex w-full items-center justify-center gap-2 rounded-2xl bg-[#c6f36b] px-5 py-4 font-extrabold text-[#20351a] transition hover:bg-[#b8e85b] active:scale-[0.99]"
              >
                <Wallet size={19} />
                Continue with {currency}
                <ArrowRight size={18} />
              </button>

              {notice && (
                <div
                  role="status"
                  className="mt-4 rounded-xl border border-amber-200 bg-amber-50 p-3 text-xs leading-5 text-amber-900"
                >
                  {notice}
                </div>
              )}

              <div className="mt-5 flex items-center justify-center gap-2 text-xs text-gray-500">
                <LockKeyhole size={14} />
                <span>Checkout interface · Payments not connected</span>
              </div>

              <p className="mt-4 text-center text-[11px] leading-5 text-gray-400">
                Never approve a wallet transaction unless the amount,
                recipient, and network are correct.
              </p>
            </aside>
          </div>
        )}
      </div>
    </main>
  )
}
