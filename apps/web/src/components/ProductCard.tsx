import { Star, MapPin } from 'lucide-react'
import { Product } from '@/data/products'
import { useCartStore } from '@/store/cart'
import { Link } from 'react-router-dom'

interface ProductCardProps {
  product: Product
}

export function ProductCard({ product }: ProductCardProps) {
  const addItem = useCartStore((state) => state.addItem)

  const discount = product.originalPrice
    ? Math.round(((product.originalPrice - product.price) / product.originalPrice) * 100)
    : 0

  const handleAddToCart = (e: React.MouseEvent) => {
    e.preventDefault()
    e.stopPropagation()
    addItem({
      id: product.id,
      name: product.name,
      price: product.price,
      image: product.image,
      quantity: 1,
    })
  }

  return (
    <div className="card overflow-hidden group flex flex-col h-full">
      {/* Product Image and Info - Clickable Link */}
      <Link to={`/product/${product.id}`} className="flex-1 flex flex-col">
        <div className="relative overflow-hidden bg-gray-100 aspect-square">
          <img
            src={product.image}
            alt={product.name}
            className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-300"
          />
          {discount > 0 && (
            <div className="absolute top-3 right-3 badge badge-red">
              -{discount}%
            </div>
          )}
          {product.badge && (
            <div className="absolute top-3 left-3 badge bg-yellow-100 text-yellow-800">
              {product.badge}
            </div>
          )}
        </div>

        <div className="p-4 flex-1 flex flex-col">
          <h3 className="font-semibold text-sm line-clamp-2 mb-2 text-gray-900">
            {product.name}
          </h3>

          <div className="flex items-center gap-1 mb-3">
            <Star size={14} className="fill-yellow-400 text-yellow-400" />
            <span className="text-xs font-medium">{product.rating}</span>
            <span className="text-xs text-gray-500">({product.reviews})</span>
          </div>

          <div className="flex items-center gap-1 mb-3 text-xs text-gray-600">
            <MapPin size={12} />
            {product.location}
          </div>

          <div className="mb-3">
            <div className="flex items-baseline gap-2">
              <span className="text-lg font-bold text-red-600">
                ₦{product.price.toLocaleString()}
              </span>
              {product.originalPrice && (
                <span className="text-xs text-gray-500 line-through">
                  ₦{product.originalPrice.toLocaleString()}
                </span>
              )}
            </div>
          </div>
        </div>
      </Link>

      {/* Add to Cart Button - Outside Link */}
      <div className="p-4 pt-0">
        <button
          onClick={handleAddToCart}
          className="w-full btn btn-primary text-sm py-2"
        >
          Add to Cart
        </button>
      </div>
    </div>
  )
}
