from .base import ProtectedPlatformAdapter


class QQMusicAdapter(ProtectedPlatformAdapter):
    def __init__(self) -> None:
        super().__init__(platform="qqmusic", display_name="QQ音乐")
