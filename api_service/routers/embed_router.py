from fastapi import APIRouter

from models.embed import EmbedRequest, EmbedResponse
from services.embed_service import generate_embedding

router = APIRouter(tags=["Embeddings"])


@router.post("/embed", response_model=EmbedResponse)
def embed(body: EmbedRequest) -> EmbedResponse:
    return generate_embedding(body)
