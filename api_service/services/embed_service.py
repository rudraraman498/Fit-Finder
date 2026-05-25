import sys
from pathlib import Path
sys.path.insert(0, str(Path(__file__).parent.parent.parent / "embedding_service"))

import httpx

from config import settings
from embedding_client import get_embedding
from models.embed import EmbedRequest, EmbedResponse


def generate_embedding(body: EmbedRequest) -> EmbedResponse:
    with httpx.Client() as client:
        vector = get_embedding(body.text, client)
    return EmbedResponse(
        embedding=vector,
        model=settings.ollama_model,
        dimensions=len(vector),
    )
