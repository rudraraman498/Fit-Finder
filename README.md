# FitFinder

An AI-powered fashion e-commerce platform with semantic search, vector embeddings, and a full order + payment flow.

---

## Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                        Browser                              │
│                React + MUI (port 3000)                      │
└───────────────────────────┬─────────────────────────────────┘
                            │ REST
          ┌─────────────────┴──────────────────┐
          │                                    │
          ▼                                    ▼
┌──────────────────┐                ┌─────────────────────┐
│  commerce_service│                │    api_service      │
│  Spring Boot     │                │    FastAPI          │
│  (port 8080)     │                │    (port 8000)      │
│                  │                │                     │
│  Auth, Products  │                │  Semantic search,   │
│  Cart, Orders    │                │  Embedding proxy    │
└────────┬─────────┘                └──────────┬──────────┘
         │                                     │
         └──────────────┬──────────────────────┘
                        │
                        ▼
            ┌───────────────────────┐
            │   PostgreSQL + pgvec  │
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
                        │
            ┌───────────────────────┐
            │  embedding_service    │
            │  Python               │
            │  (offline pipeline)   │
            │                       │
            │  CSV ingest           │
            │  Ollama embeddings    │
            │  HNSW index build     │
            └───────────────────────┘
```

---

## Services

| Service | Stack | Port | Purpose |
|---|---|---|---|
| `frontend` | React 18, MUI v9 | 3000 | UI — search, browse, cart, checkout, orders |
| `commerce_service` | Spring Boot 4, Java 21 | 8080 | Auth (JWT), products, cart, orders |
| `api_service` | FastAPI, Python 3.13 | 8000 | Semantic search, embedding proxy |
| `embedding_service` | Python, psycopg, Ollama | — | Offline data pipeline, HNSW index |
| `postgres` | pgvector/pg16 | 5433 | Primary database with vector extension |

---

## Prerequisites

- **Docker** + **Docker Compose**
- **Java 21** (for local backend dev)
- **Node.js 20+** (for frontend dev)
- **Python 3.11+** with `venv` (for embedding pipeline)
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

This starts the Postgres container and runs `infra/postgres/init.sql` on first boot, creating all tables and indexes.

### 3. Run the embedding pipeline

Populates the `products` and `product_variants` tables and generates vector embeddings.

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

App is available at [http://localhost:3000](http://localhost:3000).

---

## Features

- **AI Semantic Search** — natural language queries ("red running shoes under $100") powered by `nomic-embed-text` embeddings and HNSW vector search
- **Hybrid Search** — combines vector similarity with PostgreSQL full-text search, merged via Reciprocal Rank Fusion (RRF)
- **Cross-encoder Reranking** — optional `ms-marco-MiniLM-L-6-v2` reranker improves result precision
- **Auth** — JWT-based registration and login; anonymous carts are merged on sign-in
- **Cart** — session-based for guests, DB-persisted for logged-in users
- **Checkout** — shipping form + simulated card payment with Luhn validation, card type detection, and expiry checks
- **Orders** — full order history with status and payment details

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

### Root `.env` (Postgres + embedding_service)

| Variable | Default | Description |
|---|---|---|
| `POSTGRES_DB` | `fitfinder` | Database name |
| `POSTGRES_USER` | `fitfinder` | DB user |
| `POSTGRES_PASSWORD` | — | DB password (**required**) |
| `POSTGRES_HOST` | `localhost` | DB host |
| `POSTGRES_PORT` | `5432` | DB port (container internal) |
| `OLLAMA_BASE_URL` | `http://localhost:11434` | Ollama API |
| `OLLAMA_MODEL` | `nomic-embed-text` | Embedding model |
| `ENABLE_RERANKING` | `true` | Cross-encoder reranking |
| `ENABLE_QUERY_EXPANSION` | `false` | LLM query expansion (adds latency) |
| `ENABLE_TAG_EXPANSION` | `false` | LLM tag enrichment at index time |

### `frontend/.env`

| Variable | Default | Description |
|---|---|---|
| `REACT_APP_COMMERCE_URL` | `http://localhost:8080` | commerce_service base URL |
| `REACT_APP_AI_URL` | `http://localhost:8000` | api_service base URL |

---

## API Overview

### commerce_service (`:8080`)

| Method | Path | Auth | Description |
|---|---|---|---|
| `POST` | `/auth/register` | — | Register new user |
| `POST` | `/auth/login` | — | Login, returns JWT |
| `POST` | `/auth/merge-cart` | ✅ | Merge guest cart into user cart |
| `GET` | `/products` | — | Paginated product list |
| `GET` | `/products/:id` | — | Single product detail |
| `GET` | `/cart` | — | Get cart (session or DB) |
| `POST` | `/cart` | — | Add item to cart |
| `DELETE` | `/cart/:productId` | — | Remove item from cart |
| `POST` | `/orders` | ✅ | Place order (clears cart) |
| `GET` | `/orders` | ✅ | List user's orders |
| `GET` | `/orders/:id` | ✅ | Get single order |

### api_service (`:8000`)

| Method | Path | Description |
|---|---|---|
| `GET` | `/search?q=...` | Semantic + keyword product search |
| `POST` | `/embed` | Generate embedding for a text string |
| `GET` | `/health` | Health check |

---

## Database Schema

```
users           id, email, password, name, created_at
products        id, slug, name, brand, description, category, base_price, embedding, ...
product_variants id, product_id, sku, color_name, size_label, stock_qty, ...
cart_items      id, user_id, product_id, size, quantity
orders          id, user_id, status, total, shipping_*, payment_last4, payment_status, created_at
order_items     id, order_id, product_id, name, price, quantity, size
pending_embeddings id, product_id, status, attempts, created_at
```

---

## Project Structure

```
FitFinder/
├── docker-compose.yml
├── .env.example
├── infra/
│   └── postgres/
│       └── init.sql              # Schema + indexes
├── frontend/                     # React app
│   └── src/
│       ├── api/                  # Service clients
│       ├── components/           # Navbar, ProductCard
│       ├── context/              # AuthContext
│       └── pages/                # SearchPage, ProductsPage, CartPage,
│                                 # CheckoutPage, OrderConfirmationPage, OrdersPage
├── commerce_service/             # Spring Boot
│   └── src/main/java/com/fitfinder/commerce/
│       ├── controller/           # REST controllers
│       ├── service/              # Business logic
│       ├── repository/           # JDBC repositories
│       ├── dto/                  # Request/response records
│       ├── entity/               # User record
│       └── config/               # Security, JWT, CORS
├── api_service/                  # FastAPI
│   └── routers/                  # search, embed, health
└── embedding_service/            # Offline pipeline
    ├── pipeline.py               # CSV ingest + embed
    ├── create_index.py           # HNSW index builder
    ├── search.py                 # Search logic
    └── data/                     # Product CSVs
```
