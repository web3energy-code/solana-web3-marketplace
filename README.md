# Solana Web3 Marketplace

A modern, mobile-first Nigerian-inspired e-commerce marketplace for buying and selling products with real Solana wallet integration and genuine blockchain payments.

## 🚀 Project Overview

This is a **production-ready** marketplace built as a monorepo with:

- **Frontend**: Vite + React + TypeScript + Tailwind CSS
- **Backend**: Node.js + Express + TypeScript
- **Database**: PostgreSQL (Supabase)
- **Blockchain**: Solana Web3.js with real wallet integration
- **Authentication**: Supabase Auth (Postgres Auth)
- **Payment Verification**: Server-side validation of Solana transactions

## ✨ Key Features

### For Customers
- Browse and search products across multiple categories
- Filter by price, category, and ratings
- Add products to cart
- Checkout with real Solana wallet (Phantom, Solflare, etc.)
- Pay in SOL or USDC
- View order history and track orders
- Leave reviews and ratings

### For Sellers
- Create and manage product listings
- Upload product images to Supabase Storage
- Monitor incoming orders
- Update order fulfillment status
- Track sales and revenue
- View seller dashboard

### Security & Reliability
- ✅ Real Solana wallet connection (not mocked)
- ✅ Real blockchain payments with RPC verification
- ✅ Server-side payment validation
- ✅ Row-level security with Supabase Auth
- ✅ Inventory management and stock tracking
- ✅ Secure order management
- ✅ No hardcoded credentials

## 🏗️ Project Structure

```
solana-web3-marketplace/
├── apps/
│   ├── web/                    # Frontend (Vite + React)
│   │   ├── src/
│   │   │   ├── components/     # React components
│   │   │   ├── pages/          # Page components
│   │   │   ├── hooks/          # Custom React hooks
│   │   │   ├── services/       # Supabase, Solana clients
│   │   │   ├── types/          # TypeScript types
│   │   │   ├── styles/         # Global styles
│   │   │   └── main.tsx        # Entry point
│   │   ├── vite.config.ts
│   │   └── package.json
│   │
│   └── api/                    # Backend (Express)
│       ├── src/
│       │   ├── routes/         # API endpoints
│       │   ├── middleware/     # Auth, validation, error handling
│       │   ├── services/       # Business logic
│       │   ├── utils/          # Helper functions
│       │   ├── types/          # TypeScript interfaces
│       │   └── server.ts       # Express app
│       ├── tests/              # Test files
│       └── package.json
│
├── packages/
│   └── shared/                 # Shared types and validation
│       ├── src/
│       │   ├── types/          # Shared TypeScript types
│       │   ├── validation/     # Zod schemas
│       │   └── constants/      # Shared constants
│       └── package.json
│
├── db/
│   ├── schema.sql              # Database schema
│   ├── migrations.sql          # Database migrations
│   ├── seed.sql                # Sample data
│   └── README.md               # Database setup instructions
│
├── .env.example                # Environment template
├── package.json                # Root monorepo config
└── README.md                   # This file
```

## 📋 Prerequisites

- **Node.js** 18.17.0 or higher
- **npm** 9.0.0 or higher
- **Supabase account** with a PostgreSQL project
- **Solana wallet** (Phantom or compatible wallet for testing)
- **SOL or USDC** on devnet for testing (or mainnet for production)

## 🔧 Installation & Setup

### 1. Clone the repository

```bash
git clone https://github.com/web3energy-code/solana-web3-marketplace.git
cd solana-web3-marketplace
```

### 2. Install dependencies

```bash
npm install
```

### 3. Set up environment variables

```bash
cp .env.example .env
```

Edit `.env` with your configuration:

#### Supabase Setup
1. Go to [Supabase Console](https://app.supabase.com)
2. Create a new project or select existing project
3. Go to **Settings > API** to find:
   - Project URL → `VITE_SUPABASE_URL` and `SUPABASE_URL`
   - Anon Public Key → `VITE_SUPABASE_PUBLISHABLE_KEY`
   - Service Role Key → `SUPABASE_SERVICE_ROLE_KEY` (backend only)
   - JWT Secret → `SUPABASE_JWT_SECRET` (from Settings > API > JWT Settings)

#### Database Setup
1. In Supabase Console, go to **SQL Editor**
2. Create a new query and run:
   ```sql
   -- Copy the entire content from db/schema.sql
   ```
3. Then run migrations from `db/migrations.sql`
4. Optionally seed sample data with `db/seed.sql`

#### Solana Configuration
1. Set `SOLANA_NETWORK` to `devnet` (development) or `mainnet-beta` (production)
2. Set `RECEIVING_WALLET` to your Solana wallet address where payments will arrive
3. For USDC, use the correct mint address:
   - **Devnet**: `4zMMC9sZKeLbbJiHXU1MrZLyGpRqKXvxKniPZj2suVs`
   - **Mainnet**: `EPjFWdd5Au17plusvxSxDw5ed8dRTg2u9d1XAuto3c`

#### Security Keys
Generate random secrets for local development:
```bash
# Generate a 32+ character random secret
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

Use the output for `JWT_SECRET` and `SESSION_SECRET`.

### 4. Start development server

```bash
npm run dev
```

This starts both frontend (http://localhost:5173) and backend (http://localhost:4000) in parallel.

### 5. Build for production

```bash
npm run build
```

## 🧪 Testing

### Run backend tests
```bash
npm run test
```

### Manual wallet testing
1. Install [Phantom Wallet](https://phantom.app/) browser extension
2. Create or import a devnet wallet
3. Get devnet SOL from [Solana Faucet](https://faucet.solana.com)
4. Visit http://localhost:5173 and click "Connect Wallet"
5. Approve the connection in Phantom

### Payment flow testing
1. Add a product to cart
2. Proceed to checkout
3. Confirm payment in your wallet
4. Backend verifies transaction on Solana RPC
5. Order status updates to "payment_confirmed"

## 🚀 Deployment

### Frontend (Vercel, Netlify, etc.)

1. **Vercel**:
   ```bash
   npm install -g vercel
   vercel
   ```
   Set environment variables in Vercel dashboard (only VITE_* variables)

2. **Netlify**:
   - Connect GitHub repo
   - Set build command: `npm run build:web`
   - Set publish directory: `apps/web/dist`
   - Add environment variables

### Backend (Render, Railway, Fly.io, etc.)

1. **Render**:
   - Create new Web Service
   - Connect GitHub repo
   - Build command: `npm run build:api`
   - Start command: `npm run start`
   - Add environment variables

2. **Railway**:
   - Import GitHub repo
   - Add PostgreSQL plugin
   - Set environment variables

### Database (Supabase)

1. Supabase handles PostgreSQL automatically
2. Backup and restore via Supabase Dashboard
3. Use Supabase CLI for migrations in production

### Solana Mainnet Production

⚠️ **Before going live:**
- Switch `SOLANA_NETWORK` to `mainnet-beta`
- Update RPC URL to mainnet endpoint
- Use mainnet USDC mint address
- Thoroughly test payment verification
- Implement proper monitoring and logging
- Set up wallet for receiving real payments

## 🔐 Security Considerations

### ✅ What We Do
- ✅ Server-side payment verification via Solana RPC
- ✅ Never trust frontend-only payment claims
- ✅ Supabase RLS policies prevent unauthorized access
- ✅ JWT-based authentication
- ✅ Environment variables for all secrets
- ✅ Input validation on backend
- ✅ No hardcoded credentials in code

### ❌ What We Don't Do
- ❌ Never ask for wallet seed phrases
- ❌ Never store user private keys
- ❌ Never use fake wallet connections
- ❌ Never claim payments succeeded without verification
- ❌ Never expose service-role keys to browser
- ❌ Never hardcode payment addresses

## 📚 API Documentation

### Authentication
```
POST /auth/signup      - Create account
POST /auth/login       - Login with email/password
POST /auth/logout      - Logout
GET  /auth/me          - Get current user
POST /auth/refresh     - Refresh JWT token
```

### Products
```
GET    /products              - List products (with filters)
GET    /products/:id          - Get product detail
POST   /products              - Create product (seller only)
PATCH  /products/:id          - Update product (owner only)
DELETE /products/:id          - Delete product (owner only)
GET    /products/:id/reviews  - Get product reviews
```

### Orders
```
GET    /orders         - List user's orders
GET    /orders/:id     - Get order detail
POST   /orders         - Create order
PATCH  /orders/:id     - Update order status (seller)
GET    /orders/:id/receipt - Get order receipt
```

### Payments
```
POST   /payments/verify      - Verify Solana transaction
GET    /payments/:id/status  - Check payment status
GET    /payments/:id/receipt - Get payment receipt
```

### Cart
```
GET    /cart           - Get shopping cart
POST   /cart/items     - Add to cart
PATCH  /cart/items/:id - Update cart item
DELETE /cart/items/:id - Remove from cart
POST   /cart/clear     - Clear entire cart
```

See `apps/api/src/routes` for complete implementation.

## 🛠️ Troubleshooting

### Supabase connection fails
- Check `VITE_SUPABASE_URL` and `VITE_SUPABASE_PUBLISHABLE_KEY` are correct
- Verify your Supabase project is active
- Check network connectivity

### Wallet won't connect
- Ensure Phantom or compatible wallet is installed
- Check browser console for connection errors
- Try different Solana network settings
- Clear browser cache and restart

### Payment verification fails
- Verify transaction signature is correct
- Check Solana RPC URL is reachable
- Ensure receiving wallet address is valid
- Check token mint address matches network

### Database schema issues
- Run schema from `db/schema.sql` in Supabase SQL Editor
- Verify RLS policies are enabled
- Check user has appropriate permissions

## 📖 Resources

- [Supabase Docs](https://supabase.com/docs)
- [Solana Docs](https://docs.solana.com)
- [Solana Web3.js](https://solana-labs.github.io/solana-web3.js/)
- [Phantom Wallet](https://phantom.app/)
- [Wallet Adapter](https://github.com/solana-labs/wallet-adapter)
- [React Docs](https://react.dev)
- [Tailwind CSS](https://tailwindcss.com)
- [Express Docs](https://expressjs.com)

## 📄 License

MIT License - see LICENSE file for details

## 🤝 Contributing

Contributions welcome! Please:
1. Fork the repository
2. Create a feature branch
3. Commit your changes
4. Push to the branch
5. Open a pull request

## 📧 Support

For issues, questions, or suggestions, please open a GitHub issue or contact the development team.

---

**Built with ❤️ for Web3 in Nigeria** 🇳🇬
