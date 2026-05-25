"""
Reads fashion catalog CSVs, generates product embeddings via Ollama, and upserts into PostgreSQL.
Idempotent:
  - products keyed by slug
  - variants keyed by sku
  - existing embeddings are preserved unless re-embedding is requested

Run:
    python pipeline.py
"""

import csv
import json
import logging
from collections import defaultdict
from pathlib import Path

import httpx
import psycopg
from pgvector.psycopg import register_vector
from psycopg.rows import dict_row

from embedding_client import get_embedding
from config import settings

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(message)s",
)
log = logging.getLogger(__name__)

DATA_DIR = Path(__file__).parent / "data"
PRODUCTS_CSV = DATA_DIR / "products.csv"
VARIANTS_CSV = DATA_DIR / "product_variants.csv"


def _parse_bool(raw: str | None, default: bool) -> bool:
    if raw is None or raw.strip() == "":
        return default
    return raw.strip().lower() in {"1", "true", "t", "yes", "y"}


def _parse_tags(raw: str | None) -> list[str]:
    if not raw:
        return []
    return [t.strip() for t in raw.split(";") if t.strip()]


def _parse_image_gallery(raw: str | None, primary_image_url: str) -> list[dict]:
    if raw and raw.strip():
        try:
            parsed = json.loads(raw)
            if isinstance(parsed, list) and parsed:
                return parsed
        except json.JSONDecodeError:
            log.warning("Invalid image_gallery JSON. Falling back to primary image.")
    return [{"url": primary_image_url, "altText": None, "primary": True}]


def load_products_csv() -> list[dict]:
    products = []
    with PRODUCTS_CSV.open(newline="", encoding="utf-8") as f:
        for row in csv.DictReader(f):
            primary_image_url = row["primary_image_url"].strip()
            product = {
                "slug": row["slug"].strip(),
                "name": row["name"].strip(),
                "brand": row["brand"].strip(),
                "description": row["description"].strip(),
                "category": row["category"].strip(),
                "subcategory": row["subcategory"].strip(),
                "base_price": float(row["base_price"]),
                "material": (row.get("material") or "").strip() or None,
                "fit": (row.get("fit") or "").strip() or None,
                "tags": _parse_tags(row.get("tags")),
                "gender": (row.get("gender") or "unisex").strip() or "unisex",
                "primary_image_url": primary_image_url,
                "image_gallery": _parse_image_gallery(row.get("image_gallery"), primary_image_url),
                "active": _parse_bool(row.get("active"), True),
            }
            products.append(product)
    log.info("Loaded %d products from %s.", len(products), PRODUCTS_CSV.name)
    return products


def load_variants_csv() -> dict[str, list[dict]]:
    variants_by_slug: dict[str, list[dict]] = defaultdict(list)
    with VARIANTS_CSV.open(newline="", encoding="utf-8") as f:
        for row in csv.DictReader(f):
            slug = row["slug"].strip()
            variant = {
                "sku": row["sku"].strip(),
                "color_name": row["color_name"].strip(),
                "size_label": row["size_label"].strip(),
                "size_system": row["size_system"].strip(),
                "stock_qty": int(row["stock_qty"]),
                "price_override": float(row["price_override"]) if (row.get("price_override") or "").strip() else None,
                "active": _parse_bool(row.get("active"), True),
            }
            variants_by_slug[slug].append(variant)
    log.info("Loaded %d slugs of variants from %s.", len(variants_by_slug), VARIANTS_CSV.name)
    return variants_by_slug


def _build_text(product: dict, variants: list[dict], extra_tags: list[str] | None = None) -> str:
    all_tags = list(product["tags"]) + (extra_tags or [])
    colors = sorted({v["color_name"] for v in variants if v.get("active", True)})
    sizes = sorted({f"{v['size_label']} ({v['size_system']})" for v in variants if v.get("active", True)})

    parts = [
        f"{product['name']}.",
        f"Brand: {product['brand']}.",
        product["description"],
        f"Category: {product['category']}.",
        f"Subcategory: {product['subcategory']}.",
    ]
    if product.get("material"):
        parts.append(f"Material: {product['material']}.")
    if product.get("fit"):
        parts.append(f"Fit: {product['fit']}.")
    if colors:
        parts.append(f"Colors: {', '.join(colors)}.")
    if sizes:
        parts.append(f"Sizes: {', '.join(sizes)}.")
    if all_tags:
        parts.append(f"Tags: {', '.join(all_tags)}.")
    if product.get("gender") and product["gender"] != "unisex":
        parts.append(f"Gender: {product['gender']}.")
    return " ".join(parts)


def expand_tags(product: dict, client: httpx.Client) -> list[str]:
    prompt = (
        "You are a product tagging assistant for a fashion and footwear e-commerce platform.\n"
        "Given a product description and existing tags, generate additional relevant search tags.\n"
        "Focus on style terms, synonyms, occasions, fit cues, and customer search phrases.\n\n"
        f"Description: {product['description']}\n"
        f"Existing tags: {', '.join(product['tags'])}\n\n"
        "Return ONLY a comma-separated list of 5-10 new tags. No explanations."
    )
    url = f"{settings.ollama_base_url}/api/generate"
    payload = {
        "model": settings.query_expansion_model,
        "prompt": prompt,
        "stream": False,
        "options": {"temperature": 0.3, "num_predict": 100},
    }
    try:
        response = client.post(url, json=payload, timeout=60.0)
        response.raise_for_status()
        text = response.json().get("response", "").strip()
        new_tags = [t.strip().lower() for t in text.split(",") if t.strip()]
        existing = {t.lower() for t in product["tags"]}
        return [t for t in new_tags if t not in existing]
    except Exception as exc:
        log.warning("Tag expansion failed for '%s': %s", product["name"], exc)
        return []


def get_connection() -> psycopg.Connection:
    dsn = (
        f"host={settings.db_host} port={settings.db_port} "
        f"dbname={settings.db_name} user={settings.db_user} "
        f"password={settings.db_password}"
    )
    conn = psycopg.connect(dsn, row_factory=dict_row)
    register_vector(conn)
    return conn


def get_existing_products(conn: psycopg.Connection) -> dict[str, bool]:
    rows = conn.execute(
        "SELECT slug, (embedding IS NOT NULL) AS has_embedding FROM products"
    ).fetchall()
    return {row["slug"]: bool(row["has_embedding"]) for row in rows}


def upsert_product(
    conn: psycopg.Connection,
    product: dict,
    embedding: list[float] | None,
) -> int:
    row = conn.execute(
        """
        INSERT INTO products (
            slug, name, brand, description, category, subcategory, base_price,
            material, fit, tags, gender, primary_image_url, image_gallery, active, embedding
        )
        VALUES (
            %(slug)s, %(name)s, %(brand)s, %(description)s, %(category)s, %(subcategory)s, %(base_price)s,
            %(material)s, %(fit)s, %(tags)s, %(gender)s, %(primary_image_url)s, %(image_gallery)s::jsonb, %(active)s, %(embedding)s
        )
        ON CONFLICT (slug) DO UPDATE
            SET name              = EXCLUDED.name,
                brand             = EXCLUDED.brand,
                description       = EXCLUDED.description,
                category          = EXCLUDED.category,
                subcategory       = EXCLUDED.subcategory,
                base_price        = EXCLUDED.base_price,
                material          = EXCLUDED.material,
                fit               = EXCLUDED.fit,
                tags              = EXCLUDED.tags,
                gender            = EXCLUDED.gender,
                primary_image_url = EXCLUDED.primary_image_url,
                image_gallery     = EXCLUDED.image_gallery,
                active            = EXCLUDED.active,
                embedding         = COALESCE(EXCLUDED.embedding, products.embedding)
        RETURNING id
        """,
        {
            "slug": product["slug"],
            "name": product["name"],
            "brand": product["brand"],
            "description": product["description"],
            "category": product["category"],
            "subcategory": product["subcategory"],
            "base_price": product["base_price"],
            "material": product["material"],
            "fit": product["fit"],
            "tags": product["tags"],
            "gender": product["gender"],
            "primary_image_url": product["primary_image_url"],
            "image_gallery": json.dumps(product["image_gallery"], ensure_ascii=False),
            "active": product["active"],
            "embedding": embedding,
        },
    ).fetchone()
    return row["id"]


def upsert_variants(
    conn: psycopg.Connection,
    product_id: int,
    variants: list[dict],
) -> None:
    for variant in variants:
        conn.execute(
            """
            INSERT INTO product_variants (
                product_id, sku, color_name, size_label, size_system, stock_qty, price_override, active
            )
            VALUES (
                %(product_id)s, %(sku)s, %(color_name)s, %(size_label)s, %(size_system)s, %(stock_qty)s, %(price_override)s, %(active)s
            )
            ON CONFLICT (sku) DO UPDATE
                SET product_id    = EXCLUDED.product_id,
                    color_name    = EXCLUDED.color_name,
                    size_label    = EXCLUDED.size_label,
                    size_system   = EXCLUDED.size_system,
                    stock_qty     = EXCLUDED.stock_qty,
                    price_override = EXCLUDED.price_override,
                    active        = EXCLUDED.active
            """,
            {
                "product_id": product_id,
                "sku": variant["sku"],
                "color_name": variant["color_name"],
                "size_label": variant["size_label"],
                "size_system": variant["size_system"],
                "stock_qty": variant["stock_qty"],
                "price_override": variant["price_override"],
                "active": variant["active"],
            },
        )


def run_pipeline() -> None:
    products = load_products_csv()
    variants_by_slug = load_variants_csv()

    with get_connection() as conn:
        existing = get_existing_products(conn)
        log.info("Loaded existing product state for %d slugs.", len(existing))

        with httpx.Client() as http_client:
            for i, product in enumerate(products, start=1):
                slug = product["slug"]
                variants = variants_by_slug.get(slug, [])
                if not variants:
                    raise ValueError(f"No variants found for slug '{slug}'.")

                has_embedding = existing.get(slug, False)
                should_reembed = settings.enable_tag_expansion or not has_embedding

                embedding = None
                if should_reembed:
                    log.info("[%d/%d] Embedding: %s", i, len(products), slug)
                    extra_tags = expand_tags(product, http_client) if settings.enable_tag_expansion else []
                    if extra_tags:
                        log.info("  Expanded tags: %s", extra_tags)
                    text = _build_text(product, variants, extra_tags)
                    try:
                        embedding = get_embedding(text, http_client)
                    except Exception as exc:
                        log.warning(
                            "Embedding failed for %s (%s). Continuing with NULL embedding.",
                            slug, exc,
                        )
                else:
                    log.info("[%d/%d] Reusing existing embedding: %s", i, len(products), slug)

                product_id = upsert_product(conn, product, embedding)
                upsert_variants(conn, product_id, variants)
                conn.commit()
                log.info("[%d/%d] Stored: %s (id=%s, variants=%d)", i, len(products), slug, product_id, len(variants))

    log.info("Pipeline complete. %d products processed.", len(products))


if __name__ == "__main__":
    run_pipeline()
