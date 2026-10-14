import { useState } from 'react'

export default function CheckoutPage() {
  const [currency, setCurrency] = useState<'USDC' | 'SOL'>('USDC')

  return (
    <main className="checkout-page">
      <h1>Checkout</h1>
      <p>Choose how you want to pay.</p>

      <button
        type="button"
        onClick={() => setCurrency('USDC')}
        aria-pressed={currency === 'USDC'}
      >
        Pay with USDC
      </button>

      <button
        type="button"
        onClick={() => setCurrency('SOL')}
        aria-pressed={currency === 'SOL'}
      >
        Pay with SOL
      </button>

      <p>Selected payment: {currency}</p>
      <p>Payment processing is not connected yet.</p>
    </main>
  )
}
