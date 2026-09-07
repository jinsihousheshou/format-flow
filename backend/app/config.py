from dataclasses import dataclass
import os
from pathlib import Path


def _csv(name: str, default: str) -> tuple[str, ...]:
    return tuple(item.strip().lower() for item in os.getenv(name, default).split(",") if item.strip())


@dataclass(frozen=True)
class Settings:
    supabase_url: str = os.getenv("SUPABASE_URL", "").rstrip("/")
    supabase_anon_key: str = os.getenv("SUPABASE_ANON_KEY", "")
    cors_origins: tuple[str, ...] = _csv(
        "CORS_ORIGINS",
        "https://jinsihousheshou.github.io,http://localhost:3000,http://127.0.0.1:3000",
    )
    direct_video_hosts: tuple[str, ...] = _csv("DIRECT_VIDEO_HOSTS", "jinsihousheshou.github.io,developer.mozilla.org,media.w3.org")
    direct_media_hosts: tuple[str, ...] = _csv(
        "DIRECT_MEDIA_HOSTS",
        os.getenv("DIRECT_VIDEO_HOSTS", "jinsihousheshou.github.io,developer.mozilla.org,media.w3.org"),
    )
    temp_dir: Path = Path(os.getenv("TEMP_DIR", "/tmp/format-flow"))
    max_concurrent_parses: int = int(os.getenv("MAX_CONCURRENT_PARSES", "2"))
    max_concurrent_downloads: int = int(os.getenv("MAX_CONCURRENT_DOWNLOADS", "2"))
    parse_timeout_seconds: int = int(os.getenv("PARSE_TIMEOUT_SECONDS", "45"))
    download_timeout_seconds: int = int(os.getenv("DOWNLOAD_TIMEOUT_SECONDS", "600"))
    job_ttl_seconds: int = int(os.getenv("JOB_TTL_SECONDS", "1800"))

    def validate(self) -> None:
        if not self.supabase_url.startswith("https://") or not self.supabase_anon_key:
            raise RuntimeError("SUPABASE_URL and SUPABASE_ANON_KEY must be configured")
        if self.max_concurrent_parses < 1 or self.max_concurrent_downloads < 1:
            raise RuntimeError("Concurrency limits must be positive")


settings = Settings()
