"""Account deletion via Supabase Auth Admin API (service role)."""

from __future__ import annotations

import os
from typing import Any

import urllib.error
import urllib.request
import json

from fastapi import APIRouter, Header, HTTPException

router = APIRouter()


def _env(name: str) -> str:
    value = os.environ.get(name, "").strip()
    if not value:
        raise HTTPException(
            status_code=500,
            detail=f"Server missing {name}. Add it to backend/.env and restart.",
        )
    return value


def _supabase_base_url() -> str:
    # Accept either project root URL or accidental /rest/v1 suffix
    raw = _env("SUPABASE_URL").rstrip("/")
    if raw.endswith("/rest/v1"):
        raw = raw[: -len("/rest/v1")]
    return raw


def _http_json(
    method: str,
    url: str,
    *,
    headers: dict[str, str],
    body: dict[str, Any] | None = None,
) -> tuple[int, Any]:
    data = None if body is None else json.dumps(body).encode("utf-8")
    req = urllib.request.Request(url, data=data, method=method)
    for key, value in headers.items():
        req.add_header(key, value)
    if body is not None:
        req.add_header("Content-Type", "application/json")
    try:
        with urllib.request.urlopen(req, timeout=30) as resp:
            raw = resp.read().decode("utf-8")
            parsed = json.loads(raw) if raw else None
            return resp.status, parsed
    except urllib.error.HTTPError as err:
        raw = err.read().decode("utf-8", errors="replace")
        try:
            parsed = json.loads(raw) if raw else None
        except json.JSONDecodeError:
            parsed = {"message": raw}
        return err.code, parsed


def _bearer_token(authorization: str | None) -> str:
    if not authorization:
        raise HTTPException(status_code=401, detail="Missing Authorization header.")
    parts = authorization.strip().split(" ", 1)
    if len(parts) != 2 or parts[0].lower() != "bearer" or not parts[1].strip():
        raise HTTPException(status_code=401, detail="Expected Bearer access token.")
    return parts[1].strip()


@router.delete("/account")
def delete_account(authorization: str | None = Header(default=None)):
    """
    Permanently delete the signed-in user's account and practice history.
    Requires the user's Supabase access token. Uses service role only on the server.
    """
    access_token = _bearer_token(authorization)
    base = _supabase_base_url()
    anon_key = _env("SUPABASE_ANON_KEY")
    service_key = _env("SUPABASE_SERVICE_ROLE_KEY")

    # 1) Validate the user token and resolve user id
    status, user_payload = _http_json(
        "GET",
        f"{base}/auth/v1/user",
        headers={
            "apikey": anon_key,
            "Authorization": f"Bearer {access_token}",
        },
    )
    if status != 200 or not isinstance(user_payload, dict) or not user_payload.get("id"):
        raise HTTPException(status_code=401, detail="Invalid or expired session. Log in again.")

    user_id = str(user_payload["id"])

    # 2) Delete practice history (service role bypasses RLS intentionally for full wipe)
    del_sessions_status, del_sessions_body = _http_json(
        "DELETE",
        f"{base}/rest/v1/practice_sessions?user_id=eq.{user_id}",
        headers={
            "apikey": service_key,
            "Authorization": f"Bearer {service_key}",
            "Prefer": "return=minimal",
        },
    )
    if del_sessions_status not in (200, 204):
        raise HTTPException(
            status_code=500,
            detail="Could not delete practice history. Account was not removed.",
        )

    # 3) Delete the Auth user (email/password or Google-linked app account)
    del_user_status, del_user_body = _http_json(
        "DELETE",
        f"{base}/auth/v1/admin/users/{user_id}",
        headers={
            "apikey": service_key,
            "Authorization": f"Bearer {service_key}",
        },
    )
    if del_user_status not in (200, 204):
        message = "Could not delete auth user."
        if isinstance(del_user_body, dict):
            message = str(
                del_user_body.get("msg")
                or del_user_body.get("message")
                or del_user_body.get("error_description")
                or message
            )
        raise HTTPException(status_code=500, detail=message)

    return {
        "ok": True,
        "deleted_user_id": user_id,
        "note": "Practice history and account removed. Raw interview videos were never stored.",
    }
