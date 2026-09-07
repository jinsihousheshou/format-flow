from dataclasses import dataclass
import asyncio
import time
from typing import Any

from curl_cffi import requests
from curl_cffi.requests.errors import RequestsError
from fastapi import Header, HTTPException

from .config import settings


@dataclass(frozen=True)
class User:
    id: str
    token: str


def _headers(token: str) -> dict[str, str]:
    return {
        "apikey": settings.supabase_anon_key,
        "Authorization": f"Bearer {token}",
        "Content-Type": "application/json",
    }


def _request(method: str, url: str, *, headers: dict[str, str], json: dict[str, Any] | None = None):
    last_error: Exception | None = None
    for attempt in range(3):
        try:
            return requests.request(method, url, headers=headers, json=json, timeout=30, impersonate="chrome")
        except RequestsError as error:
            last_error = error
            time.sleep(attempt + 1)
    raise last_error or RuntimeError("request failed")


async def current_user(authorization: str | None = Header(default=None)) -> User:
    if not authorization or not authorization.startswith("Bearer "):
        raise HTTPException(401, "请先登录。")
    token = authorization[7:].strip()
    if not token:
        raise HTTPException(401, "登录信息无效。")
    try:
        response = await asyncio.to_thread(
            _request, "GET", f"{settings.supabase_url}/auth/v1/user", headers=_headers(token)
        )
    except RequestsError as exc:
        raise HTTPException(503, "暂时无法验证登录状态。") from exc
    if response.status_code != 200:
        raise HTTPException(401, "登录已过期，请重新登录。")
    user_id = response.json().get("id")
    if not user_id:
        raise HTTPException(401, "登录信息无效。")
    return User(str(user_id), token)


async def _rpc(user: User, function: str, payload: dict[str, Any]) -> Any:
    try:
        response = await asyncio.to_thread(
            _request, "POST", f"{settings.supabase_url}/rest/v1/rpc/{function}",
            headers=_headers(user.token), json=payload,
        )
    except RequestsError as exc:
        raise HTTPException(503, "权限服务暂时不可用。") from exc
    data = response.json() if response.content else None
    if response.status_code >= 400:
        message = data.get("message") if isinstance(data, dict) else None
        status = 429 if message and ("频繁" in message or "次数" in message or "进行中" in message) else 403
        raise HTTPException(status, message or "没有媒体处理权限。")
    return data


async def reserve_action(user: User, action: str, platform: str, host: str) -> dict[str, Any]:
    return await _rpc(user, "reserve_video_link_action", {
        "p_action": action, "p_platform": platform, "p_source_host": host,
    })


async def finish_action(
    user: User,
    action_id: str,
    status: str,
    *,
    title: str | None = None,
    content_type: str | None = None,
    content_length: int | None = None,
    error_code: str | None = None,
) -> None:
    await _rpc(user, "finish_video_link_action", {
        "p_action_id": action_id,
        "p_status": status,
        "p_title": title,
        "p_content_type": content_type,
        "p_content_length": content_length,
        "p_error_code": error_code,
    })
