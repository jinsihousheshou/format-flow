from .base import ProtectedPlatformAdapter


class KugouAdapter(ProtectedPlatformAdapter):
    def __init__(self) -> None:
        super().__init__(platform="kugou", display_name="酷狗音乐")
