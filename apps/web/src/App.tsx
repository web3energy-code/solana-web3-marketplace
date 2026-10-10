import { useMemo, useState } from 'react'
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

type Page = 'marketplace' | 'sell' | 'messages' | 'profile'

const products = [
  { id: 1, name: 'Premium Wireless Headphones', category: 'Electronics', price: 28500, old: 35000, emoji: '🎧', color: '#f0e7dc', rating: 4.8, seller: 'Lagos Tech Hub' },
  { id: 2, name: 'Classic Everyday Sneakers', category: 'Fashion', price: 32000, old: 40000, emoji: '👟', color: '#e5e9df', rating: 4.7, seller: 'Abuja Styles' },
  { id: 3, name: 'Smart Watch Series X', category: 'Electronics', price: 45000, old: 55000, emoji: '⌚', color: '#e6e5ef', rating: 4.9, seller: 'Gadget Plug NG' },
  { id: 4, name: 'Luxury Skincare Set', category: 'Beauty', price: 18500, old: 22000, emoji: '🧴', color: '#f4e5e6', rating: 4.6, seller: 'Glow Essentials' },
  { id: 5, name: 'Everyday Travel Backpack', category: 'Accessories', price: 24000, old: 30000, emoji: '🎒', color: '#e8e1d7', rating: 4.8, seller: 'Urban Finds' },
  { id: 6, name: 'Portable Bluetooth Speaker', category: 'Electronics', price: 19500, old: 25000, emoji: '🔊', color: '#e0eaf0', rating: 4.5, seller: 'Lagos Tech Hub' },
  { id: 7, name: 'Minimalist Wristwatch', category: 'Fashion', price: 22000, old: 28000, emoji: '⌚', color: '#e8e5df', rating: 4.7, seller: 'Abuja Styles' },
  { id: 8, name: 'Everyday Tote Bag', category: 'Accessories', price: 12500, old: 16000, emoji: '👜', color: '#f0e2d3', rating: 4.6, seller: 'Urban Finds' },
]

const categories = [
  'All products',
  'Electronics',
  'Fashion',
  'Beauty',
  'Accessories',
]

const money = (n: number) => '₦' + n.toLocaleString('en-NG')

export default function App() {
  const { publicKey, connected } = useWallet()

  const [activePage, setActivePage] = useState<Page>('marketplace')
  const [search, setSearch] = useState('')
  const [category, setCategory] = useState('All products')
  const [cart, setCart] = useState<Record<number, number>>({})
  const [showCart, setShowCart] = useState(false)
  const [notice, setNotice] = useState('')

  const filtered = useMemo(
    () =>
      products.filter(
        (p) =>
          (category === 'All products' || p.category === category) &&
          (p.name.toLowerCase().includes(search.toLowerCase()) ||
            p.seller.toLowerCase().includes(search.toLowerCase())),
      ),
    [search, category],
  )

  const cartCount = Object.values(cart).reduce((a, b) => a + b, 0)

  const cartTotal = products.reduce(
    (sum, p) => sum + p.price * (cart[p.id] || 0),
    0,
  )

  function showNotice(message: string) {
    setNotice(message)
    window.setTimeout(() => setNotice(''), 3000)
  }

  function addToCart(id: number) {
    setCart((prev) => ({
      ...prev,
      [id]: (prev[id] || 0) + 1,
    }))

    showNotice('Added to your cart')
  }

  function changeQuantity(id: number, amount: number) {
    setCart((prev) => {
      const next = { ...prev, [id]: (prev[id] || 0) + amount }

      if (next[id] <= 0) {
        delete next[id]
      }

      return next
    })
  }

  function navigate(page: Page) {
    setActivePage(page)
    setNotice('')

    window.scrollTo({
      top: 0,
      behavior: 'auto',
    })
  }

  return (
    <div className="app">
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;600;700&family=Manrope:wght@400;500;600;700;800&display=swap');

        * {
          box-sizing: border-box;
        }

        body {
          margin: 0;
          font-family: 'DM Sans', sans-serif;
          color: #20251f;
          background: #fff;
        }

        button, input, select, textarea {
          font: inherit;
        }

        button {
          cursor: pointer;
        }

        .app {
          min-height: 100vh;
          padding-bottom: 82px;
        }

        .topline {
          background: #173d2c;
          color: #fff;
          text-align: center;
          padding: 10px 12px;
          font-size: 12px;
          letter-spacing: .2px;
        }

        .topline b {
          color: #d5f27b;
        }

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

        .searchbox {
          flex: 1;
          position: relative;
          min-width: 0;
        }

        .searchbox input {
          width: 100%;
          padding: 13px 16px 13px 43px;
          border: 1px solid #e5e8e1;
          border-radius: 11px;
          background: #f8f9f6;
          outline: none;
          font-size: 13px;
        }

        .searchbox input:focus {
          border-color: #87b94a;
        }

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

        .cartbtn {
          position: relative;
        }

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

        .herotext {
          position: relative;
          z-index: 1;
          max-width: 560px;
        }

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

        .orbit:before,
        .orbit:after {
          content: '';
          position: absolute;
          border: 1px solid #52715c;
          border-radius: 50%;
          inset: 25px;
        }

        .orbit:after {
          inset: 52px;
        }

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

        .pillone {
          right: -5px;
          top: 42px;
        }

        .pilltwo {
          left: -14px;
          bottom: 37px;
        }

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

        .sub {
          font-size: 12px;
          color: #7b8177;
          margin-top: 7px;
        }

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
        }

        .productemoji {
          font-size: 76px;
          filter: drop-shadow(0 12px 9px #00000014);
        }

        .sale {
          position: absolute;
          left: 12px;
          top: 12px;
          background: #fff;
          border-radius: 6px;
          padding: 6px 8px;
          font-size: 10px;
          font-weight: 800;
          color: #b44c30;
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

        .productbody {
          padding: 15px;
        }

        .seller {
          font-size: 10px;
          color: #83897f;
          margin-bottom: 7px;
        }

        .productname {
          font-size: 13px;
          font-weight: 700;
          line-height: 1.45;
          min-height: 37px;
        }

        .rating {
          font-size: 11px;
          color: #777e73;
          margin: 8px 0;
        }

        .rating span {
          color: #d38c2f;
        }

        .prices {
          display: flex;
          align-items: center;
          gap: 8px;
          flex-wrap: wrap;
        }

        .price {
          font-size: 17px;
          font-weight: 800;
          letter-spacing: -.4px;
        }

        .old {
          font-size: 11px;
          color: #9ca196;
          text-decoration: line-through;
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

        .addbtn:hover {
          background: #c3f17b;
          border-color: #c3f17b;
        }

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

        .trustitem b {
          font-size: 12px;
        }

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

        .drawertop h2 {
          margin: 0;
          font-family: Manrope, sans-serif;
        }

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

        .cartemoji {
          width: 65px;
          height: 65px;
          border-radius: 10px;
          display: grid;
          place-items: center;
          font-size: 29px;
          flex-shrink: 0;
        }

        .cartdetails {
          flex: 1;
        }

        .cartdetails b {
          font-size: 13px;
        }

        .cartdetails p {
          font-size: 13px;
          font-weight: 800;
        }

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

        .empty {
          text-align: center;
          padding: 55px 10px;
          color: #777;
        }

        .empty span {
          font-size: 45px;
        }

        .empty p {
          font-size: 13px;
          line-height: 1.6;
        }

        /* Bottom navigation */

        .bottom-nav {
          position: fixed;
          bottom: 0;
          left: 0;
          right: 0;
          z-index: 20;
          display: grid;
          grid-template-columns: repeat(4, minmax(0, 1fr));
          background: #fff;
          border-top: 1px solid #e5e8e1;
          padding: 9px 8px calc(9px + env(safe-area-inset-bottom));
        }

        .bottom-nav button {
          border: 0;
          background: transparent;
          color: #7b8177;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          gap: 5px;
          font-size: 10px;
          font-weight: 600;
          padding: 5px 2px;
          min-width: 0;
        }

        .bottom-nav button.active {
          color: #173d2c;
        }

        .bottom-nav button.active svg {
          color: #173d2c;
          stroke-width: 2.5;
        }

        /* Messages and profile */

        .page-placeholder {
          width: 100%;
          max-width: 760px;
          min-height: 65vh;
          margin: 35px auto;
          padding: 0 18px 40px;
        }

        .page-placeholder h1 {
          font-size: 30px;
          letter-spacing: -1px;
        }

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

        .profile-label {
          color: #7b8177;
          font-size: 12px;
          margin-bottom: 5px;
        }

        .profile-value {
          font-size: 13px;
          font-weight: 600;
          overflow-wrap: anywhere;
          margin-bottom: 18px;
        }

        @media(max-width: 850px) {
          .headinner {
            gap: 10px;
            padding: 13px 16px;
            flex-wrap: wrap;
          }

          .logo {
            font-size: 20px;
          }

          .hero {
            padding: 0 16px;
          }

          .herobox {
            padding: 35px 28px;
            min-height: 315px;
          }

          .heroart {
            right: 5px;
            opacity: .45;
          }

          .herotext {
            max-width: 500px;
          }

          .section {
            padding: 0 16px;
          }

          .grid {
            grid-template-columns: repeat(2, minmax(0, 1fr));
            gap: 12px;
          }

          .productvisual {
            height: 155px;
          }

          .productemoji {
            font-size: 64px;
          }

          .trust {
            padding: 0 16px;
            grid-template-columns: 1fr;
          }

          .locationbar {
            padding-left: 16px;
            padding-right: 16px;
          }

          .searchbox {
            order: 3;
            flex-basis: 100%;
          }

          .wallet-button {
            margin-left: auto;
          }
        }

        @media(max-width: 420px) {
          .headinner {
            gap: 8px;
            padding: 12px;
          }

          .logo {
            font-size: 18px;
            gap: 6px;
          }

          .logoicon {
            width: 30px;
            height: 30px;
          }

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

          .headbtn {
            padding: 7px;
            font-size: 11px;
          }

          .herobox {
            padding: 30px 22px;
            min-height: 330px;
          }

          .heroart {
            right: -100px;
            opacity: .24;
          }

          .herotext p {
            font-size: 13px;
          }

          h1 {
            font-size: 35px;
          }

          .sectionhead h2 {
            font-size: 22px;
          }

          .productvisual {
            height: 135px;
          }

          .productbody {
            padding: 12px;
          }

          .price {
            font-size: 15px;
          }

          .grid {
            gap: 9px;
          }

          .locationinner {
            font-size: 11px;
          }

          .page-placeholder {
            padding-left: 16px;
            padding-right: 16px;
          }
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

          .app {
            padding-bottom: 95px;
          }
        }
      `}</style>

      <div className="topline">
        Made for Nigeria 🇳🇬 &nbsp; · &nbsp;
        <b>Discover local sellers. Shop smarter.</b>
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
                onChange={(e) => setSearch(e.target.value)}
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
              Prices in Nigerian Naira (₦)
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
                    sellers across Nigeria—all in one place.
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
                    <span className="bagart">🛍️</span>
                  </div>
                  <div className="floatpill pillone">✨ Local finds</div>
                  <div className="floatpill pilltwo">🇳🇬 Made for you</div>
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
                  {filtered.length} products
                </span>
              </div>

              <div className="categories">
                {categories.map((c) => (
                  <button
                    key={c}
                    onClick={() => setCategory(c)}
                    className={'cat ' + (category === c ? 'active' : '')}
                  >
                    {c}
                  </button>
                ))}
              </div>

              <div className="grid">
                {filtered.map((p) => (
                  <article className="card" key={p.id}>
                    <div
                      className="productvisual"
                      style={{ background: p.color }}
                    >
                      <span className="productemoji">{p.emoji}</span>

                      <span className="sale">
                        SAVE {Math.round((1 - p.price / p.old) * 100)}%
                      </span>

                      <button
                        className="heart"
                        aria-label="Save product"
                        onClick={() =>
                          showNotice(
                            'Wishlist functionality is not connected yet.',
                          )
                        }
                      >
                        <Heart size={16} />
                      </button>
                    </div>

                    <div className="productbody">
                      <div className="seller">{p.seller}</div>
                      <div className="productname">{p.name}</div>

                      <div className="rating">
                        <span>★</span> {p.rating} &nbsp;·&nbsp; Popular pick
                      </div>

                      <div className="prices">
                        <span className="price">{money(p.price)}</span>
                        <span className="old">{money(p.old)}</span>
                      </div>

                      <button
                        className="addbtn"
                        onClick={() => addToCart(p.id)}
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
                  No products found. Try another search.
                </p>
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
                  <p>We're building a simpler way to shop online.</p>
                </div>
              </div>

              <div className="trustitem">
                <div className="trusticon">
                  <Package size={21} />
                </div>
                <div>
                  <b>Discover something new</b>
                  <p>Explore fresh finds across everyday categories.</p>
                </div>
              </div>
            </section>

            <footer>
              <div className="footerinner">
                <div>
                  <div className="footlogo">SolMart.</div>
                  <div>Your marketplace, made for Nigeria.</div>
                </div>

                <div>Electronics · Fashion · Beauty · Accessories</div>

                <div>© 2026 SolMart. Marketplace preview.</div>
              </div>
            </footer>
          </>
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
                Your buyer–seller conversations will appear here when the
                messaging system is connected.
              </p>

              <p style={{ color: '#78877c', fontSize: 12 }}>
                Messaging is not connected to a database yet.
              </p>
            </div>
          </section>
        )}

        {activePage === 'profile' && (
          <section className="page-placeholder">
            <h1>My Profile</h1>

            <p className="sub">
              Manage your SolMart profile and view your connected wallet.
            </p>

            <div className="page-placeholder-card">
              <div className="profile-avatar">
                <User size={32} />
              </div>

              <h2 style={{ marginTop: 0 }}>
                {connected ? 'Wallet connected' : 'Welcome to SolMart'}
              </h2>

              <p>
                {connected
                  ? 'Your Solana wallet is connected to this session.'
                  : 'Connect Phantom or Solflare using the wallet button above.'}
              </p>

              <div className="profile-label">Wallet status</div>
              <div className="profile-value">
                {connected ? 'Connected' : 'Not connected'}
              </div>

              <div className="profile-label">Wallet address</div>
              <div className="profile-value">
                {publicKey
                  ? publicKey.toBase58()
                  : 'Connect your wallet to display your address.'}
              </div>

              <div className="profile-label">Solana network</div>
              <div className="profile-value">Devnet</div>

              <div className="profile-label">My listings</div>
              <div className="profile-value">
                Product listing management will be available after database
                integration.
              </div>
            </div>
          </section>
        )}
      </main>

      {notice && (
        <div className="notice" role="status">
          {notice}
        </div>
      )}

      {showCart && (
        <div
          className="overlay"
          onClick={() => setShowCart(false)}
        >
          <aside
            className="drawer"
            onClick={(e) => e.stopPropagation()}
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
                <span>🛍️</span>
                <h3>Your cart is empty</h3>

                <p>
                  Explore the marketplace and add something you love.
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
                {products
                  .filter((p) => cart[p.id])
                  .map((p) => (
                    <div className="cartrow" key={p.id}>
                      <div
                        className="cartemoji"
                        style={{ background: p.color }}
                      >
                        {p.emoji}
                      </div>

                      <div className="cartdetails">
                        <b>{p.name}</b>
                        <p>{money(p.price)}</p>

                        <div className="qty">
                          <button
                            onClick={() => changeQuantity(p.id, -1)}
                            aria-label={`Remove one ${p.name}`}
                          >
                            <Minus size={13} />
                          </button>

                          {cart[p.id]}

                          <button
                            onClick={() => changeQuantity(p.id, 1)}
                            aria-label={`Add one ${p.name}`}
                          >
                            <Plus size={13} />
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}

                <div className="totalrow">
                  <span>Subtotal</span>
                  <span>{money(cartTotal)}</span>
                </div>

                <p
                  style={{
                    fontSize: 11,
                    color: '#777',
                    lineHeight: 1.6,
                  }}
                >
                  This is a storefront preview. Checkout and payment
                  processing are not connected yet.
                </p>

                <button
                  className="checkout"
                  onClick={() => {
                    setShowCart(false)
                    showNotice('Checkout is not connected yet.')
                  }}
                >
                  Continue to checkout
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
