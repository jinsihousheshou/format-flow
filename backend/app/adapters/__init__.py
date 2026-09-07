from .kugou import KugouAdapter
from .netease import NeteaseAdapter
from .qqmusic import QQMusicAdapter


ADAPTERS = {
    "netease": NeteaseAdapter(),
    "qqmusic": QQMusicAdapter(),
    "kugou": KugouAdapter(),
}


def get_audio_adapter(platform: str):
    return ADAPTERS.get(platform)
