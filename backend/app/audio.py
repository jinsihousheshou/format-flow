from pathlib import Path
import re
from typing import Any, Callable

import yt_dlp

from .adapters import get_audio_adapter
from .downloader import _base_options


AUDIO_FORMATS: dict[str, tuple[str, str]] = {
    "mp3": ("mp3", "audio/mpeg"),
    "m4a": ("m4a", "audio/mp4"),
    "wav": ("wav", "audio/wav"),
    "aac": ("aac", "audio/aac"),
    "flac": ("flac", "audio/flac"),
    "ogg": ("vorbis", "audio/ogg"),
}

def protected_audio_result(url: str, platform: str) -> dict[str, Any]:
    adapter = get_audio_adapter(platform)
    if not adapter:
        raise RuntimeError("音频平台适配器不存在。")
    return adapter.parse_public_page(url)


def parse_audio(url: str, platform: str) -> dict[str, Any]:
    if get_audio_adapter(platform):
        return protected_audio_result(url, platform)
    try:
        with yt_dlp.YoutubeDL({**_base_options(), "skip_download": True}) as ydl:
            info = ydl.extract_info(url, download=False)
    except Exception as exc:
        raise RuntimeError(f"音频源解析失败：{str(exc)[-300:]}") from exc
    if not isinstance(info, dict) or info.get("_type") in {"playlist", "multi_video"}:
        raise RuntimeError("只支持单个公开媒体链接，不支持播放列表或合集。")
    if not info.get("url") and not info.get("formats"):
        raise RuntimeError("没有找到可处理的公开媒体流。")
    formats = {
        key: {"output_format": key, "preferred_codec": codec, "content_type": content_type}
        for key, (codec, content_type) in AUDIO_FORMATS.items()
    }
    return {
        "title": str(info.get("track") or info.get("title") or "授权音频")[:200],
        "author": str(info.get("artist") or info.get("uploader") or "")[:120] or None,
        "thumbnail": info.get("thumbnail"),
        "duration": info.get("duration"),
        "formats": formats,
        "qualities": [
            {"id": key, "label": key.upper(), "ext": key, "contentType": content_type}
            for key, (_, content_type) in AUDIO_FORMATS.items()
        ],
        "download_available": True,
        "official_url": url,
        "notice": None,
    }


def _safe_audio_name(title: str, extension: str) -> str:
    stem = re.sub(r'[\\/:*?"<>|\r\n]+', "_", title).strip(" ._")[:100] or "audio"
    return f"{stem}.{extension}"


def download_audio(
    *, url: str, title: str, selected_format: dict[str, Any], output_dir: Path,
    max_bytes: int, on_progress: Callable[[int], None],
) -> tuple[Path, str, str]:
    output_dir.mkdir(parents=True, exist_ok=False)
    output_format = selected_format["output_format"]
    preferred_codec = selected_format["preferred_codec"]

    def progress_hook(data: dict[str, Any]) -> None:
        if data.get("status") == "downloading":
            total = data.get("total_bytes") or data.get("total_bytes_estimate") or 0
            downloaded = data.get("downloaded_bytes") or 0
            if total:
                on_progress(min(88, max(1, int(downloaded * 88 / total))))
        elif data.get("status") == "finished":
            on_progress(90)

    options = {
        **_base_options(),
        "format": "bestaudio/best",
        "outtmpl": str(output_dir / "source.%(ext)s"),
        "restrictfilenames": True,
        "progress_hooks": [progress_hook],
        "max_filesize": max_bytes,
        "overwrites": True,
        "postprocessors": [{"key": "FFmpegExtractAudio", "preferredcodec": preferred_codec}],
    }
    try:
        with yt_dlp.YoutubeDL(options) as ydl:
            ydl.download([url])
    except Exception as exc:
        raise RuntimeError(f"音频处理失败：{str(exc)[-300:]}") from exc
    candidates = [path for path in output_dir.iterdir() if path.is_file() and path.suffix not in {".part", ".ytdl"}]
    if not candidates:
        raise RuntimeError("处理完成但没有生成音频文件。")
    path = max(candidates, key=lambda item: item.stat().st_mtime)
    if path.stat().st_size <= 0 or path.stat().st_size > max_bytes:
        raise RuntimeError("生成的音频为空或超过文件大小限制。")
    content_type = AUDIO_FORMATS[output_format][1]
    on_progress(100)
    return path, _safe_audio_name(title, output_format), content_type
