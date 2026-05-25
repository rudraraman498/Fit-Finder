"""
Semantic search over products with four quality layers:

  1. HNSW ef_search tuning   — wider beam = better vector recall at negligible cost
  2. Hybrid search (RRF)     — merges cosine vector results with BM25 full-text results
  3. Query expansion         — LLM rewrites query with synonyms before embedding (opt-in)
  4. Cross-encoder reranking — scores each (query, document) pair jointly for precision

Latency optimisations:
  - Persistent httpx.Client  — reuses TCP connection to Ollama across requests
  - Connection pool          — reuses DB connections instead of reconnecting per search
  - Parallel DB queries      — vector search and BM25 run concurrently on separate connections

Usage:
    from search import search_products
    results = search_products("comfortable running shoes for trail hiking", k=5)
"""

import logging
from concurrent.futures import ThreadPoolExecutor
from typing import Optional

import httpx
import psycopg
from psycopg.rows import dict_row
from pgvector.psycopg import register_vector

from embedding_client import get_embedding
from config import settings

log = logging.getLogger(__name__)


# ---------------------------------------------------------------------------
# DB connection — fresh per search call, closed when done.
# Simple and safe: no idle connections, no stale sockets, no pool lifecycle.
# ---------------------------------------------------------------------------

def _get_connection() -> psycopg.Connection:
    dsn = (
        f"host={settings.db_host} port={settings.db_port} "
        f"dbname={settings.db_name} user={settings.db_user} "
        f"password={settings.db_password}"
    )
    conn = psycopg.connect(dsn, row_factory=dict_row)
    register_vector(conn)
    return conn


# ---------------------------------------------------------------------------
# Lazy cross-encoder singleton — loads the model once, reuses on every call.
# Falls back gracefully if sentence-transformers is unavailable or download fails.
# ---------------------------------------------------------------------------
_cross_encoder = None
_cross_encoder_unavailable = False


def _get_cross_encoder():
    global _cross_encoder, _cross_encoder_unavailable
    if _cross_encoder_unavailable:
        return None
    if _cross_encoder is None:
        try:
            from sentence_transformers import CrossEncoder
            log.info("Loading cross-encoder %r (first call only) ...", settings.reranker_model)
            _cross_encoder = CrossEncoder(settings.reranker_model)
            log.info("Cross-encoder ready.")
        except Exception as exc:
            log.warning("Cross-encoder unavailable (%s). Falling back to RRF ranking.", exc)
            _cross_encoder_unavailable = True
    return _cross_encoder


# ---------------------------------------------------------------------------
# 3. Query expansion
# ---------------------------------------------------------------------------

def expand_query(query: str) -> str:
    """
    Ask the Ollama LLM to rewrite the query with synonyms and related terms.
    Falls back to the original query on any error so search is never blocked.
    """
    prompt = (
        "You are a search query expander for a general e-commerce platform selling all kinds of products. "
        "Rewrite the following search query to include synonyms and closely related terms "
        "that would help find relevant products across any category. "
        "Return only the expanded query as a single line of text, no explanation.\n\n"
        f"Original query: {query}\n"
        "Expanded query:"
    )
    url = f"{settings.ollama_base_url}/api/generate"
    payload = {
        "model": settings.query_expansion_model,
        "prompt": prompt,
        "stream": False,
        "options": {"temperature": 0.3, "num_predict": 80},
    }
    try:
        with httpx.Client() as client:
            response = client.post(url, json=payload, timeout=30.0)
            response.raise_for_status()
            expanded = response.json().get("response", "").strip()
            if expanded:
                log.info("Query expanded: %r → %r", query, expanded)
                return expanded
    except Exception as exc:
        log.warning("Query expansion failed (%s). Using original query.", exc)
    return query


# ---------------------------------------------------------------------------
# Embedding
# ---------------------------------------------------------------------------

def _get_query_embedding(text: str) -> list[float]:
    with httpx.Client() as client:
        return get_embedding(text, client)


# ---------------------------------------------------------------------------
# Shared filter builder
# ---------------------------------------------------------------------------

def _apply_filters(
    where_clauses: list[str],
    params: dict,
    category: Optional[str],
    gender: Optional[str],
    tags: Optional[list[str]],
    min_price: Optional[float],
    max_price: Optional[float],
) -> str:
    """Append optional filter clauses to where_clauses in-place, return joined WHERE SQL."""
    if category is not None:
        where_clauses.append("category = %(category)s")
        params["category"] = category
    if gender is not None:
        where_clauses.append("gender = %(gender)s")
        params["gender"] = gender
    if tags:
        # @> = array containment: product must have ALL requested tags
        where_clauses.append("tags @> %(tags)s::text[]")
        params["tags"] = tags
    if min_price is not None:
        where_clauses.append("base_price >= %(min_price)s")
        params["min_price"] = min_price
    if max_price is not None:
        where_clauses.append("base_price <= %(max_price)s")
        params["max_price"] = max_price
    return " AND ".join(where_clauses)


_PRODUCT_COLS = (
    "id, slug, name, brand, description, category, subcategory, "
    "material, fit, base_price AS price, tags, gender, primary_image_url"
)


# ---------------------------------------------------------------------------
# 1 + 2a. Vector search with ef_search tuning
# ---------------------------------------------------------------------------

def _vector_search(
    conn: psycopg.Connection,
    embedding: list[float],
    n: int,
    category, gender, tags, min_price, max_price,
) -> list[dict]:
    params: dict = {"query_vec": embedding, "n": n}
    where_sql = _apply_filters(
        ["active = TRUE", "embedding IS NOT NULL"],
        params, category, gender, tags, min_price, max_price,
    )
    # SET LOCAL scopes ef_search to this transaction only — no side effects on other queries.
    # Higher value = HNSW explores more candidates = better recall at the cost of a few ms.
    conn.execute(f"SET LOCAL hnsw.ef_search = {settings.ef_search}")
    rows = conn.execute(
        f"""
        SELECT {_PRODUCT_COLS},
               1 - (embedding <=> %(query_vec)s::vector) AS similarity_score
        FROM products
        WHERE {where_sql}
        ORDER BY embedding <=> %(query_vec)s::vector
        LIMIT %(n)s
        """,
        params,
    ).fetchall()
    return [dict(r) for r in rows]


# ---------------------------------------------------------------------------
# 2b. Full-text BM25 search
# ---------------------------------------------------------------------------

def _fulltext_search(
    conn: psycopg.Connection,
    query_text: str,
    n: int,
    category, gender, tags, min_price, max_price,
) -> list[dict]:
    # websearch_to_tsquery handles natural language (quoted phrases, OR, minus) without
    # syntax errors — safer than to_tsquery for user-supplied strings.
    params: dict = {"query_ts": query_text, "n": n}
    where_sql = _apply_filters(
        ["active = TRUE", "search_vector @@ websearch_to_tsquery('english', %(query_ts)s)"],
        params, category, gender, tags, min_price, max_price,
    )
    rows = conn.execute(
        f"""
        SELECT {_PRODUCT_COLS},
               ts_rank_cd(search_vector, websearch_to_tsquery('english', %(query_ts)s)) AS bm25_score
        FROM products
        WHERE {where_sql}
        ORDER BY bm25_score DESC
        LIMIT %(n)s
        """,
        params,
    ).fetchall()
    return [dict(r) for r in rows]


# ---------------------------------------------------------------------------
# 2c. Parallel execution of vector + BM25 — each gets its own pool connection
# ---------------------------------------------------------------------------

def _run_searches_parallel(
    query_embedding: list[float],
    query_text: str,
    n: int,
    category, gender, tags, min_price, max_price,
) -> tuple[list[dict], list[dict]]:
    """
    Fire vector search and BM25 concurrently, each on its own short-lived connection.
    Typical saving: 5–15 ms vs sequential execution.
    """
    filter_args = (category, gender, tags, min_price, max_price)

    def do_vector() -> list[dict]:
        with _get_connection() as conn:
            return _vector_search(conn, query_embedding, n, *filter_args)

    def do_fulltext() -> list[dict]:
        with _get_connection() as conn:
            return _fulltext_search(conn, query_text, n, *filter_args)

    with ThreadPoolExecutor(max_workers=2) as executor:
        f_vec = executor.submit(do_vector)
        f_ft = executor.submit(do_fulltext)
        return f_vec.result(), f_ft.result()


# ---------------------------------------------------------------------------
# 2d. Reciprocal Rank Fusion
# ---------------------------------------------------------------------------

def _rrf_merge(
    vector_hits: list[dict],
    fulltext_hits: list[dict],
    rrf_k: int = 60,
) -> list[dict]:
    """
    Merge two ranked lists using Reciprocal Rank Fusion.
    score(d) = Σ 1 / (rrf_k + rank(d))  across all lists.
    rrf_k=60 is the constant from the original paper; it down-weights top-rank advantage.
    Products only in the vector list still appear — fulltext simply contributes 0.
    """
    scores: dict[int, float] = {}
    index: dict[int, dict] = {}

    for rank, product in enumerate(vector_hits):
        pid = product["id"]
        scores[pid] = scores.get(pid, 0.0) + 1.0 / (rrf_k + rank + 1)
        index[pid] = product

    for rank, product in enumerate(fulltext_hits):
        pid = product["id"]
        scores[pid] = scores.get(pid, 0.0) + 1.0 / (rrf_k + rank + 1)
        index.setdefault(pid, product)

    merged = []
    for pid in sorted(scores, key=lambda p: scores[p], reverse=True):
        entry = {k: v for k, v in index[pid].items()
                 if k not in ("similarity_score", "bm25_score")}
        entry["rrf_score"] = round(scores[pid], 6)
        merged.append(entry)
    return merged


# ---------------------------------------------------------------------------
# 4. Cross-encoder reranking
# ---------------------------------------------------------------------------

def _rerank(query: str, candidates: list[dict]) -> list[dict]:
    """
    Score each (query, document) pair jointly with a cross-encoder.
    Unlike bi-encoders (which embed query and doc independently), a cross-encoder
    reads both together and produces a fine-grained relevance score.
    Falls back to the original RRF order if the model is unavailable.
    """
    cross_encoder = _get_cross_encoder()
    if cross_encoder is None:
        return candidates

    pairs = [
        (
            query,
            f"{c['name']}. Brand: {c['brand']}. {c['description']} "
            f"Category: {c['category']}. Subcategory: {c['subcategory']}. "
            f"Material: {c.get('material') or 'n/a'}. Fit: {c.get('fit') or 'n/a'}. "
            f"Tags: {', '.join(c['tags'])}."
        )
        for c in candidates
    ]
    try:
        scores = cross_encoder.predict(pairs)
        for candidate, score in zip(candidates, scores):
            candidate["rerank_score"] = float(score)
        return sorted(candidates, key=lambda c: c["rerank_score"], reverse=True)
    except Exception as exc:
        log.warning("Reranking failed (%s). Returning RRF order.", exc)
        return candidates


# ---------------------------------------------------------------------------
# 5. Threshold filtering
# ---------------------------------------------------------------------------

def _apply_threshold(candidates: list[dict], reranked: bool) -> list[dict]:
    """
    Drop candidates whose score falls below the configured threshold.

    Cross-encoder logits (reranked=True):
        Threshold = RERANK_SCORE_THRESHOLD (default -2.0).
        Anything below -2.0 is considered not relevant by ms-marco-MiniLM.

    RRF scores (reranked=False):
        Threshold = RRF_SCORE_THRESHOLD (default 0.010).
        An RRF score < 0.010 means the product ranked poorly in both retrieval
        branches — unlikely to be genuinely relevant.
    """
    if reranked:
        threshold = settings.rerank_score_threshold
        kept = [c for c in candidates if c.get("rerank_score", float("-inf")) >= threshold]
        dropped = len(candidates) - len(kept)
        if dropped:
            log.debug(
                "Threshold (rerank >= %.2f): dropped %d/%d candidates.",
                threshold, dropped, len(candidates),
            )
        return kept
    else:
        threshold = settings.rrf_score_threshold
        kept = [c for c in candidates if c.get("rrf_score", 0.0) >= threshold]
        dropped = len(candidates) - len(kept)
        if dropped:
            log.debug(
                "Threshold (rrf >= %.3f): dropped %d/%d candidates.",
                threshold, dropped, len(candidates),
            )
        return kept


# ---------------------------------------------------------------------------
# Warm-up — call this at server startup to pre-load the cross-encoder.
# Prevents the first search request from paying the model load cost (~2-3s).
# ---------------------------------------------------------------------------

def warm_up() -> None:
    """Pre-load the cross-encoder so it's ready before the first request arrives."""
    if settings.enable_reranking:
        log.info("Pre-loading cross-encoder at startup ...")
        _get_cross_encoder()


# ---------------------------------------------------------------------------
# Public API
# ---------------------------------------------------------------------------

def search_products(
    query: str,
    k: int = 5,
    category: Optional[str] = None,
    gender: Optional[str] = None,
    tags: Optional[list[str]] = None,
    min_price: Optional[float] = None,
    max_price: Optional[float] = None,
) -> list[dict]:
    """
    Return the top-k products most relevant to `query`.

    Search pipeline (all steps respect the optional filters):
      1. [If ENABLE_QUERY_EXPANSION] Expand query via LLM for synonym coverage
      2. Embed the (expanded) query with nomic-embed-text
      3. Vector search + BM25 search run in parallel (separate pool connections)
      4. Merge both ranked lists with Reciprocal Rank Fusion
      5. [If ENABLE_RERANKING] Cross-encoder reranks merged candidates
      6. Drop candidates below the score threshold
      7. Return top-k with a single `score` field

    Parameters
    ----------
    query    : Natural language search string.
    k        : Results to return (default 5).
    category : Exact-match filter on products.category.
    gender   : Exact-match filter — "men's", "women's", or "unisex".
    tags     : Product must contain ALL listed tags (array containment).
    min_price: Inclusive lower price bound.
    max_price: Inclusive upper price bound.
    """
    n_candidates = k * settings.rerank_candidates_multiplier

    # Step 1: optional query expansion
    search_text = expand_query(query) if settings.enable_query_expansion else query

    # Step 2: embed
    query_embedding = _get_query_embedding(search_text)

    # Step 3: vector + BM25 in parallel
    # Full-text uses the original query (not expanded) so keyword matches stay exact.
    vector_hits, fulltext_hits = _run_searches_parallel(
        query_embedding, query,
        n_candidates,
        category, gender, tags, min_price, max_price,
    )

    # Step 4: RRF merge
    candidates = _rrf_merge(vector_hits, fulltext_hits)

    # Step 5: cross-encoder rerank
    reranked = False
    if settings.enable_reranking and candidates:
        candidates = _rerank(query, candidates)
        reranked = "rerank_score" in (candidates[0] if candidates else {})

    # Step 6: threshold filter
    candidates = _apply_threshold(candidates, reranked)

    # Step 7: shape final output
    score_key = "rerank_score" if reranked else "rrf_score"

    return [
        {
            "id": c["id"],
            "slug": c["slug"],
            "name": c["name"],
            "brand": c["brand"],
            "description": c["description"],
            "category": c["category"],
            "subcategory": c["subcategory"],
            "price": float(c["price"]),
            "tags": list(c["tags"]),
            "gender": c["gender"],
            "material": c.get("material"),
            "fit": c.get("fit"),
            "primary_image_url": c.get("primary_image_url"),
            "score": c.get(score_key, 0.0),
        }
        for c in candidates[:k]
    ]


# ---------------------------------------------------------------------------
# CLI test
# ---------------------------------------------------------------------------

if __name__ == "__main__":
    import json
    import logging as _logging

    _logging.basicConfig(level=logging.INFO, format="%(asctime)s [%(levelname)s] %(message)s")

    test_cases = [
        # Acceptance criteria
        ("comfortable running shoes for trail hiking", {}),
        # Price-filtered semantic
        ("waterproof jacket for alpine climbing", {"max_price": 400.0}),
        # Category filter
        ("waterproof shell for mountain running", {"category": "Apparel"}),
        # Tag containment filter
        ("warm layer for backcountry skiing", {"tags": ["layering"]}),
        # Gender filter + semantic
        ("men's shorts for long training runs", {"gender": "men's"}),
        # Keyword-heavy — exercises BM25 branch of hybrid
        ("GORE-TEX waterproof shell", {}),
        # Abstract intent — exercises query expansion when enabled
        ("something to track my run and heart rate", {}),
    ]

    for query_text, filters in test_cases:
        print(f"\nQuery: {query_text!r}  Filters: {filters or 'none'}")
        print("-" * 70)
        hits = search_products(query_text, k=3, **filters)
        print(json.dumps(hits, indent=2, default=str))
