from dataclasses import dataclass
from dotenv import load_dotenv
import os

load_dotenv()


@dataclass(frozen=True)
class Settings:
    # Database
    db_host: str
    db_port: int
    db_name: str
    db_user: str
    db_password: str
    db_pool_min: int
    db_pool_max: int
    # Ollama embedding model
    ollama_base_url: str
    ollama_model: str
    ollama_timeout: float
    ollama_max_retries: int
    # Search quality
    ef_search: int                      # HNSW beam width at query time (higher = better recall)
    enable_query_expansion: bool        # LLM query expansion (improves recall, adds ~3s latency)
    query_expansion_model: str          # Ollama model used for query expansion
    enable_reranking: bool              # Cross-encoder reranking (improves precision, adds ~0.5s)
    reranker_model: str                 # sentence-transformers cross-encoder model
    rerank_candidates_multiplier: int   # retrieve k * multiplier candidates before reranking
    enable_tag_expansion: bool          # LLM tag enrichment at index time (improves recall, offline)
    # Search quality thresholds — results below these are dropped from the response
    rerank_score_threshold: float       # cross-encoder logit cutoff (default -2.0; anything lower is not relevant)
    rrf_score_threshold: float          # RRF score cutoff when reranking is off (default 0.010)


settings = Settings(
    db_host=os.getenv("POSTGRES_HOST", "localhost"),
    db_port=int(os.getenv("POSTGRES_PORT", "5432")),
    db_name=os.getenv("POSTGRES_DB", "fitfinder"),
    db_user=os.getenv("POSTGRES_USER", "fitfinder"),
    db_password=os.getenv("POSTGRES_PASSWORD", ""),
    db_pool_min=int(os.getenv("DB_POOL_MIN", "1")),
    db_pool_max=int(os.getenv("DB_POOL_MAX", "5")),
    ollama_base_url=os.getenv("OLLAMA_BASE_URL", "http://localhost:11434"),
    ollama_model=os.getenv("OLLAMA_MODEL", "nomic-embed-text"),
    ollama_timeout=float(os.getenv("OLLAMA_TIMEOUT", "30.0")),
    ollama_max_retries=int(os.getenv("OLLAMA_MAX_RETRIES", "3")),
    ef_search=int(os.getenv("HNSW_EF_SEARCH", "200")),
    enable_query_expansion=os.getenv("ENABLE_QUERY_EXPANSION", "false").lower() == "true",
    query_expansion_model=os.getenv("QUERY_EXPANSION_MODEL", "llama3.1"),
    enable_reranking=os.getenv("ENABLE_RERANKING", "true").lower() == "true",
    reranker_model=os.getenv("RERANKER_MODEL", "cross-encoder/ms-marco-MiniLM-L-6-v2"),
    rerank_candidates_multiplier=int(os.getenv("RERANK_CANDIDATES_MULTIPLIER", "4")),
    enable_tag_expansion=os.getenv("ENABLE_TAG_EXPANSION", "false").lower() == "true",
    rerank_score_threshold=float(os.getenv("RERANK_SCORE_THRESHOLD", "-2.0")),
    rrf_score_threshold=float(os.getenv("RRF_SCORE_THRESHOLD", "0.010")),
)
