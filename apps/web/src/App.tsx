import { useMemo, useState } from 'react'
import {
  Search, ShoppingCart, Heart, UserRound, MapPin,
  Menu, Plus, Minus, X, ArrowRight, Package,
  ShieldCheck, Truck, Star, Store, ChevronDown
} from 'lucide-react'

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

const categories = ['All products', 'Electronics', 'Fashion', 'Beauty', 'Accessories']
const money = (n: number) => '₦' + n.toLocaleString('en-NG')

export default function App() {
  const [search, setSearch] = useState('')
  const [category, setCategory] = useState('All products')
  const [cart, setCart] = useState<Record<number, number>>({})
  const [showCart, setShowCart] = useState(false)
  const [notice, setNotice] = useState('')
  const [mobileMenu, setMobileMenu] = useState(false)

  const filtered = useMemo(() => products.filter(p =>
    (category === 'All products' || p.category === category) &&
    (p.name.toLowerCase().includes(search.toLowerCase()) ||
     p.seller.toLowerCase().includes(search.toLowerCase()))
  ), [search, category])

  const cartCount = Object.values(cart).reduce((a, b) => a + b, 0)
  const cartTotal = products.reduce((sum, p) => sum + p.price * (cart[p.id] || 0), 0)

  function addToCart(id: number) {
    setCart(prev => ({ ...prev, [id]: (prev[id] || 0) + 1 }))
    setNotice('Added to your cart')
    setTimeout(() => setNotice(''), 2000)
  }

  function changeQuantity(id: number, amount: number) {
    setCart(prev => {
      const next = { ...prev, [id]: (prev[id] || 0) + amount }
      if (next[id] <= 0) delete next[id]
      return next
    })
  }

  return (
    <div className="app">
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;600;700&family=Manrope:wght@400;500;600;700;800&display=swap');
        *{box-sizing:border-box}body{margin:0;font-family:'DM Sans',sans-serif;color:#20251f;background:#fff}
        button,input{font:inherit}button{cursor:pointer}.app{min-height:100vh}
        .topline{background:#173d2c;color:#fff;text-align:center;padding:10px 12px;font-size:12px;letter-spacing:.2px}
        .topline b{color:#d5f27b}.header{border-bottom:1px solid #eceee9;position:sticky;top:0;background:#fff;z-index:10}
        .headinner{max-width:1200px;margin:auto;padding:17px 24px;display:flex;align-items:center;gap:28px}
        .logo{display:flex;align-items:center;gap:9px;font-family:Manrope,sans-serif;font-size:23px;font-weight:800;letter-spacing:-1px;white-space:nowrap}
        .logoicon{background:#b9ed65;color:#173d2c;width:35px;height:35px;display:grid;place-items:center;border-radius:11px}
        .searchbox{flex:1;position:relative}.searchbox input{width:100%;padding:13px 16px 13px 43px;border:1px solid #e5e8e1;border-radius:11px;background:#f8f9f6;outline:none;font-size:13px}
        .searchbox input:focus{border-color:#87b94a}.searchicon{position:absolute;left:14px;top:13px;color:#72786f}
        .headbtn{background:#fff;border:1px solid #e7e9e4;border-radius:11px;padding:10px 12px;display:flex;gap:8px;align-items:center;color:#252a24;font-size:13px}
        .cartbtn{position:relative}.badge{background:#b9ed65;color:#173d2c;border-radius:20px;min-width:20px;height:20px;display:grid;place-items:center;font-size:11px;font-weight:800}
        .locationbar{border-bottom:1px solid #eceee9;padding:10px 24px;color:#656c62;font-size:12px}.locationinner{max-width:1152px;margin:auto;display:flex;align-items:center;gap:7px}
        .hero{max-width:1200px;margin:25px auto 0;padding:0 24px}.herobox{background:#173d2c;color:white;border-radius:22px;min-height:330px;padding:48px 52px;display:flex;position:relative;overflow:hidden;align-items:center}
        .herotext{position:relative;z-index:1;max-width:560px}.eyebrow{color:#c9ef88;font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:2px}
        h1{font-family:Manrope,sans-serif;font-size:clamp(32px,5vw,55px);line-height:1.1;letter-spacing:-2px;margin:16px 0}
        .herotext p{color:#d5e0d5;font-size:14px;line-height:1.8;max-width:430px}.primary{background:#c3f17b;color:#173d2c;border:0;border-radius:10px;padding:14px 19px;font-weight:800;font-size:13px;display:inline-flex;align-items:center;gap:10px;margin-top:15px}
        .heroart{position:absolute;right:55px;top:22px;width:300px;height:290px;display:grid;place-items:center}
        .orbit{width:265px;height:265px;border:1px solid #52715c;border-radius:50%;display:grid;place-items:center;position:relative}
        .orbit:before,.orbit:after{content:'';position:absolute;border:1px solid #52715c;border-radius:50%;inset:25px}
        .orbit:after{inset:52px}.bagart{font-size:110px;filter:drop-shadow(0 18px 15px #0b2419)}
        .floatpill{position:absolute;background:#fff;color:#253528;border-radius:12px;padding:12px 15px;box-shadow:0 12px 35px #102a1d55;font-size:12px;font-weight:700}
        .pillone{right:-5px;top:42px}.pilltwo{left:-14px;bottom:37px}
        .section{max-width:1200px;margin:42px auto;padding:0 24px}.sectionhead{display:flex;justify-content:space-between;align-items:end;gap:15px;margin-bottom:21px}
        .sectionhead h2{font-family:Manrope,sans-serif;font-size:25px;letter-spacing:-1px;margin:0}.sub{font-size:12px;color:#7b8177;margin-top:7px}
        .categories{display:flex;gap:9px;overflow:auto;padding-bottom:5px}.cat{white-space:nowrap;padding:11px 17px;border:1px solid #e5e8e1;border-radius:30px;background:white;color:#62695f;font-size:12px;font-weight:600}
        .cat.active{background:#173d2c;color:white;border-color:#173d2c}
        .grid{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:18px;margin-top:22px}
        .card{border:1px solid #eceee8;border-radius:15px;overflow:hidden;background:white;transition:transform .2s,box-shadow .2s}.card:hover{transform:translateY(-3px);box-shadow:0 12px 30px #173d2c0d}
        .productvisual{height:190px;display:grid;place-items:center;position:relative}.productemoji{font-size:76px;filter:drop-shadow(0 12px 9px #00000014)}
        .sale{position:absolute;left:12px;top:12px;background:#fff;border-radius:6px;padding:6px 8px;font-size:10px;font-weight:800;color:#b44c30}
        .heart{position:absolute;right:12px;top:12px;border:0;background:#ffffffd9;border-radius:50%;width:32px;height:32px;display:grid;place-items:center;color:#596056}
        .productbody{padding:15px}.seller{font-size:10px;color:#83897f;margin-bottom:7px}.productname{font-size:13px;font-weight:700;line-height:1.45;min-height:37px}
        .rating{font-size:11px;color:#777e73;margin:8px 0}.rating span{color:#d38c2f}.prices{display:flex;align-items:center;gap:8px;flex-wrap:wrap}
        .price{font-size:17px;font-weight:800;letter-spacing:-.4px}.old{font-size:11px;color:#9ca196;text-decoration:line-through}
        .addbtn{margin-top:13px;width:100%;padding:10px;border:1px solid #dfe5d9;border-radius:8px;background:#fff;color:#21452e;font-size:12px;font-weight:700;display:flex;align-items:center;justify-content:center;gap:7px}
        .addbtn:hover{background:#c3f17b;border-color:#c3f17b}.trust{max-width:1152px;margin:30px auto 60px;padding:0 24px;display:grid;grid-template-columns:repeat(3,1fr);gap:14px}
        .trustitem{border:1px solid #e9ece6;border-radius:13px;padding:20px;display:flex;gap:13px;align-items:center}.trusticon{width:42px;height:42px;border-radius:12px;background:#eff7e4;color:#315b31;display:grid;place-items:center;flex-shrink:0}
        .trustitem b{font-size:12px}.trustitem p{font-size:11px;color:#777e73;margin:5px 0 0;line-height:1.5}
        footer{background:#f6f7f3;padding:35px 24px;color:#6d746a;font-size:12px}.footerinner{max-width:1152px;margin:auto;display:flex;justify-content:space-between;gap:20px;flex-wrap:wrap}.footlogo{color:#173d2c;font-size:18px;font-weight:800;margin-bottom:8px}
        .notice{position:fixed;bottom:20px;left:50%;transform:translateX(-50%);background:#173d2c;color:white;padding:13px 20px;border-radius:12px;z-index:50;font-size:13px;box-shadow:0 8px 30px #0002}
        .overlay{position:fixed;inset:0;background:#0006;z-index:30;display:flex;justify-content:flex-end}.drawer{background:white;width:min(420px,100%);height:100%;padding:25px;overflow:auto}
        .drawertop{display:flex;justify-content:space-between;align-items:center;margin-bottom:25px}.drawertop h2{margin:0;font-family:Manrope,sans-serif}
        .closebtn{border:0;background:#f1f3ee;border-radius:9px;padding:9px;display:grid;place-items:center}.cartrow{display:flex;gap:13px;padding:15px 0;border-bottom:1px solid #eee}.cartemoji{width:65px;height:65px;border-radius:10px;display:grid;place-items:center;font-size:29px;flex-shrink:0}
        .cartdetails{flex:1}.cartdetails b{font-size:13px}.cartdetails p{font-size:13px;font-weight:800}.qty{display:flex;gap:12px;align-items:center;font-size:12px}.qty button{border:1px solid #e4e7e0;background:white;border-radius:6px;padding:4px;display:grid;place-items:center}
        .totalrow{display:flex;justify-content:space-between;font-weight:800;margin-top:25px}.checkout{width:100%;margin-top:17px;background:#173d2c;color:white;border:0;border-radius:10px;padding:15px;font-weight:700}
        .empty{text-align:center;padding:55px 10px;color:#777}.empty span{font-size:45px}.empty p{font-size:13px;line-height:1.6}
        .mobilemenu{display:none}
        @media(max-width:850px){.headinner{gap:12px;padding:13px 16px}.logo{font-size:20px}.accountbtn{display:none}.hero{padding:0 16px}.herobox{padding:35px 28px;min-height:315px}.heroart{right:5px;opacity:.45}.herotext{max-width:500px}.section{padding:0 16px}.grid{grid-template-columns:repeat(2,minmax(0,1fr));gap:12px}.productvisual{height:155px}.productemoji{font-size:64px}.trust{padding:0 16px;grid-template-columns:1fr}.locationbar{padding-left:16px}.headinner{flex-wrap:wrap}.searchbox{order:3;flex-basis:100%}}
        @media(max-width:420px){.herobox{padding:30px 22px;min-height:330px}.heroart{right:-100px;opacity:.24}.herotext p{font-size:13px}h1{font-size:35px}.sectionhead h2{font-size:22px}.productvisual{height:135px}.productbody{padding:12px}.price{font-size:15px}.grid{gap:9px}.headbtn{padding:9px}.logo{font-size:19px}}
      `}</style>

      <div className="topline">Made for Nigeria 🇳🇬 &nbsp; · &nbsp; <b>Discover local sellers. Shop smarter.</b></div>

      <header className="header">
        <div className="headinner">
          <div className="logo"><span className="logoicon"><Store size={21}/></span> SolMart<span style={{color:'#7c9e53'}}>.</span></div>
          <div className="searchbox"><Search size={17} className="searchicon"/><input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search products, stores and more..."/></div>
          <button className="headbtn accountbtn" onClick={() => setNotice('Account sign-in is not connected yet')}><UserRound size={17}/> Account</button>
          <button className="headbtn cartbtn" onClick={() => setShowCart(true)}><ShoppingCart size={18}/> Cart <span className="badge">{cartCount}</span></button>
        </div>
      </header>

      <div className="locationbar"><div className="locationinner"><MapPin size={14}/> Shopping across Nigeria <span style={{marginLeft:'auto'}}>Prices in Nigerian Naira (₦)</span></div></div>

      <main>
        <section className="hero">
          <div className="herobox">
            <div className="herotext">
              <div className="eyebrow">Your marketplace. Your people.</div>
              <h1>Good finds.<br/>Better prices.</h1>
              <p>Discover everyday essentials, fashion and gadgets from sellers across Nigeria—all in one place.</p>
              <button className="primary" onClick={() => document.getElementById('shop')?.scrollIntoView({behavior:'smooth'})}>Explore marketplace <ArrowRight size={16}/></button>
            </div>
            <div className="heroart"><div className="orbit"><span className="bagart">🛍️</span></div><div className="floatpill pillone">✨ Local finds</div><div className="floatpill pilltwo">🇳🇬 Made for you</div></div>
          </div>
        </section>

        <section className="section" id="shop">
          <div className="sectionhead"><div><h2>Find your next favourite</h2><div className="sub">Fresh picks from sellers around Nigeria</div></div><span style={{fontSize:12,color:'#777'}}>{filtered.length} products</span></div>
          <div className="categories">{categories.map(c => <button key={c} onClick={() => setCategory(c)} className={'cat '+(category===c?'active':'')}>{c}</button>)}</div>

          <div className="grid">
            {filtered.map(p => <article className="card" key={p.id}>
              <div className="productvisual" style={{background:p.color}}>
                <span className="productemoji">{p.emoji}</span><span className="sale">SAVE {Math.round((1-p.price/p.old)*100)}%</span>
                <button className="heart" aria-label="Save product" onClick={() => setNotice('Wishlist sign-in is not connected yet')}><Heart size={16}/></button>
              </div>
              <div className="productbody">
                <div className="seller">{p.seller}</div><div className="productname">{p.name}</div>
                <div className="rating"><span>★</span> {p.rating} &nbsp;·&nbsp; Popular pick</div>
                <div className="prices"><span className="price">{money(p.price)}</span><span className="old">{money(p.old)}</span></div>
                <button className="addbtn" onClick={() => addToCart(p.id)}><Plus size={15}/> Add to cart</button>
              </div>
            </article>)}
          </div>
          {filtered.length===0 && <p style={{textAlign:'center',padding:40,color:'#777'}}>No products found. Try another search.</p>}
        </section>

        <section className="trust">
          <div className="trustitem"><div className="trusticon"><Truck size={21}/></div><div><b>Shop across Nigeria</b><p>Discover products from local sellers and businesses.</p></div></div>
          <div className="trustitem"><div className="trusticon"><ShieldCheck size={21}/></div><div><b>Built for a better checkout</b><p>We're building a simpler way to shop online.</p></div></div>
          <div className="trustitem"><div className="trusticon"><Package size={21}/></div><div><b>Discover something new</b><p>Explore fresh finds across everyday categories.</p></div></div>
        </section>
      </main>

      <footer><div className="footerinner"><div><div className="footlogo">SolMart.</div><div>Your marketplace, made for Nigeria.</div></div><div>Electronics · Fashion · Beauty · Accessories</div><div>© 2026 SolMart. Marketplace preview.</div></div></footer>

      {notice && <div className="notice">{notice}</div>}

      {showCart && <div className="overlay" onClick={() => setShowCart(false)}><aside className="drawer" onClick={e => e.stopPropagation()}>
        <div className="drawertop"><h2>Your cart ({cartCount})</h2><button className="closebtn" onClick={() => setShowCart(false)}><X size={19}/></button></div>
        {cartCount===0 ? <div className="empty"><span>🛍️</span><h3>Your cart is empty</h3><p>Explore the marketplace and add something you love.</p><button className="primary" onClick={() => setShowCart(false)}>Start shopping <ArrowRight size={15}/></button></div> :
          <>{products.filter(p => cart[p.id]).map(p => <div className="cartrow" key={p.id}><div className="cartemoji" style={{background:p.color}}>{p.emoji}</div><div className="cartdetails"><b>{p.name}</b><p>{money(p.price)}</p><div className="qty"><button onClick={() => changeQuantity(p.id,-1)}><Minus size={13}/></button>{cart[p.id]}<button onClick={() => changeQuantity(p.id,1)}><Plus size={13}/></button></div></div></div>)}
          <div className="totalrow"><span>Subtotal</span><span>{money(cartTotal)}</span></div><p style={{fontSize:11,color:'#777',lineHeight:1.6}}>This is a storefront preview. Checkout and payment processing are not connected yet.</p><button className="checkout" onClick={() => {setShowCart(false);setNotice('Checkout is not connected yet')}}>Continue to checkout</button></>}
      </aside></div>}
    </div>
  )
}
