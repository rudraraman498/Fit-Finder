import logging
import threading

import httpx

log = logging.getLogger(__name__)


class AuthManager:
    def __init__(self, base_url: str, email: str, password: str) -> None:
        self._base_url = base_url.rstrip("/")
        self._email = email
        self._password = password
        self._token: str | None = None
        self._lock = threading.Lock()

    def login(self) -> None:
        with self._lock:
            resp = httpx.post(
                f"{self._base_url}/admin/auth/login",
                json={"username": self._email, "password": self._password},
                timeout=10.0,
            )
            resp.raise_for_status()
            self._token = resp.json()["token"]
            log.info("admin auth: login successful")

    @property
    def bearer_headers(self) -> dict[str, str]:
        return {"Authorization": f"Bearer {self._token}"}
