from dataclasses import dataclass, field
from pathlib import Path
import shutil
import threading
import time
from typing import Any
from uuid import uuid4

from .config import settings


@dataclass
class ParsedVideo:
    id: str
    user_id: str
    url: str
    platform: str
    title: str
    thumbnail: str | None
    duration: float | None
    formats: dict[str, dict[str, Any]]
    created_at: float = field(default_factory=time.time)


@dataclass
class DownloadJob:
    id: str
    user_id: str
    parse_id: str
    action_id: str
    status: str = "queued"
    progress: int = 0
    error: str | None = None
    file_path: Path | None = None
    filename: str | None = None
    content_type: str = "video/mp4"
    created_at: float = field(default_factory=time.time)


class JobStore:
    def __init__(self) -> None:
        self.parsed: dict[str, ParsedVideo] = {}
        self.jobs: dict[str, DownloadJob] = {}
        self.lock = threading.RLock()

    def add_parsed(self, **kwargs: Any) -> ParsedVideo:
        item = ParsedVideo(id=str(uuid4()), **kwargs)
        with self.lock:
            self.parsed[item.id] = item
        return item

    def add_job(self, **kwargs: Any) -> DownloadJob:
        item = DownloadJob(id=str(uuid4()), **kwargs)
        with self.lock:
            self.jobs[item.id] = item
        return item

    def cleanup(self) -> None:
        cutoff = time.time() - settings.job_ttl_seconds
        with self.lock:
            for key, item in list(self.parsed.items()):
                if item.created_at < cutoff:
                    self.parsed.pop(key, None)
            for key, job in list(self.jobs.items()):
                if job.created_at < cutoff:
                    if job.file_path:
                        shutil.rmtree(job.file_path.parent, ignore_errors=True)
                    self.jobs.pop(key, None)


store = JobStore()
