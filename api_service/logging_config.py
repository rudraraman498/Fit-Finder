import logging
import sys
from contextvars import ContextVar

# Per-request ID stored in a ContextVar so it is coroutine-safe and
# automatically scoped to the current async task / thread.
_request_id_var: ContextVar[str] = ContextVar("request_id", default="-")


class _RequestIDFilter(logging.Filter):
    """Injects the current request_id into every LogRecord."""
    def filter(self, record: logging.LogRecord) -> bool:
        record.request_id = _request_id_var.get()
        return True


def setup_logging(level: int = logging.INFO) -> None:
    fmt = "%(asctime)s [%(levelname)s] [%(request_id)s] %(name)s — %(message)s"
    handler = logging.StreamHandler(sys.stdout)
    handler.addFilter(_RequestIDFilter())
    handler.setFormatter(logging.Formatter(fmt))
    root = logging.getLogger()
    root.setLevel(level)
    root.handlers.clear()
    root.addHandler(handler)
