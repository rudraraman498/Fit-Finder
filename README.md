# FitFinder

An AI-powered fashion e-commerce platform with semantic search, vector embeddings, a full order and payment flow, an admin dashboard, and an MCP server for AI-agent-driven store management.

---

## Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                           Browser                               │
│              React 19 + MUI v9 (port 3000)                      │
│                                                                 │
│   Storefront (search, browse, cart, checkout, orders)           │
│   Admin panel (dashboard, products, orders, users)              │
└──────────────────────┬──────────────────────────────────────────┘
                       │ REST
         ┌─────────────┴──────────────┐
         │                            │
         ▼                            ▼
┌──────────────────┐        ┌─────────────────────┐
│  commerce_service│        │    api_service       │
│  Spring Boot 4   │        │    FastAPI           │
│  Java 21         │        │    Python 3.13       │
│  (port 8080)     │        │    (port 8000)       │
│                  │        │                      │
│  Auth, Products  │        │  Semantic search     │
│  Cart, Orders    │        │  Embedding proxy     │
│  Admin API       │        │  Hybrid retrieval    │
└────────┬─────────┘        └──────────┬───────────┘
         │                             │
         └──────────────┬──────────────┘
                        │
                        ▼
            ┌───────────────────────┐
            │   PostgreSQL 16       │
            │   + pgvector          │
            │   (port 5433)         │
            │                       │
            │  products             │
            │  product_variants     │
            │  users                │
            │  cart_items           │
            │  orders               │
            │  order_items          │
            │  pending_embeddings   │
            └───────────────────────┘
                        ▲
          ┌─────────────┴──────────────┐
          │                            │
┌─────────────────────┐   ┌────────────────────────┐
│  embedding_service  │   │  mcp_server             │
│  Python (offline)   │   │  FastMCP + Python       │
│                     │   │  (stdio transport)       │
│  CSV ingest         │   │                          │
│  Ollama embeddings  │   │  8 admin tools exposed   │
│  HNSW index build   │   │  to AI agents (Claude)   │
└─────────────────────┘   └────────────────────────┘
```

---

## Services

| Service | Stack | Port | Purpose |
|---|---|---|---|
| `frontend` | React 19, MUI v9 | 3000 | Storefront UI + admin panel |
| `commerce_service` | Spring Boot 4, Java 21 | 8080 | Auth (JWT), products, cart, orders, admin API |
| `api_service` | FastAPI, Python 3.13 | 8000 | Semantic search, embedding proxy, hybrid retrieval |
| `embedding_service` | Python, psycopg3, Ollama | — | Offline data pipeline, HNSW index builder |
| `mcp_server` | FastMCP, Python 3.13 | stdio | MCP tools for AI-agent admin access |
| `postgres` | pgvector/pg16, Docker | 5433 | Primary database with vector + full-text search |

---

## Prerequisites

- **Docker** + **Docker Compose**
- **Java 21** (for local backend dev)
- **Node.js 20+** (for frontend dev)
- **Python 3.11+** with `venv` (for embedding pipeline and MCP server)
- **Ollama** with `nomic-embed-text` model pulled

```bash
ollama pull nomic-embed-text
```

---

## Getting Started

### 1. Environment

```bash
cp .env.example .env
cp frontend/.env.example frontend/.env
```

Edit `.env` and set `POSTGRES_PASSWORD` to something secure.

### 2. Start Postgres

```bash
docker compose up -d
```

This starts the Postgres container and runs `infra/postgres/init.sql` on first boot, creating all tables, indexes, and the `search_vector` trigger.

### 3. Run the embedding pipeline

Populates `products` and `product_variants`, generates vector embeddings, and builds the HNSW index.

```bash
cd embedding_service
python -m venv .venv && source .venv/bin/activate
pip install -r requirements.txt
python pipeline.py        # ingest CSVs + embed (~2–5 min depending on machine)
python create_index.py    # build HNSW index for fast ANN search
```

### 4. Start the backend services

**commerce_service** (Spring Boot):
```bash
cd commerce_service
./mvnw spring-boot:run
```

**api_service** (FastAPI):
```bash
cd api_service
pip install -r requirements.txt
uvicorn main:app --port 8000 --reload
```

### 5. Start the frontend

```bash
cd frontend
npm install
npm start
```

Storefront: [http://localhost:3000](http://localhost:3000)
Admin panel: [http://localhost:3000/admin](http://localhost:3000/admin)

### 6. (Optional) Start the MCP server

Exposes admin tools to MCP-compatible AI agents (e.g., Claude Code, Claude Desktop).

```bash
cd mcp_server
pip install -r requirements.txt
```

Add to your Claude config (`claude_desktop_config.json` or Claude Code settings):

```json
{
  "mcpServers": {
    "fitfinder-admin": {
      "command": "python",
      "args": ["/path/to/FitFinder/mcp_server/server.py"],
      "env": {
        "ADMIN_EMAIL": "admin@fitfinder.com",
        "ADMIN_PASSWORD": "admin123",
        "COMMERCE_BASE_URL": "http://localhost:8080"
      }
    }
  }
}
```

---

## Features

### Storefront
- **AI Semantic Search** — natural language queries ("red running shoes under $100") powered by `nomic-embed-text` embeddings (768-dim) and HNSW vector search via pgvector
- **Hybrid Search** — combines vector similarity with PostgreSQL BM25 full-text search, merged via Reciprocal Rank Fusion (RRF); vector and BM25 queries run in parallel
- **Cross-encoder Reranking** — optional `ms-marco-MiniLM-L-6-v2` reranker scores each (query, product) pair for precision; warm-loaded at startup
- **Product Browsing** — paginated catalog with category, gender, and price range filters; product detail pages with variant selection
- **Auth** — JWT-based registration and login (BCrypt passwords); anonymous carts are merged into the user cart on sign-in
- **Cart** — session-based for guests, DB-persisted for logged-in users; merge-on-login with upsert logic
- **Checkout** — multi-step flow: shipping form → payment → confirmation; client-side Luhn card validation, card type detection, expiry and CVV checks
- **Orders** — full order history with per-order detail view; status tracking (CONFIRMED → SHIPPED → DELIVERED → CANCELLED)

### Admin Panel (`/admin`)
- **Separate admin login** — `/admin/auth/login` endpoint issues an ADMIN-role JWT; credentials initialized at startup via `AdminInitializer`
- **Dashboard** — stat cards: total products, total orders, total users, total revenue
- **Product management** — paginated product list; create products with images, variants (SKU, color, size, stock, price override), and metadata; edit existing products; soft-delete (deactivate) without data loss
- **Order management** — paginated order list with customer email; update fulfillment status per order
- **User management** — paginated list of registered users with id, email, name, and signup date

### MCP Server (AI Agent Interface)
- **8 tools** exposed over the Model Context Protocol (stdio transport), usable by Claude and any MCP-compatible agent:
  - `get_dashboard_stats` — products, orders, users, revenue counts
  - `list_users(page, size)` — paginated user list
  - `get_products(page, size, category, gender)` — paginated products with filters
  - `create_product(...)` — full product creation with variants and images
  - `update_product(product_id, ...)` — partial update (only provided fields are changed)
  - `delete_product(product_id)` — soft-delete
  - `list_orders(page, size)` — paginated orders with customer details
  - `update_order_status(order_id, status)` — change fulfillment status
- **Auto-authentication** — `AuthManager` logs in on startup and transparently re-authenticates (thread-safe) on any 401 response

---

## Payment (simulated)

No real payment processor is used. Card details are validated client-side only; only the last 4 digits reach the server.

| Card number | Result |
|---|---|
| Any valid Luhn number | ✅ Success |
| `4000 0000 0000 0002` | ❌ Declined |

Card types are auto-detected: **VISA** (4…), **MC** (5[1-5]… / 2[2-7]…), **AMEX** (34… / 37…), **DISCOVER** (6…).
Amex CVV is 4 digits; all others are 3.

---

## Environment Variables

### Root `.env` (Postgres + embedding_service + api_service)

| Variable | Default | Description |
|---|---|---|
| `POSTGRES_DB` | `fitfinder` | Database name |
| `POSTGRES_USER` | `fitfinder` | DB user |
| `POSTGRES_PASSWORD` | — | DB password (**required**) |
| `POSTGRES_HOST` | `localhost` | DB host |
| `POSTGRES_PORT` | `5432` | DB port (container internal) |
| `OLLAMA_BASE_URL` | `http://localhost:11434` | Ollama API base URL |
| `OLLAMA_MODEL` | `nomic-embed-text` | Embedding model |
| `ENABLE_RERANKING` | `true` | Cross-encoder reranking |
| `ENABLE_QUERY_EXPANSION` | `false` | LLM query expansion (adds latency) |
| `ENABLE_TAG_EXPANSION` | `false` | LLM tag enrichment at index time |
| `HNSW_EF_SEARCH` | `200` | HNSW recall tuning (higher = better recall, slower) |
| `RERANK_SCORE_THRESHOLD` | `-2.0` | Drop reranked results below this score |
| `RRF_SCORE_THRESHOLD` | `0.010` | Drop RRF results below this score |

### `frontend/.env`

| Variable | Default | Description |
|---|---|---|
| `REACT_APP_COMMERCE_URL` | `http://localhost:8080` | commerce_service base URL |
| `REACT_APP_AI_URL` | `http://localhost:8000` | api_service base URL |

### `mcp_server/.env`

| Variable | Default | Description |
|---|---|---|
| `ADMIN_EMAIL` | `admin@fitfinder.com` | Admin account email |
| `ADMIN_PASSWORD` | `admin123` | Admin account password |
| `COMMERCE_BASE_URL` | `http://localhost:8080` | commerce_service base URL |

---

## API Overview

### commerce_service (`:8080`)

#### Storefront

| Method | Path | Auth | Description |
|---|---|---|---|
| `POST` | `/auth/register` | — | Register new user, returns JWT |
| `POST` | `/auth/login` | — | Login, returns JWT |
| `POST` | `/auth/merge-cart` | ✅ | Merge guest session cart into user DB cart |
| `GET` | `/auth/public-key` | — | RSA public key for token verification |
| `GET` | `/products` | — | Paginated product list with optional filters |
| `GET` | `/products/:id` | — | Single product with variants |
| `GET` | `/cart` | — | Get cart (session or DB-backed) |
| `POST` | `/cart` | — | Add item to cart |
| `DELETE` | `/cart/:productId` | — | Remove item from cart |
| `POST` | `/orders` | ✅ | Place order, clears cart |
| `GET` | `/orders` | ✅ | List authenticated user's orders |
| `GET` | `/orders/:id` | ✅ | Get single order detail |
| `GET` | `/health` | — | Health check |

#### Admin (requires ADMIN role JWT)

| Method | Path | Auth | Description |
|---|---|---|---|
| `POST` | `/admin/auth/login` | — | Admin login, returns ADMIN-role JWT |
| `GET` | `/admin/stats` | ✅ ADMIN | Dashboard stats (products, orders, users, revenue) |
| `GET` | `/admin/products` | ✅ ADMIN | Paginated product list (includes inactive) |
| `POST` | `/admin/products` | ✅ ADMIN | Create product with variants and images |
| `PUT` | `/admin/products/:id` | ✅ ADMIN | Update product fields |
| `DELETE` | `/admin/products/:id` | ✅ ADMIN | Soft-delete (deactivate) product |
| `GET` | `/admin/orders` | ✅ ADMIN | Paginated order list with customer details |
| `PUT` | `/admin/orders/:id/status` | ✅ ADMIN | Update order fulfillment status |
| `GET` | `/admin/users` | ✅ ADMIN | Paginated user list |

### api_service (`:8000`)

| Method | Path | Description |
|---|---|---|
| `POST` | `/search` | Semantic + BM25 hybrid search with optional reranking |
| `POST` | `/embed` | Generate embedding vector for a text string |
| `GET` | `/health` | Health check |

**Search request body:**
```json
{
  "query": "lightweight trail running shoes",
  "k": 10,
  "category": "Footwear",
  "gender": "men's",
  "min_price": 0,
  "max_price": 150
}
```

---

## Search Pipeline

Queries go through up to 4 stages:

1. **Query expansion** (optional, `ENABLE_QUERY_EXPANSION=true`) — local LLM (`llama3.1`) rewrites the query with synonyms
2. **Embedding** — query text → 768-dim vector via `nomic-embed-text` (Ollama)
3. **Parallel hybrid retrieval:**
   - **Vector search** — HNSW cosine similarity (`ef_search=200`) via pgvector
   - **BM25 search** — PostgreSQL full-text GIN index
   - Both run concurrently; results merged via Reciprocal Rank Fusion (RRF, k=60)
4. **Cross-encoder reranking** (optional, `ENABLE_RERANKING=true`) — `ms-marco-MiniLM-L-6-v2` scores each (query, product) pair jointly

---

## Database Schema

```
users              id, email, password (BCrypt), name, role, created_at
products           id, slug, name, brand, description, category, subcategory,
                   base_price, material, fit, tags[], gender, primary_image_url,
                   image_gallery (JSONB), active, embedding (VECTOR 768),
                   search_vector (TSVECTOR), created_at
product_variants   id, product_id, sku, color_name, size_label, size_system,
                   stock_qty, price_override, active, created_at
cart_items         id, user_id, product_id, size, quantity
                   UNIQUE(user_id, product_id, size)
orders             id, user_id, status, total, shipping_name, shipping_address,
                   shipping_city, shipping_state, shipping_zip,
                   payment_last4, payment_status, created_at
order_items        id, order_id, product_id, name, price, quantity, size
pending_embeddings id, product_id, status, attempts, created_at
```

**Indexes:**
- `HNSW` on `products.embedding` (`vector_cosine_ops`, M=16, ef_construction=64)
- `GIN` on `products.search_vector`
- `TSVECTOR` trigger auto-updates `search_vector` on every product insert/update
- Composite indexes on `product_variants(product_id, active)` and `cart_items(user_id)`

---

## Project Structure

```
FitFinder/
├── docker-compose.yml
├── .env.example
├── infra/
│   └── postgres/
│       └── init.sql                   # Schema, indexes, search_vector trigger
├── frontend/                          # React SPA
│   └── src/
│       ├── api/                       # authService, adminService, cartService, etc.
│       ├── components/                # Navbar, ProductCard, admin/AdminLayout
│       ├── context/                   # AuthContext
│       └── pages/
│           ├── SearchPage.jsx
│           ├── ProductsPage.jsx
│           ├── ProductDetailPage.jsx
│           ├── CartPage.jsx
│           ├── CheckoutPage.jsx
│           ├── OrderConfirmationPage.jsx
│           ├── OrdersPage.jsx
│           ├── LoginPage.jsx
│           ├── RegisterPage.jsx
│           └── admin/
│               ├── AdminLoginPage.jsx
│               ├── AdminDashboard.jsx
│               ├── AdminProductsPage.jsx
│               ├── AdminOrdersPage.jsx
│               └── AdminUsersPage.jsx
├── commerce_service/                  # Spring Boot backend
│   └── src/main/java/com/fitfinder/commerce/
│       ├── controller/                # AuthController, ProductController,
│       │                              # CartController, OrderController,
│       │                              # AdminController, AdminAuthController,
│       │                              # PublicKeyController, HealthController
│       ├── service/                   # AuthService, ProductService, CartService,
│       │                              # OrderService, EmbeddingWorker
│       ├── repository/                # UserRepository, ProductRepository,
│       │                              # OrderRepository, CartItemRepository
│       ├── dto/                       # Request/response records
│       ├── entity/                    # User
│       └── config/                    # SecurityConfig, JwtFilter, JwtUtil,
│                                      # AppConfig, AdminInitializer, RsaKeyService
├── api_service/                       # FastAPI search service
│   └── routers/                       # search, embed, health
├── embedding_service/                 # Offline Python pipeline
│   ├── pipeline.py                    # CSV ingest + embed
│   ├── create_index.py                # HNSW index builder
│   ├── search.py                      # Search logic (used by api_service)
│   └── data/                          # Product CSVs
└── mcp_server/                        # MCP admin tool server
    ├── server.py                      # FastMCP tool definitions (8 tools)
    ├── auth.py                        # AuthManager (login + re-auth)
    ├── client.py                      # CommerceClient (HTTP wrapper)
    └── requirements.txt
```

---

## Testing

**Backend (JUnit 5 + Maven):**
```bash
cd commerce_service
./mvnw test
```
Covers: `AuthServiceTest`, `CartServiceTest`, `ProductServiceTest`, DTO validation tests.

**Frontend (Jest + React Testing Library):**
```bash
cd frontend
npm test
```

**E2E (Cypress):**
```bash
cd frontend
npm run cypress:open    # interactive
npm run cypress:run     # headless / CI
```
