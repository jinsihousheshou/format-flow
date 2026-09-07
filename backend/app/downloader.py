from pathlib import Path
import os
import re
from typing import Any, Callable

import yt_dlp
from yt_dlp.networking.impersonate import ImpersonateTarget


def friendly_error(error: Exception, platform: str) -> str:
    text = str(error)
    if "Private video" in text or "login" in text.lower() or "cookie" in text.lower():
        return "该视频需要登录、Cookie 或不是公开内容，本站不支持处理。"
    if "DRM" in text.upper():
        return "该视频受 DRM 保护，本站不支持处理。"
    if platform == "kuaishou":
        return "快手当前无法稳定解析这个公开链接，请稍后更新 yt-dlp 后重试。"
    if "Unsupported URL" in text:
        return "当前版本的 yt-dlp 不支持这个视频链接。"
    return f"视频源解析失败：{text[-300:]}"


def _base_options() -> dict[str, Any]:
    options = {
        "quiet": True,
        "no_warnings": True,
        "noplaylist": True,
        "socket_timeout": 30,
        "retries": 2,
        "fragment_retries": 2,
        "skip_unavailable_fragments": False,
        "impersonate": ImpersonateTarget(client="chrome"),
    }
    if os.getenv("FFMPEG_LOCATION"):
        options["ffmpeg_location"] = os.environ["FFMPEG_LOCATION"]
    return options


def parse_video(url: str, platform: str) -> dict[str, Any]:
    options = {**_base_options(), "skip_download": True}
    try:
        with yt_dlp.YoutubeDL(options) as ydl:
            info = ydl.extract_info(url, download=False)
    except Exception as exc:
        raise RuntimeError(friendly_error(exc, platform)) from exc
    if not isinstance(info, dict) or info.get("_type") in {"playlist", "multi_video"}:
        raise RuntimeError("只支持单个公开视频，不支持播放列表或合集。")

    selected: dict[int, dict[str, Any]] = {}
    for item in info.get("formats") or []:
        protocol = str(item.get("protocol") or "")
        if not protocol.startswith(("http", "m3u8")):
            continue
        if platform != "direct" and item.get("vcodec") in {None, "none"}:
            continue
        height = int(item.get("height") or 0)
        if not height and platform != "direct":
            continue
        score = (1 if platform == "direct" or item.get("acodec") not in {None, "none"} else 0, float(item.get("tbr") or 0))
        previous = selected.get(height)
        previous_score = previous and (1 if previous.get("acodec") not in {None, "none"} else 0, float(previous.get("tbr") or 0))
        if previous is None or score > previous_score:
            selected[height] = item
    if not selected:
        raise RuntimeError("解析成功，但没有找到可下载的视频格式。")

    formats: dict[str, dict[str, Any]] = {}
    qualities = []
    for height, item in sorted(selected.items(), reverse=True)[:8]:
        format_id = str(item["format_id"])
        formats[format_id] = {
            "format_id": format_id,
            "has_audio": platform == "direct" or item.get("acodec") not in {None, "none"},
            "height": height,
            "ext": str(item.get("ext") or "mp4"),
        }
        qualities.append({
            "id": format_id,
            "label": f"{height}P" if height else "原始清晰度",
            "width": item.get("width"),
            "height": height,
            "ext": item.get("ext") or "mp4",
            "size": item.get("filesize") or item.get("filesize_approx"),
        })
    return {
        "title": str(info.get("title") or "公开视频")[:200],
        "thumbnail": info.get("thumbnail"),
        "duration": info.get("duration"),
        "formats": formats,
        "qualities": qualities,
        "extractor": info.get("extractor_key") or info.get("extractor"),
    }


def _safe_filename(title: str, suffix: str = ".mp4") -> str:
    stem = re.sub(r'[\\/:*?"<>|\r\n]+', "_", title).strip(" ._")[:100] or "video"
    clean_suffix = suffix if re.fullmatch(r"\.[a-zA-Z0-9]{2,5}", suffix) else ".mp4"
    return f"{stem}{clean_suffix.lower()}"


def download_video(
    *,
    url: str,
    platform: str,
    title: str,
    selected_format: dict[str, Any],
    output_dir: Path,
    max_bytes: int,
    on_progress: Callable[[int], None],
) -> tuple[Path, str]:
    output_dir.mkdir(parents=True, exist_ok=False)
    format_id = selected_format["format_id"]
    format_selector = format_id if selected_format["has_audio"] else f"{format_id}+bestaudio/best"

    def progress_hook(data: dict[str, Any]) -> None:
        if data.get("status") == "downloading":
            total = data.get("total_bytes") or data.get("total_bytes_estimate") or 0
            downloaded = data.get("downloaded_bytes") or 0
            if total:
                on_progress(min(94, max(1, int(downloaded * 94 / total))))
        elif data.get("status") == "finished":
            on_progress(96)

    options = {
        **_base_options(),
        "format": format_selector,
        "outtmpl": str(output_dir / "source.%(ext)s"),
        "merge_output_format": "mp4",
        "restrictfilenames": True,
        "progress_hooks": [progress_hook],
        "max_filesize": max_bytes,
        "overwrites": True,
    }
    try:
        with yt_dlp.YoutubeDL(options) as ydl:
            ydl.download([url])
    except Exception as exc:
        raise RuntimeError(friendly_error(exc, platform)) from exc
    files = [path for path in output_dir.iterdir() if path.is_file() and path.suffix not in {".part", ".ytdl"}]
    if not files:
        raise RuntimeError("下载任务完成，但没有生成视频文件。")
    path = max(files, key=lambda item: item.stat().st_size)
    size = path.stat().st_size
    if size <= 0 or size > max_bytes:
        raise RuntimeError("下载后的视频为空或超过当前套餐大小限制。")
    on_progress(100)
    return path, _safe_filename(title, path.suffix)
