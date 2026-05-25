import sys
from pathlib import Path
sys.path.insert(0, str(Path(__file__).parent.parent.parent / "embedding_service"))

import logging

from models.search import SearchRequest, SearchResponse
from search import search_products

log = logging.getLogger(__name__)


def execute_search(request: SearchRequest) -> SearchResponse:
    log.info(
        "Search query=%r k=%d category=%s gender=%s tags=%s price=[%s, %s]",
        request.query, request.k, request.category, request.gender,
        request.tags, request.min_price, request.max_price,
    )
    results = search_products(
        query=request.query,
        k=request.k,
        category=request.category,
        gender=request.gender,
        tags=request.tags,
        min_price=request.min_price,
        max_price=request.max_price,
    )
    log.info("Search returned %d results", len(results))
    return SearchResponse(query=request.query, count=len(results), results=results)
