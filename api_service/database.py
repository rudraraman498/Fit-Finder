import sys
from pathlib import Path
sys.path.insert(0, str(Path(__file__).parent.parent / "embedding_service"))

import logging

from pgvector.psycopg import register_vector
from psycopg.rows import dict_row
from psycopg_pool import ConnectionPool

from config import settings

log = logging.getLogger(__name__)
_pool: ConnectionPool | None = None


def _configure_conn(conn) -> None:
    """Called by the pool on each new connection — registers pgvector type codec."""
    register_vector(conn)


def init_pool() -> None:
    global _pool
    dsn = (
        f"host={settings.db_host} port={settings.db_port} "
        f"dbname={settings.db_name} user={settings.db_user} "
        f"password={settings.db_password}"
    )
    _pool = ConnectionPool(
        conninfo=dsn,
        min_size=settings.db_pool_min,
        max_size=settings.db_pool_max,
        kwargs={"row_factory": dict_row},
        configure=_configure_conn,
        open=True,
    )
    log.info("DB pool ready (min=%d max=%d)", settings.db_pool_min, settings.db_pool_max)


def close_pool() -> None:
    global _pool
    if _pool is not None:
        _pool.close()
        _pool = None
        log.info("DB pool closed.")


def get_pool() -> ConnectionPool:
    if _pool is None:
        raise RuntimeError("DB pool not initialized — call init_pool() first.")
    return _pool
