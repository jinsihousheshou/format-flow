import asyncio
from contextlib import asynccontextmanager
from pathlib import Path
import shutil

from fastapi import Depends, FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse
from pydantic import BaseModel, Field
from starlette.background import BackgroundTask

from .config import settings
from .downloader import download_video, parse_video
from .jobs import DownloadJob, store
from .security import validate_source
from .supabase import User, current_user, finish_action, reserve_action


parse_slots = asyncio.Semaphore(settings.max_concurrent_parses)
download_slots = asyncio.Semaphore(settings.max_concurrent_downloads)


@asynccontextmanager
async def lifespan(_: FastAPI):
    settings.validate()
    shutil.rmtree(settings.temp_dir, ignore_errors=True)
    settings.temp_dir.mkdir(parents=True, exist_ok=True)
    async def cleanup_loop() -> None:
        while True:
            await asyncio.sleep(60)
            store.cleanup()
    cleanup_task = asyncio.create_task(cleanup_loop())
    try:
        yield
    finally:
        cleanup_task.cancel()
        shutil.rmtree(settings.temp_dir, ignore_errors=True)


app = FastAPI(title="Format Flow Video API", version="1.0.0", lifespan=lifespan)
app.add_middleware(
    CORSMiddleware,
    allow_origins=list(settings.cors_origins),
    allow_credentials=False,
    allow_methods=["GET", "POST", "OPTIONS"],
    allow_headers=["Authorization", "Content-Type"],
    expose_headers=["Content-Disposition", "Content-Length"],
    max_age=600,
)


class ParseRequest(BaseModel):
    input: str = Field(min_length=8, max_length=3000)
    rights_confirmed: bool = False


class DownloadRequest(BaseModel):
    parse_id: str = Field(min_length=20, max_length=50)
    format_id: str = Field(min_length=1, max_length=100)
    rights_confirmed: bool = False


def require_rights(value: bool) -> None:
    if value is not True:
        raise HTTPException(400, "请先确认您拥有该视频的下载和使用权限。")


@app.get("/api/health")
async def health() -> dict[str, str]:
    return {"status": "ok", "service": "format-flow-video", "yt_dlp": __import__("yt_dlp").version.__version__}


@app.post("/api/parse")
async def parse_endpoint(payload: ParseRequest, user: User = Depends(current_user)) -> dict:
    require_rights(payload.rights_confirmed)
    url, platform, host = await validate_source(payload.input)
    reservation = await reserve_action(user, "parse", platform, host)
    action_id = reservation["actionId"]
    try:
        async with parse_slots:
            result = await asyncio.wait_for(
                asyncio.to_thread(parse_video, url, platform), timeout=settings.parse_timeout_seconds
            )
        parsed = store.add_parsed(
            user_id=user.id,
            url=url,
            platform=platform,
            title=result["title"],
            thumbnail=result["thumbnail"],
            duration=result["duration"],
            formats={
                item["id"]: result["formats"][item["id"]]
                for item in result["qualities"]
                if not item.get("size") or int(item["size"]) <= int(reservation["maxVideoBytes"])
            },
        )
        qualities = [item for item in result["qualities"] if item["id"] in parsed.formats]
        if not qualities:
            raise RuntimeError("可用格式都超过当前套餐的文件大小限制。")
        await finish_action(user, action_id, "completed", title=parsed.title)
        store.cleanup()
        return {
            "parseId": parsed.id,
            "platform": platform,
            "title": parsed.title,
            "coverUrl": parsed.thumbnail,
            "durationSeconds": parsed.duration,
            "qualities": qualities,
            "downloadAvailable": True,
            "usage": {"usedToday": reservation["usedToday"], "dailyLimit": reservation["dailyLimit"]},
        }
    except asyncio.TimeoutError as exc:
        await finish_action(user, action_id, "failed", error_code="PARSE_TIMEOUT")
        raise HTTPException(504, "解析超时，请稍后重试。") from exc
    except Exception as exc:
        await finish_action(user, action_id, "failed", error_code="PARSE_FAILED")
        if isinstance(exc, HTTPException):
            raise
        raise HTTPException(422, str(exc)) from exc


async def run_download(job: DownloadJob, user: User, parsed, selected: dict, max_bytes: int) -> None:
    job.status = "downloading"
    output_dir = settings.temp_dir / job.id
    try:
        async with download_slots:
            path, filename = await asyncio.wait_for(
                asyncio.to_thread(
                    download_video,
                    url=parsed.url,
                    platform=parsed.platform,
                    title=parsed.title,
                    selected_format=selected,
                    output_dir=output_dir,
                    max_bytes=max_bytes,
                    on_progress=lambda value: setattr(job, "progress", value),
                ),
                timeout=settings.download_timeout_seconds,
            )
        job.file_path = path
        job.filename = filename
        job.content_type = "video/mp4" if path.suffix.lower() == ".mp4" else "video/webm" if path.suffix.lower() == ".webm" else "application/octet-stream"
        job.status = "completed"
        job.progress = 100
        await finish_action(
            user, job.action_id, "completed", title=parsed.title,
            content_type=job.content_type, content_length=path.stat().st_size,
        )
    except asyncio.TimeoutError:
        job.status = "failed"
        job.error = "下载任务超时。"
        shutil.rmtree(output_dir, ignore_errors=True)
        try:
            await finish_action(user, job.action_id, "failed", error_code="DOWNLOAD_TIMEOUT")
        except Exception:
            pass
    except Exception as exc:
        job.status = "failed"
        job.error = str(exc)
        shutil.rmtree(output_dir, ignore_errors=True)
        try:
            await finish_action(user, job.action_id, "failed", error_code="DOWNLOAD_FAILED")
        except Exception:
            pass


@app.post("/api/download", status_code=202)
async def create_download(payload: DownloadRequest, user: User = Depends(current_user)) -> dict[str, str]:
    require_rights(payload.rights_confirmed)
    parsed = store.parsed.get(payload.parse_id)
    if not parsed or parsed.user_id != user.id:
        raise HTTPException(404, "解析记录已过期，请重新解析。")
    selected = parsed.formats.get(payload.format_id)
    if not selected:
        raise HTTPException(400, "所选清晰度无效，请重新解析。")
    host = __import__("urllib.parse", fromlist=["urlparse"]).urlparse(parsed.url).hostname or ""
    reservation = await reserve_action(user, "download", parsed.platform, host)
    job = store.add_job(user_id=user.id, parse_id=parsed.id, action_id=reservation["actionId"])
    asyncio.create_task(run_download(job, user, parsed, selected, int(reservation["maxVideoBytes"])))
    return {"jobId": job.id, "status": job.status}


@app.get("/api/jobs/{job_id}")
async def job_status(job_id: str, user: User = Depends(current_user)) -> dict:
    store.cleanup()
    job = store.jobs.get(job_id)
    if not job or job.user_id != user.id:
        raise HTTPException(404, "下载任务不存在或已过期。")
    return {"id": job.id, "status": job.status, "progress": job.progress, "error": job.error, "fileReady": bool(job.file_path)}


def remove_download(job_id: str, directory: Path) -> None:
    shutil.rmtree(directory, ignore_errors=True)
    with store.lock:
        store.jobs.pop(job_id, None)


@app.get("/api/jobs/{job_id}/file")
async def job_file(job_id: str, user: User = Depends(current_user)) -> FileResponse:
    job = store.jobs.get(job_id)
    if not job or job.user_id != user.id:
        raise HTTPException(404, "下载任务不存在或已过期。")
    if job.status != "completed" or not job.file_path or not job.file_path.is_file():
        raise HTTPException(409, "视频文件尚未准备完成。")
    return FileResponse(
        job.file_path,
        media_type=job.content_type,
        filename=job.filename or "video.mp4",
        background=BackgroundTask(remove_download, job.id, job.file_path.parent),
        headers={"Cache-Control": "private, no-store", "X-Content-Type-Options": "nosniff"},
    )
