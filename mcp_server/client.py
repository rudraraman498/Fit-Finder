import logging

import httpx

from auth import AuthManager

log = logging.getLogger(__name__)


class CommerceClient:
    def __init__(self, auth: AuthManager) -> None:
        self._auth = auth
        self._base = auth._base_url

    def _get(self, path: str, params: dict | None = None) -> dict | list:
        resp = httpx.get(
            f"{self._base}{path}",
            headers=self._auth.bearer_headers,
            params=params,
            timeout=10.0,
        )
        if resp.status_code == 401:
            log.warning("401 received — re-authenticating")
            self._auth.login()
            resp = httpx.get(
                f"{self._base}{path}",
                headers=self._auth.bearer_headers,
                params=params,
                timeout=10.0,
            )
        resp.raise_for_status()
        return resp.json()

    def _post(self, path: str, body: dict) -> dict | list:
        resp = httpx.post(
            f"{self._base}{path}",
            headers=self._auth.bearer_headers,
            json=body,
            timeout=10.0,
        )
        if resp.status_code == 401:
            log.warning("401 received — re-authenticating")
            self._auth.login()
            resp = httpx.post(
                f"{self._base}{path}",
                headers=self._auth.bearer_headers,
                json=body,
                timeout=10.0,
            )
        resp.raise_for_status()
        return resp.json()

    def _put(self, path: str, body: dict) -> dict | list:
        resp = httpx.put(
            f"{self._base}{path}",
            headers=self._auth.bearer_headers,
            json=body,
            timeout=10.0,
        )
        if resp.status_code == 401:
            log.warning("401 received — re-authenticating")
            self._auth.login()
            resp = httpx.put(
                f"{self._base}{path}",
                headers=self._auth.bearer_headers,
                json=body,
                timeout=10.0,
            )
        resp.raise_for_status()
        return resp.json()

    def _delete(self, path: str) -> None:
        resp = httpx.delete(
            f"{self._base}{path}",
            headers=self._auth.bearer_headers,
            timeout=10.0,
        )
        if resp.status_code == 401:
            log.warning("401 received — re-authenticating")
            self._auth.login()
            resp = httpx.delete(
                f"{self._base}{path}",
                headers=self._auth.bearer_headers,
                timeout=10.0,
            )
        resp.raise_for_status()
