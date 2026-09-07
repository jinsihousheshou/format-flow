import asyncio
import ipaddress
import re
import socket
from urllib.parse import urlparse

from fastapi import HTTPException

from .config import settings


URL_PATTERN = re.compile(r"https://[^\s<>\"'，。；！？、]+", re.IGNORECASE)
TRAILING_PUNCTUATION = ")]}>】）〉》」』"

PLATFORM_SUFFIXES = {
    "douyin": ("douyin.com", "iesdouyin.com"),
    "bilibili": ("bilibili.com", "b23.tv"),
    "kuaishou": ("kuaishou.com", "gifshow.com"),
}


def extract_url(text: str) -> str:
    match = URL_PATTERN.search(text)
    if not match:
        raise HTTPException(400, "没有找到 HTTPS 链接，请重新复制视频分享内容。")
    return match.group(0).rstrip(TRAILING_PUNCTUATION)


def _matches(host: str, suffix: str) -> bool:
    return host == suffix or host.endswith(f".{suffix}")


def classify_url(raw_url: str) -> tuple[str, str]:
    parsed = urlparse(raw_url)
    host = (parsed.hostname or "").lower().rstrip(".")
    if parsed.scheme != "https" or not host or parsed.username or parsed.password:
        raise HTTPException(400, "只接受不包含账号信息的 HTTPS 链接。")
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
        raise HTTPException(400, "视频域名无法解析。") from exc
    if not addresses:
        raise HTTPException(400, "视频域名没有可用地址。")
    for address in addresses:
        ip = ipaddress.ip_address(address)
        if not ip.is_global:
            raise HTTPException(400, "拒绝访问本机、内网或保留地址。")


async def validate_source(text: str) -> tuple[str, str, str]:
    url = extract_url(text)
    platform, host = classify_url(url)
    await asyncio.to_thread(_resolve_public, host)
    return url, platform, host
