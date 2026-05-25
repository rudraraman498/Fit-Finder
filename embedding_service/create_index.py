"""
Creates an HNSW index on products.embedding for fast cosine similarity search.
Run once after pipeline.py has finished inserting all product embeddings.
Idempotent: safe to run multiple times.

Run:
    python create_index.py
"""

import psycopg
from config import settings


def create_hnsw_index() -> None:
    dsn = (
        f"host={settings.db_host} port={settings.db_port} "
        f"dbname={settings.db_name} user={settings.db_user} "
        f"password={settings.db_password}"
    )
    with psycopg.connect(dsn, autocommit=True) as conn:
        print("Creating HNSW index on products.embedding ...")
        conn.execute("""
            CREATE INDEX IF NOT EXISTS products_embedding_hnsw_idx
            ON products
            USING hnsw (embedding vector_cosine_ops)
            WITH (m = 16, ef_construction = 64)
        """)
        print("Done. Index created (or already existed).")


if __name__ == "__main__":
    create_hnsw_index()
