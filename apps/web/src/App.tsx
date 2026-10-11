  const [products, setProducts] = useState<Product[]>([])
  const [loadingProducts, setLoadingProducts] = useState(true)
  const [productsError, setProductsError] = useState('')
  const [lastProductsUpdate, setLastProductsUpdate] = useState(0)

  const requestInProgress = useRef(false)
  const mounted = useRef(false)

  const loadProducts = useCallback(async (initialLoad = false) => {
    if (requestInProgress.current) return

    requestInProgress.current = true

    if (initialLoad) {
      setLoadingProducts(true)
    }

    try {
      const response = await fetch(`${API_URL}/products`, {
        method: 'GET',
        headers: {
          Accept: 'application/json',
        },
        cache: 'no-store',
      })

      if (!response.ok) {
        throw new Error(
          `Could not load products. Server returned ${response.status}.`,
        )
      }

      const result = await response.json()

      if (!result.success || !Array.isArray(result.products)) {
        throw new Error(
          'The marketplace returned an invalid response.',
        )
      }

      const publishedProducts = result.products.filter(
        (product: Product) =>
          product &&
          product.status === 'published' &&
          product.id !== undefined &&
          product.id !== null,
      )

      if (!mounted.current) return

      setProducts(publishedProducts)
      setProductsError('')
      setLastProductsUpdate(Date.now())
    } catch (error) {
      if (!mounted.current) return

      const message =
        error instanceof Error
          ? error.message
          : 'Could not load published products.'

      setProductsError(message)
    } finally {
      requestInProgress.current = false

      if (mounted.current && initialLoad) {
        setLoadingProducts(false)
      }
    }
  }, [])

  useEffect(() => {
    mounted.current = true

    void loadProducts(true)

    const refreshInterval = window.setInterval(() => {
      if (document.visibilityState === 'visible') {
        void loadProducts(false)
      }
    }, PRODUCT_REFRESH_INTERVAL)

    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        void loadProducts(false)
      }
    }

    const handleWindowFocus = () => {
      void loadProducts(false)
    }

    document.addEventListener(
      'visibilitychange',
      handleVisibilityChange,
    )
    window.addEventListener('focus', handleWindowFocus)
    window.addEventListener('pageshow', handleWindowFocus)

    return () => {
      mounted.current = false
      window.clearInterval(refreshInterval)

      document.removeEventListener(
        'visibilitychange',
        handleVisibilityChange,
      )
      window.removeEventListener('focus', handleWindowFocus)
      window.removeEventListener('pageshow', handleWindowFocus)
    }
  }, [loadProducts])

  useEffect(() => {
    if (activePage === 'marketplace') {
      void loadProducts(false)
    }
  }, [activePage, loadProducts])
