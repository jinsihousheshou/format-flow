from .base import ProtectedPlatformAdapter


class NeteaseAdapter(ProtectedPlatformAdapter):
    def __init__(self) -> None:
        super().__init__(platform="netease", display_name="网易云音乐")
