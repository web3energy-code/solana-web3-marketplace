import { Header } from '@/components/Header'
import { Footer } from '@/components/Footer'
import { SAMPLE_PRODUCTS, CATEGORIES } from '@/data/products'
import { ProductCard } from '@/components/ProductCard'
import { useParams, useNavigate, Link } from 'react-router-dom'
import { ChevronDown } from 'lucide-react'
import { useState, useMemo } from 'react'

export function CategoryPage() {
  const { category } = useParams<{ category: string }>()
  const navigate = useNavigate()
  const [sortBy, setSortBy] = useState('trending')

  // Decode category from URL slug
  const decodedCategory = category
    ?.split('-')
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ')

  const categoryObj = CATEGORIES.find(
    (c) => c.name.toLowerCase() === decodedCategory?.toLowerCase()
  )

  // Filter and sort products - create new array, don't mutate SAMPLE_PRODUCTS
  const filteredProducts = useMemo(() => {
    let products = decodedCategory
      ? SAMPLE_PRODUCTS.filter(
          (p) => p.category.toLowerCase() === decodedCategory.toLowerCase()
        )
      : [...SAMPLE_PRODUCTS]

    // Sort - don't mutate original array
    const sortedProducts = [...products]
    switch (sortBy) {
      case 'price-low':
        return sortedProducts.sort((a, b) => a.price - b.price)
      case 'price-high':
        return sortedProducts.sort((a, b) => b.price - a.price)
      case 'rating':
        return sortedProducts.sort((a, b) => b.rating - a.rating)
      case 'newest':
        return sortedProducts.reverse()
      default:
        return sortedProducts
    }
  }, [decodedCategory, sortBy])

  // Check if category is valid
  const isValidCategory = decodedCategory ? !!categoryObj : true

  return (
    <div className="min-h-screen bg-gray-50">
      <Header />

      <div className="container py-8">
        {/* Breadcrumb */}
        <div className="flex gap-2 text-sm text-gray-600 mb-8">
          <Link to="/" className="hover:text-red-600">Home</Link>
          <span>/</span>
          <span className="text-gray-900 font-medium">{decodedCategory || 'All Products'}</span>
        </div>

        {/* Invalid Category */}
        {!isValidCategory ? (
          <div className="bg-white rounded-lg shadow-sm p-12 text-center">
            <p className="text-gray-600 text-lg mb-4">
              Category "{decodedCategory}" not found
            </p>
            <p className="text-gray-500 text-sm mb-6">
              Please choose from: Electronics, Fashion, Home Appliances, Beauty, Accessories, Groceries, or Computers
            </p>
            <button
              onClick={() => navigate('/')}
              className="btn btn-primary"
            >
              Return to Home
            </button>
          </div>
        ) : (
          <>
            {/* Page Title */}
            <div className="mb-8">
              <div className="flex items-center gap-3 mb-2">
                {categoryObj && <span className="text-4xl">{categoryObj.icon}</span>}
                <h1 className="text-3xl font-bold text-gray-900">
                  {decodedCategory || 'All Products'}
                </h1>
              </div>
              <p className="text-gray-600">
                {filteredProducts.length === 0
                  ? `No products found in ${decodedCategory || 'this category'}`
                  : `Found ${filteredProducts.length} products`}
              </p>
            </div>

            {/* Filter and Sort */}
            <div className="bg-white rounded-lg shadow-sm p-4 mb-8">
              <div className="flex flex-col md:flex-row gap-4 items-start md:items-center justify-between">
                <div className="flex gap-4 w-full md:w-auto">
                  <div className="relative flex-1 md:flex-none">
                    <select
                      value={sortBy}
                      onChange={(e) => setSortBy(e.target.value)}
                      className="input appearance-none pr-10 w-full md:w-48"
                    >
                      <option value="trending">Trending</option>
                      <option value="newest">Newest</option>
                      <option value="rating">Highest Rated</option>
                      <option value="price-low">Price: Low to High</option>
                      <option value="price-high">Price: High to Low</option>
                    </select>
                    <ChevronDown size={16} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
                  </div>
                </div>
                <div className="text-sm text-gray-600">
                  Showing {filteredProducts.length} of {SAMPLE_PRODUCTS.length} products
                </div>
              </div>
            </div>

            {/* Products Grid */}
            {filteredProducts.length === 0 ? (
              <div className="bg-white rounded-lg shadow-sm p-12 text-center">
                <p className="text-gray-600 text-lg mb-4">
                  No products found in {decodedCategory || 'this category'}
                </p>
                <button
                  onClick={() => navigate('/')}
                  className="btn btn-primary"
                >
                  Continue Shopping
                </button>
              </div>
            ) : (
              <div className="grid grid-cols-2 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                {filteredProducts.map((product) => (
                  <ProductCard key={product.id} product={product} />
                ))}
              </div>
            )}
          </>
        )}
      </div>

      <Footer />
    </div>
  )
}
