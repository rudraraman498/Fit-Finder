import time

import httpx

from config import settings

import logging

log = logging.getLogger(__name__)


def get_embedding(text: str, client: httpx.Client) -> list[float]:
    """
    Call Ollama /api/embed with exponential backoff retry.
    Returns a flat list of embedding floats.
    """
    url = f"{settings.ollama_base_url}/api/embed"
    payload = {"model": settings.ollama_model, "input": text}

    for attempt in range(1, settings.ollama_max_retries + 1):
        try:
            response = client.post(url, json=payload, timeout=settings.ollama_timeout)
            response.raise_for_status()
            data = response.json()
            embeddings = data.get("embeddings")
            if not embeddings or not embeddings[0]:
                raise ValueError(f"Empty embedding returned for: {text[:60]!r}")
            return embeddings[0]
        except (httpx.ConnectError, httpx.TimeoutException) as exc:
            wait = 2 ** attempt
            if attempt == settings.ollama_max_retries:
                raise RuntimeError(
                    f"Ollama unreachable after {settings.ollama_max_retries} attempts"
                ) from exc
            log.warning(
                "Ollama connection error (attempt %d/%d): %s. Retrying in %ds...",
                attempt, settings.ollama_max_retries, exc, wait,
            )
            time.sleep(wait)
        except httpx.HTTPStatusError as exc:
            raise RuntimeError(
                f"Ollama HTTP {exc.response.status_code}: {exc.response.text}"
            ) from exc
