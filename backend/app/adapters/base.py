from dataclasses import dataclass
from typing import Any


@dataclass(frozen=True)
class ProtectedPlatformAdapter:
    platform: str
    display_name: str

    def parse_public_page(self, url: str) -> dict[str, Any]:
        return {
            "title": f"{self.display_name}公开分享页面",
            "author": None,
            "thumbnail": None,
            "duration": None,
            "formats": {},
            "qualities": [],
            "download_available": False,
            "official_url": url,
            "notice": "该内容受平台或版权限制，无法提供下载。请前往官方平台播放。",
        }
