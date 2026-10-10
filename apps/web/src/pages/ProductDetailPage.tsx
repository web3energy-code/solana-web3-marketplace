import { Header } from '@/components/Header'
import { Footer } from '@/components/Footer'
import { SAMPLE_PRODUCTS } from '@/data/products'
import { Star, MapPin, Share2, ShoppingCart, Minus, Plus } from 'lucide-react'
import { useParams, Link } from 'react-router-dom'
import { useState } from 'react'
import { useCartStore } from '@/store/cart'

export function ProductDetailPage() {
  const { id } = useParams<{ id: string }>()
  const [quantity, setQuantity] = useState(1)
  const addItem = useCartStore((state) => state.addItem)
  
  const product = SAMPLE_PRODUCTS.find((p) => p.id === id)

  if (!product) {
    return (
      <div className="min-h-screen bg-gray-50">
        <Header />
        <div className="container py-12 text-center">
          <h1 className="text-2xl font-bold text-gray-900 mb-4">Product Not Found</h1>
          <p className="text-gray-600 mb-6">The product you're looking for doesn't exist.</p>
          <Link to="/" className="btn btn-primary">
            Back to Home
          </Link>
        </div>
        <Footer />
      </div>
    )
  }

  const discount = product.originalPrice
    ? Math.round(((product.originalPrice - product.price) / product.originalPrice) * 100)
    : 0

  const handleAddToCart = () => {
    addItem({
      id: product.id,
      name: product.name,
      price: product.price,
      image: product.image,
      quantity,
    })
    setQuantity(1)
  }

  // Get related products (same category)
  const relatedProducts = SAMPLE_PRODUCTS.filter(
    (p) => p.category === product.category && p.id !== product.id
  ).slice(0, 4)

  return (
    <div className="min-h-screen bg-gray-50">
      <Header />

      {/* Breadcrumb */}
      <div className="bg-white border-b border-gray-200">
        <div className="container py-4 flex gap-2 text-sm text-gray-600">
          <Link to="/" className="hover:text-red-600">Home</Link>
          <span>/</span>
          <Link to={`/category/${product.category.toLowerCase().replace(/\s+/g, '-')}`} className="hover:text-red-600">
            {product.category}
          </Link>
          <span>/</span>
          <span className="text-gray-900 font-medium">{product.name}</span>
        </div>
      </div>

      <div className="container py-8">
        <div className="grid md:grid-cols-2 gap-8 mb-12">
          {/* Product Images */}
          <div className="bg-white rounded-lg shadow-sm overflow-hidden">
            <div className="relative aspect-square bg-gray-100 flex items-center justify-center">
              <img
                src={product.image}
                alt={product.name}
                className="w-full h-full object-cover"
              />
              {discount > 0 && (
                <div className="absolute top-4 right-4 badge badge-red">
                  -{discount}%
                </div>
              )}
              {product.badge && (
                <div className="absolute top-4 left-4 badge bg-yellow-100 text-yellow-800">
                  {product.badge}
                </div>
              )}
            </div>
            <div className="p-4 grid grid-cols-4 gap-2">
              {[1, 2, 3, 4].map((i) => (
                <div key={i} className="aspect-square bg-gray-200 rounded cursor-pointer hover:ring-2 hover:ring-red-500 transition">
                  <img src={product.image} alt={`View ${i}`} className="w-full h-full object-cover rounded" />
                </div>
              ))}
            </div>
          </div>

          {/* Product Details */}
          <div>
            <div className="bg-white rounded-lg shadow-sm p-6 mb-4">
              <h1 className="text-3xl font-bold text-gray-900 mb-2">{product.name}</h1>
              
              <div className="flex items-center gap-4 mb-4">
                <div className="flex items-center gap-1">
                  <Star size={18} className="fill-yellow-400 text-yellow-400" />
                  <span className="font-bold text-gray-900">{product.rating}</span>
                  <span className="text-gray-600">({product.reviews} reviews)</span>
                </div>
              </div>

              {/* Price Section */}
              <div className="mb-6 pb-6 border-b border-gray-200">
                <div className="flex items-center gap-3 mb-2">
                  <span className="text-4xl font-bold text-red-600">
                    ₦{product.price.toLocaleString()}
                  </span>
                  {product.originalPrice && (
                    <span className="text-xl text-gray-500 line-through">
                      ₦{product.originalPrice.toLocaleString()}
                    </span>
                  )}
                </div>
                {discount > 0 && (
                  <p className="text-green-600 font-semibold">
                    Save ₦{(product.originalPrice! - product.price).toLocaleString()} ({discount}%)
                  </p>
                )}
              </div>

              {/* Seller Info */}
              <div className="mb-6 pb-6 border-b border-gray-200">
                <p className="text-sm text-gray-600 mb-2">Seller</p>
                <p className="font-bold text-gray-900 mb-3">{product.seller}</p>
                <div className="flex items-center gap-2 text-sm text-gray-700 mb-2">
                  <MapPin size={16} />
                  {product.location}
                </div>
                <a href="#" className="text-red-600 hover:text-red-700 font-medium text-sm">
                  View all items from this seller
                </a>
              </div>

              {/* Stock Status */}
              <div className="mb-6 pb-6 border-b border-gray-200">
                <p className="text-green-600 font-semibold text-sm">In Stock</p>
              </div>

              {/* Quantity Selector */}
              <div className="mb-6 pb-6 border-b border-gray-200">
                <p className="text-sm text-gray-600 mb-3">Quantity</p>
                <div className="flex items-center gap-4">
                  <div className="flex items-center gap-2 border border-gray-300 rounded-lg">
                    <button
                      onClick={() => setQuantity(Math.max(1, quantity - 1))}
                      className="p-2 hover:bg-gray-100 transition"
                    >
                      <Minus size={18} />
                    </button>
                    <input
                      type="number"
                      min="1"
                      value={quantity}
                      onChange={(e) => setQuantity(Math.max(1, parseInt(e.target.value) || 1))}
                      className="w-16 text-center border-0 focus:outline-none"
                    />
                    <button
                      onClick={() => setQuantity(quantity + 1)}
                      className="p-2 hover:bg-gray-100 transition"
                    >
                      <Plus size={18} />
                    </button>
                  </div>
                  <span className="text-sm text-gray-600">Items available</span>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex gap-3">
                <button
                  onClick={handleAddToCart}
                  className="flex-1 btn btn-primary py-3 text-lg font-bold flex items-center justify-center gap-2"
                >
                  <ShoppingCart size={20} />
                  Add to Cart
                </button>
                <button className="btn btn-outline px-6 py-3">
                  <Share2 size={20} />
                </button>
              </div>
            </div>

            {/* Trust Badges */}
            <div className="bg-white rounded-lg shadow-sm p-6 space-y-3">
              <div className="flex gap-3 items-start">
                <span className="text-2xl">✓</span>
                <div>
                  <p className="font-semibold text-gray-900">Authentic Guarantee</p>
                  <p className="text-sm text-gray-600">100% genuine products or money back</p>
                </div>
              </div>
              <div className="flex gap-3 items-start">
                <span className="text-2xl">🚚</span>
                <div>
                  <p className="font-semibold text-gray-900">Fast Delivery</p>
                  <p className="text-sm text-gray-600">Usually delivered within 3-7 days</p>
                </div>
              </div>
              <div className="flex gap-3 items-start">
                <span className="text-2xl">💰</span>
                <div>
                  <p className="font-semibold text-gray-900">Secure Payment</p>
                  <p className="text-sm text-gray-600">Your payment is encrypted and secure</p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Product Description */}
        <div className="bg-white rounded-lg shadow-sm p-6 mb-12">
          <h2 className="text-2xl font-bold text-gray-900 mb-4">Product Details</h2>
          <p className="text-gray-700 leading-relaxed mb-4">
            {product.description || `This is a premium ${product.name} from ${product.seller}. Located in ${product.location}, this product has been rated ${product.rating} stars by ${product.reviews} satisfied customers. Available at a great price of ₦${product.price.toLocaleString()}. This is sample product data for demonstration purposes.`}
          </p>
          <div className="grid md:grid-cols-3 gap-4">
            <div className="bg-gray-50 p-4 rounded">
              <p className="text-sm text-gray-600 mb-1">Category</p>
              <p className="font-semibold text-gray-900">{product.category}</p>
            </div>
            <div className="bg-gray-50 p-4 rounded">
              <p className="text-sm text-gray-600 mb-1">Seller Rating</p>
              <p className="font-semibold text-gray-900">{product.rating} ⭐</p>
            </div>
            <div className="bg-gray-50 p-4 rounded">
              <p className="text-sm text-gray-600 mb-1">Reviews</p>
              <p className="font-semibold text-gray-900">{product.reviews} customer reviews</p>
            </div>
          </div>
        </div>

        {/* Related Products */}
        {relatedProducts.length > 0 && (
          <div className="mb-12">
            <h2 className="text-2xl font-bold text-gray-900 mb-6">Related Products</h2>
            <div className="grid grid-cols-2 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
              {relatedProducts.map((p) => (
                <Link
                  key={p.id}
                  to={`/product/${p.id}`}
                  className="card overflow-hidden group"
                >
                  <div className="relative overflow-hidden bg-gray-100 aspect-square">
                    <img
                      src={p.image}
                      alt={p.name}
                      className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-300"
                    />
                  </div>
                  <div className="p-4">
                    <h3 className="font-semibold text-sm line-clamp-2 mb-2 text-gray-900">
                      {p.name}
                    </h3>
                    <div className="text-lg font-bold text-red-600">
                      ₦{p.price.toLocaleString()}
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          </div>
        )}
      </div>

      <Footer />
    </div>
  )
}
