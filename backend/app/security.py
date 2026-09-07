import asyncio
import ipaddress
import re
import socket
from urllib.parse import urljoin, urlparse

from curl_cffi import requests
from curl_cffi.requests.errors import RequestsError
from fastapi import HTTPException

from .config import settings


URL_PATTERN = re.compile(r"https?://[^\s<>\"'，。；！？、]+", re.IGNORECASE)
TRAILING_PUNCTUATION = ")]}>】）〉》」』"

PLATFORM_SUFFIXES = {
    "douyin": ("douyin.com", "iesdouyin.com"),
    "bilibili": ("bilibili.com", "b23.tv"),
    "kuaishou": ("kuaishou.com", "gifshow.com"),
}

AUDIO_PLATFORM_SUFFIXES = {
    "netease": ("music.163.com", "163cn.tv"),
    "qqmusic": ("y.qq.com", "c.y.qq.com", "i.y.qq.com"),
    "kugou": ("kugou.com", "kugou.net"),
}


def extract_url(text: str) -> str:
    match = URL_PATTERN.search(text)
    if not match:
        raise HTTPException(400, "没有找到 HTTP 或 HTTPS 链接，请重新复制分享内容。")
    return match.group(0).rstrip(TRAILING_PUNCTUATION)


def _matches(host: str, suffix: str) -> bool:
    return host == suffix or host.endswith(f".{suffix}")


def classify_url(raw_url: str) -> tuple[str, str]:
    parsed = urlparse(raw_url)
    host = (parsed.hostname or "").lower().rstrip(".")
    if parsed.scheme not in {"http", "https"} or not host or parsed.username or parsed.password:
        raise HTTPException(400, "只接受不包含账号信息的 HTTP 或 HTTPS 链接。")
    for platform, suffixes in PLATFORM_SUFFIXES.items():
        if any(_matches(host, suffix) for suffix in suffixes):
            return platform, host
    if any(_matches(host, suffix) for suffix in settings.direct_video_hosts):
        return "direct", host
    raise HTTPException(400, "该域名不在允许列表中。普通直链需由管理员加入 DIRECT_VIDEO_HOSTS。")


def _resolve_public(host: str) -> None:
    try:
        addresses = {item[4][0] for item in socket.getaddrinfo(host, 443, type=socket.SOCK_STREAM)}
    except socket.gaierror as exc:
        raise HTTPException(400, "媒体域名无法解析。") from exc
    if not addresses:
        raise HTTPException(400, "媒体域名没有可用地址。")
    for address in addresses:
        ip = ipaddress.ip_address(address)
        if not ip.is_global:
            raise HTTPException(400, "拒绝访问本机、内网或保留地址。")


def _resolve_safe_audio_redirects(url: str) -> str:
    current = url
    for _ in range(4):
        platform, host = classify_audio_url(current)
        if platform != "audio_direct":
            raise HTTPException(400, "普通媒体直链重定向到了未获允许的平台。")
        _resolve_public(host)
        try:
            response = requests.head(current, allow_redirects=False, timeout=12, impersonate="chrome")
        except RequestsError as exc:
            raise HTTPException(422, "无法连接该媒体直链，请检查链接是否仍然有效。") from exc
        if response.status_code not in {301, 302, 303, 307, 308}:
            if response.status_code >= 400 and response.status_code != 405:
                raise HTTPException(422, f"媒体源返回 HTTP {response.status_code}，暂时无法处理。")
            return current
        location = response.headers.get("location")
        if not location:
            raise HTTPException(422, "媒体源返回了无效重定向。")
        current = urljoin(current, location)
    raise HTTPException(422, "媒体链接重定向次数超过 3 次。")


async def validate_source(text: str) -> tuple[str, str, str]:
    url = extract_url(text)
    platform, host = classify_url(url)
    await asyncio.to_thread(_resolve_public, host)
    return url, platform, host


def classify_audio_url(raw_url: str) -> tuple[str, str]:
    parsed = urlparse(raw_url)
    host = (parsed.hostname or "").lower().rstrip(".")
    if parsed.scheme not in {"http", "https"} or not host or parsed.username or parsed.password:
        raise HTTPException(400, "只接受不包含账号信息的 HTTP 或 HTTPS 链接。")
    for platform, suffixes in AUDIO_PLATFORM_SUFFIXES.items():
        if any(_matches(host, suffix) for suffix in suffixes):
            return platform, host
    if any(_matches(host, suffix) for suffix in settings.direct_media_hosts):
        return "audio_direct", host
    raise HTTPException(400, "该域名不在允许列表中。音频直链需由管理员加入 DIRECT_MEDIA_HOSTS。")


async def validate_audio_source(text: str) -> tuple[str, str, str]:
    url = extract_url(text)
    platform, host = classify_audio_url(url)
    await asyncio.to_thread(_resolve_public, host)
    if platform == "audio_direct":
        url = await asyncio.to_thread(_resolve_safe_audio_redirects, url)
        platform, host = classify_audio_url(url)
    return url, platform, host
