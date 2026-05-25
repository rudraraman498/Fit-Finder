CREATE EXTENSION IF NOT EXISTS vector;

CREATE TABLE IF NOT EXISTS products (
    id                SERIAL PRIMARY KEY,
    slug              VARCHAR(160) NOT NULL UNIQUE,
    name              VARCHAR(255) NOT NULL,
    brand             VARCHAR(120) NOT NULL,
    description       TEXT NOT NULL,
    category          VARCHAR(80) NOT NULL,
    subcategory       VARCHAR(80) NOT NULL,
    base_price        DECIMAL(10, 2) NOT NULL CHECK (base_price > 0),
    material          VARCHAR(120),
    fit               VARCHAR(80),
    tags              TEXT[] NOT NULL DEFAULT '{}',
    gender            VARCHAR(20) NOT NULL DEFAULT 'unisex',
    primary_image_url TEXT NOT NULL,
    image_gallery     JSONB NOT NULL DEFAULT '[]'::jsonb,
    active            BOOLEAN NOT NULL DEFAULT TRUE,
    created_at        TIMESTAMP NOT NULL DEFAULT NOW(),
    embedding         VECTOR(768),
    search_vector     TSVECTOR
);

CREATE TABLE IF NOT EXISTS product_variants (
    id            SERIAL PRIMARY KEY,
    product_id    INT NOT NULL REFERENCES products(id) ON DELETE CASCADE,
    sku           VARCHAR(80) NOT NULL UNIQUE,
    color_name    VARCHAR(80) NOT NULL,
    size_label    VARCHAR(40) NOT NULL,
    size_system   VARCHAR(40) NOT NULL,
    stock_qty     INT NOT NULL DEFAULT 0 CHECK (stock_qty >= 0),
    price_override DECIMAL(10, 2),
    active        BOOLEAN NOT NULL DEFAULT TRUE,
    created_at    TIMESTAMP NOT NULL DEFAULT NOW(),
    CHECK (price_override IS NULL OR price_override > 0)
);

-- GIN index for product full-text search
CREATE INDEX IF NOT EXISTS products_search_vector_gin_idx ON products USING gin (search_vector);
CREATE INDEX IF NOT EXISTS products_category_idx ON products (category);
CREATE INDEX IF NOT EXISTS products_subcategory_idx ON products (subcategory);
CREATE INDEX IF NOT EXISTS products_gender_idx ON products (gender);
CREATE INDEX IF NOT EXISTS products_active_idx ON products (active);

CREATE INDEX IF NOT EXISTS product_variants_product_id_idx ON product_variants (product_id);
CREATE INDEX IF NOT EXISTS product_variants_color_name_idx ON product_variants (color_name);
CREATE INDEX IF NOT EXISTS product_variants_size_idx ON product_variants (size_label, size_system);
CREATE INDEX IF NOT EXISTS product_variants_active_idx ON product_variants (active);
CREATE INDEX IF NOT EXISTS product_variants_product_active_idx ON product_variants (product_id, active);

-- Trigger function: keeps search_vector in sync with search-facing fields.
CREATE OR REPLACE FUNCTION products_search_vector_update() RETURNS trigger AS $$
BEGIN
    NEW.search_vector := to_tsvector('english',
        NEW.name || ' ' ||
        NEW.brand || ' ' ||
        NEW.description || ' ' ||
        NEW.category || ' ' ||
        NEW.subcategory || ' ' ||
        COALESCE(NEW.material, '') || ' ' ||
        COALESCE(NEW.fit, '') || ' ' ||
        array_to_string(NEW.tags, ' ')
    );
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS products_search_vector_trigger ON products;
CREATE TRIGGER products_search_vector_trigger
    BEFORE INSERT OR UPDATE ON products
    FOR EACH ROW EXECUTE FUNCTION products_search_vector_update();

-- HNSW index on embedding is created post-pipeline by embedding_service/create_index.py

CREATE TABLE IF NOT EXISTS pending_embeddings (
    id         SERIAL PRIMARY KEY,
    product_id INT NOT NULL REFERENCES products(id) ON DELETE CASCADE,
    status     VARCHAR(20) DEFAULT 'pending',  -- pending | processing | done | failed
    attempts   INT DEFAULT 0,
    created_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS users (
    id         SERIAL PRIMARY KEY,
    email      TEXT UNIQUE NOT NULL,
    password   TEXT NOT NULL,
    name       TEXT NOT NULL,
    role       VARCHAR(20) NOT NULL DEFAULT 'USER',
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS cart_items (
    id         SERIAL PRIMARY KEY,
    user_id    INT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    product_id INT NOT NULL,
    size       TEXT NOT NULL DEFAULT '',
    quantity   INT NOT NULL DEFAULT 1,
    UNIQUE (user_id, product_id, size)
);

CREATE INDEX IF NOT EXISTS cart_items_user_id_idx ON cart_items (user_id);

CREATE TABLE IF NOT EXISTS orders (
    id               SERIAL PRIMARY KEY,
    user_id          INT NOT NULL REFERENCES users(id),
    status           VARCHAR(50) NOT NULL DEFAULT 'CONFIRMED',
    total            DECIMAL(10,2) NOT NULL,
    shipping_name    TEXT NOT NULL,
    shipping_address TEXT NOT NULL,
    shipping_city    TEXT NOT NULL,
    shipping_state   TEXT NOT NULL,
    shipping_zip     TEXT NOT NULL,
    payment_last4    CHAR(4)     NOT NULL DEFAULT '0000',
    payment_status   VARCHAR(50) NOT NULL DEFAULT 'PAID',
    created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS order_items (
    id         SERIAL PRIMARY KEY,
    order_id   INT NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
    product_id INT NOT NULL,
    name       TEXT NOT NULL,
    price      DECIMAL(10,2) NOT NULL,
    quantity   INT NOT NULL,
    size       TEXT
);

CREATE INDEX IF NOT EXISTS orders_user_id_idx ON orders (user_id);
CREATE INDEX IF NOT EXISTS order_items_order_id_idx ON order_items (order_id);
