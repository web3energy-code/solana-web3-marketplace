-- ============================================================
-- SOLANA MARKETPLACE: INITIAL DATABASE MIGRATION
-- Target: Supabase PostgreSQL
--
-- IMPORTANT:
-- Order creation and payment verification must be implemented
-- in trusted backend code before checkout can be considered ready.
-- This migration does not implement blockchain payments.
-- ============================================================

CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- ============================================================
-- 1. USER PROFILES
-- ============================================================

CREATE TABLE IF NOT EXISTS public.user_profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    display_name VARCHAR(255) NOT NULL DEFAULT 'User',
    avatar_url TEXT,
    bio TEXT,
    phone_number VARCHAR(20),
    city VARCHAR(100),
    state VARCHAR(100),
    country VARCHAR(100) DEFAULT 'Nigeria',
    address TEXT,
    wallet_address VARCHAR(88),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.user_profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users read own profile"
ON public.user_profiles
FOR SELECT TO authenticated
USING (auth.uid() = id);

CREATE POLICY "Users create own profile"
ON public.user_profiles
FOR INSERT TO authenticated
WITH CHECK (auth.uid() = id);

CREATE POLICY "Users update own profile"
ON public.user_profiles
FOR UPDATE TO authenticated
USING (auth.uid() = id)
WITH CHECK (auth.uid() = id);

CREATE INDEX IF NOT EXISTS idx_user_profiles_wallet
ON public.user_profiles(wallet_address);


-- ============================================================
-- 2. SELLER PROFILES
-- ============================================================

CREATE TABLE IF NOT EXISTS public.seller_profiles (
    id UUID PRIMARY KEY REFERENCES public.user_profiles(id) ON DELETE CASCADE,
    shop_name VARCHAR(255) NOT NULL UNIQUE,
    shop_description TEXT,
    shop_banner_url TEXT,
    shop_logo_url TEXT,

    verification_status VARCHAR(50) NOT NULL DEFAULT 'unverified'
        CHECK (
            verification_status IN (
                'unverified', 'pending', 'verified', 'suspended'
            )
        ),

    verification_date TIMESTAMPTZ,
    rating NUMERIC(3,2) NOT NULL DEFAULT 0
        CHECK (rating >= 0 AND rating <= 5),
    total_sales INTEGER NOT NULL DEFAULT 0
        CHECK (total_sales >= 0),
    total_reviews INTEGER NOT NULL DEFAULT 0
        CHECK (total_reviews >= 0),

    return_policy TEXT,
    business_registration VARCHAR(100),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.seller_profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public can view verified sellers"
ON public.seller_profiles
FOR SELECT TO anon, authenticated
USING (verification_status = 'verified');

CREATE POLICY "Sellers can view own profile"
ON public.seller_profiles
FOR SELECT TO authenticated
USING (auth.uid() = id);

CREATE POLICY "Users can register as sellers"
ON public.seller_profiles
FOR INSERT TO authenticated
WITH CHECK (
    auth.uid() = id
    AND verification_status = 'unverified'
    AND verification_date IS NULL
    AND rating = 0
    AND total_sales = 0
    AND total_reviews = 0
);

CREATE POLICY "Sellers update own shop details"
ON public.seller_profiles
FOR UPDATE TO authenticated
USING (auth.uid() = id)
WITH CHECK (auth.uid() = id);


-- Prevent sellers from changing protected verification and statistics
-- fields directly through authenticated database requests.

CREATE OR REPLACE FUNCTION public.protect_seller_system_fields()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
    IF current_user IN ('postgres', 'supabase_admin')
       OR COALESCE(auth.role(), '') = 'service_role' THEN
        RETURN NEW;
    END IF;

    IF TG_OP = 'INSERT' THEN
        IF NEW.verification_status <> 'unverified'
           OR NEW.verification_date IS NOT NULL
           OR NEW.rating <> 0
           OR NEW.total_sales <> 0
           OR NEW.total_reviews <> 0 THEN
            RAISE EXCEPTION
                'Seller verification and statistics are system-managed';
        END IF;
    ELSE
        IF NEW.verification_status IS DISTINCT FROM OLD.verification_status
           OR NEW.verification_date IS DISTINCT FROM OLD.verification_date
           OR NEW.rating IS DISTINCT FROM OLD.rating
           OR NEW.total_sales IS DISTINCT FROM OLD.total_sales
           OR NEW.total_reviews IS DISTINCT FROM OLD.total_reviews THEN
            RAISE EXCEPTION
                'Seller verification and statistics are system-managed';
        END IF;
    END IF;

    RETURN NEW;
END;
$$;

CREATE TRIGGER protect_seller_system_fields_trigger
BEFORE INSERT OR UPDATE ON public.seller_profiles
FOR EACH ROW
EXECUTE FUNCTION public.protect_seller_system_fields();


-- ============================================================
-- 3. PRODUCT CATEGORIES
-- ============================================================

CREATE TABLE IF NOT EXISTS public.product_categories (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(100) NOT NULL UNIQUE,
    slug VARCHAR(100) NOT NULL UNIQUE,
    description TEXT,
    icon_emoji VARCHAR(10),
    parent_id UUID REFERENCES public.product_categories(id)
        ON DELETE SET NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.product_categories ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can read categories"
ON public.product_categories
FOR SELECT TO anon, authenticated
USING (true);


-- ============================================================
-- 4. PRODUCTS
-- ============================================================

CREATE TABLE IF NOT EXISTS public.products (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    seller_id UUID NOT NULL
        REFERENCES public.seller_profiles(id) ON DELETE RESTRICT,

    category_id UUID NOT NULL
        REFERENCES public.product_categories(id) ON DELETE RESTRICT,

    name VARCHAR(255) NOT NULL,
    slug VARCHAR(255) NOT NULL UNIQUE,
    description TEXT,

    price_ngn NUMERIC(15,2) NOT NULL CHECK (price_ngn > 0),
    original_price_ngn NUMERIC(15,2),

    quantity_available INTEGER NOT NULL DEFAULT 0
        CHECK (quantity_available >= 0),

    sku VARCHAR(100) UNIQUE,
    badge VARCHAR(50),

    status VARCHAR(50) NOT NULL DEFAULT 'draft'
        CHECK (status IN ('draft', 'published', 'archived')),

    rating NUMERIC(3,2) NOT NULL DEFAULT 0,
    total_reviews INTEGER NOT NULL DEFAULT 0,
    total_sold INTEGER NOT NULL DEFAULT 0,

    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.products ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can read published products"
ON public.products
FOR SELECT TO anon, authenticated
USING (status = 'published');

CREATE POLICY "Sellers can read own products"
ON public.products
FOR SELECT TO authenticated
USING (auth.uid() = seller_id);

CREATE POLICY "Sellers can create own products"
ON public.products
FOR INSERT TO authenticated
WITH CHECK (
    auth.uid() = seller_id
    AND status = 'draft'
);

CREATE POLICY "Sellers can update own products"
ON public.products
FOR UPDATE TO authenticated
USING (auth.uid() = seller_id)
WITH CHECK (auth.uid() = seller_id);

CREATE INDEX IF NOT EXISTS idx_products_seller
ON public.products(seller_id);

CREATE INDEX IF NOT EXISTS idx_products_category
ON public.products(category_id);

CREATE INDEX IF NOT EXISTS idx_products_status
ON public.products(status);


-- ============================================================
-- 5. PRODUCT IMAGES
-- ============================================================

CREATE TABLE IF NOT EXISTS public.product_images (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    product_id UUID NOT NULL
        REFERENCES public.products(id) ON DELETE CASCADE,
    image_url TEXT NOT NULL,
    alt_text VARCHAR(255),
    display_order INTEGER NOT NULL DEFAULT 0,
    is_primary BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.product_images ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Images of published products are public"
ON public.product_images
FOR SELECT TO anon, authenticated
USING (
    EXISTS (
        SELECT 1
        FROM public.products p
        WHERE p.id = product_id
          AND p.status = 'published'
    )
);

CREATE POLICY "Sellers manage own product images"
ON public.product_images
FOR ALL TO authenticated
USING (
    EXISTS (
        SELECT 1
        FROM public.products p
        WHERE p.id = product_id
          AND p.seller_id = auth.uid()
    )
)
WITH CHECK (
    EXISTS (
        SELECT 1
        FROM public.products p
        WHERE p.id = product_id
          AND p.seller_id = auth.uid()
    )
);


-- ============================================================
-- 6. SHOPPING CARTS
-- ============================================================

CREATE TABLE IF NOT EXISTS public.shopping_carts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL UNIQUE
        REFERENCES auth.users(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.shopping_carts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users manage own carts"
ON public.shopping_carts
FOR ALL TO authenticated
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);


-- ============================================================
-- 7. CART ITEMS
-- ============================================================

CREATE TABLE IF NOT EXISTS public.cart_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    cart_id UUID NOT NULL
        REFERENCES public.shopping_carts(id) ON DELETE CASCADE,

    product_id UUID NOT NULL
        REFERENCES public.products(id) ON DELETE RESTRICT,

    quantity INTEGER NOT NULL CHECK (quantity > 0),

    price_ngn_at_time NUMERIC(15,2) NOT NULL
        CHECK (price_ngn_at_time > 0),

    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    UNIQUE (cart_id, product_id)
);

ALTER TABLE public.cart_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users manage items in own carts"
ON public.cart_items
FOR ALL TO authenticated
USING (
    EXISTS (
        SELECT 1
        FROM public.shopping_carts c
        WHERE c.id = cart_id
          AND c.user_id = auth.uid()
    )
)
WITH CHECK (
    EXISTS (
        SELECT 1
        FROM public.shopping_carts c
        WHERE c.id = cart_id
          AND c.user_id = auth.uid()
    )
);


-- ============================================================
-- 8. ORDERS
-- Customers cannot insert or update orders directly.
-- Trusted backend order creation must calculate prices itself.
-- ============================================================

CREATE TABLE IF NOT EXISTS public.orders (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    user_id UUID NOT NULL
        REFERENCES auth.users(id) ON DELETE RESTRICT,

    order_number VARCHAR(50) NOT NULL UNIQUE,

    total_amount_ngn NUMERIC(15,2) NOT NULL
        CHECK (total_amount_ngn > 0),

    status VARCHAR(50) NOT NULL DEFAULT 'pending'
        CHECK (
            status IN (
                'pending', 'payment_pending', 'paid',
                'processing', 'shipped', 'delivered',
                'cancelled', 'refunded'
            )
        ),

    payment_status VARCHAR(50) NOT NULL DEFAULT 'unpaid'
        CHECK (
            payment_status IN (
                'unpaid', 'pending', 'completed', 'failed', 'refunded'
            )
        ),

    shipping_address TEXT NOT NULL,
    shipping_city VARCHAR(100),
    shipping_state VARCHAR(100),
    shipping_zip VARCHAR(20),
    notes TEXT,

    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.orders ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Customers can read own orders"
ON public.orders
FOR SELECT TO authenticated
USING (auth.uid() = user_id);

-- Intentionally no customer INSERT, UPDATE or DELETE policy.
-- Order creation and status transitions require trusted backend code.

CREATE INDEX IF NOT EXISTS idx_orders_user
ON public.orders(user_id);

CREATE INDEX IF NOT EXISTS idx_orders_status
ON public.orders(status);


-- ============================================================
-- 9. ORDER ITEMS
-- Trusted backend code creates order items.
-- ============================================================

CREATE TABLE IF NOT EXISTS public.order_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    order_id UUID NOT NULL
        REFERENCES public.orders(id) ON DELETE RESTRICT,

    product_id UUID NOT NULL
        REFERENCES public.products(id) ON DELETE RESTRICT,

    seller_id UUID NOT NULL
        REFERENCES public.seller_profiles(id) ON DELETE RESTRICT,

    quantity INTEGER NOT NULL CHECK (quantity > 0),

    price_ngn NUMERIC(15,2) NOT NULL CHECK (price_ngn > 0),

    status VARCHAR(50) NOT NULL DEFAULT 'pending'
        CHECK (
            status IN (
                'pending', 'confirmed', 'shipped',
                'delivered', 'cancelled'
            )
        ),

    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.order_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Customers can read own order items"
ON public.order_items
FOR SELECT TO authenticated
USING (
    EXISTS (
        SELECT 1
        FROM public.orders o
        WHERE o.id = order_id
          AND o.user_id = auth.uid()
    )
);

CREATE POLICY "Sellers can read own order items"
ON public.order_items
FOR SELECT TO authenticated
USING (seller_id = auth.uid());

-- No direct customer or seller INSERT, UPDATE or DELETE policies.


-- ============================================================
-- 10. PAYMENTS
-- Trusted backend code creates and updates payment records.
-- ============================================================

CREATE TABLE IF NOT EXISTS public.payments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    order_id UUID NOT NULL
        REFERENCES public.orders(id) ON DELETE RESTRICT,

    user_id UUID NOT NULL
        REFERENCES auth.users(id) ON DELETE RESTRICT,

    amount_ngn NUMERIC(15,2) NOT NULL CHECK (amount_ngn > 0),
    amount_sol NUMERIC(20,9),
    amount_usdc NUMERIC(20,6),

    payment_token VARCHAR(10) NOT NULL
        CHECK (payment_token IN ('SOL', 'USDC')),

    transaction_hash VARCHAR(88),
    transaction_signature VARCHAR(200),

    wallet_address VARCHAR(88) NOT NULL,
    receiving_wallet_address VARCHAR(88) NOT NULL,

    status VARCHAR(50) NOT NULL DEFAULT 'pending'
        CHECK (
            status IN (
                'pending', 'confirmed', 'failed', 'timeout', 'refunded'
            )
        ),

    block_number BIGINT,
    confirmation_time TIMESTAMPTZ,

    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    CONSTRAINT unique_payment_signature
        UNIQUE (transaction_signature)
);

ALTER TABLE public.payments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Customers can read own payments"
ON public.payments
FOR SELECT TO authenticated
USING (auth.uid() = user_id);

-- No direct customer INSERT, UPDATE or DELETE policies.

CREATE INDEX IF NOT EXISTS idx_payments_order
ON public.payments(order_id);

CREATE INDEX IF NOT EXISTS idx_payments_user
ON public.payments(user_id);


-- ============================================================
-- 11. PRODUCT REVIEWS
-- Verified-purchase status defaults to false.
-- ============================================================

CREATE TABLE IF NOT EXISTS public.product_reviews (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    product_id UUID NOT NULL
        REFERENCES public.products(id) ON DELETE CASCADE,

    order_id UUID NOT NULL
        REFERENCES public.orders(id) ON DELETE RESTRICT,

    user_id UUID NOT NULL
        REFERENCES auth.users(id) ON DELETE CASCADE,

    rating INTEGER NOT NULL CHECK (rating BETWEEN 1 AND 5),

    title VARCHAR(200),
    comment TEXT,

    helpful_count INTEGER NOT NULL DEFAULT 0
        CHECK (helpful_count >= 0),

    verified_purchase BOOLEAN NOT NULL DEFAULT FALSE,

    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    UNIQUE (product_id, order_id, user_id)
);

ALTER TABLE public.product_reviews ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can read reviews"
ON public.product_reviews
FOR SELECT TO anon, authenticated
USING (true);

CREATE POLICY "Users create unverified reviews"
ON public.product_reviews
FOR INSERT TO authenticated
WITH CHECK (
    auth.uid() = user_id
    AND verified_purchase = FALSE
    AND helpful_count = 0
);

CREATE POLICY "Users update own unverified reviews"
ON public.product_reviews
FOR UPDATE TO authenticated
USING (
    auth.uid() = user_id
    AND verified_purchase = FALSE
)
WITH CHECK (
    auth.uid() = user_id
    AND verified_purchase = FALSE
);

CREATE INDEX IF NOT EXISTS idx_reviews_product
ON public.product_reviews(product_id);

CREATE INDEX IF NOT EXISTS idx_reviews_user
ON public.product_reviews(user_id);


-- ============================================================
-- 12. NOTES
-- ============================================================
--
-- This migration establishes the initial database schema and
-- row-level security policies.
--
-- Before production checkout, implement and test trusted backend
-- operations for:
--
-- 1. Creating orders from current database product prices.
-- 2. Checking product inventory and preventing overselling.
-- 3. Creating order items and payment intents securely.
-- 4. Verifying Solana transactions independently through RPC.
-- 5. Checking the correct recipient, amount, token mint and
--    confirmed transaction before marking an order as paid.
-- 6. Protecting order transitions and verified-purchase reviews.
--
-- The Supabase service-role key bypasses RLS. Never expose it
-- to the browser, and enforce ownership and authorization in
-- every backend operation that uses it.
--
-- This migration does not implement payment verification.
-- ============================================================
