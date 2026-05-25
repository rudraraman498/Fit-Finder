from fastapi import APIRouter

from models.search import SearchRequest, SearchResponse
from services.search_service import execute_search

router = APIRouter(tags=["Search"])


@router.post("/search", response_model=SearchResponse)
def search(body: SearchRequest):
    return execute_search(body)
