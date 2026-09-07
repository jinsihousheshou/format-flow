# 视频下载后端

这是“格式工坊”的独立 FastAPI 服务。它使用用户的 Supabase JWT 验证登录，并通过现有的 `reserve_video_link_action` RPC 检查套餐、每日次数、封禁状态和并发请求。密钥只需要公开的 Supabase anon key，不使用 service_role。

## 本地运行

需要 Python 3.11+ 与 FFmpeg：

```powershell
cd backend
python -m venv .venv
.venv\Scripts\python -m pip install -r requirements.txt
Copy-Item .env.example .env
.venv\Scripts\uvicorn app.main:app --host 127.0.0.1 --port 8000 --env-file .env
```

前端根目录 `.env.local` 增加：

```dotenv
NEXT_PUBLIC_VIDEO_API_URL=http://127.0.0.1:8000
```

然后在项目根目录运行 `npm run dev`。生产环境的地址必须是 HTTPS，且不能填写 localhost。

## Docker 部署

```bash
docker build -t format-flow-video ./backend
docker run --rm -p 8000:8000 --env-file ./backend/.env format-flow-video
```

可以把 `backend/Dockerfile` 部署到支持 Docker、HTTPS 和至少 1 GB 临时磁盘的 Render、Railway、Fly.io 或自有服务器。配置 `.env.example` 中的变量，健康检查填写 `/health`（兼容地址 `/api/health` 仍然保留）。部署后把公开 HTTPS 地址写入 GitHub Actions 仓库变量 `VIDEO_API_URL`，Pages 构建会注入 `NEXT_PUBLIC_VIDEO_API_URL`。

### Render

仓库根目录的 `render.yaml` 可以直接创建 Blueprint。唯一需要在 Render 控制台填写的敏感变量是 `SUPABASE_ANON_KEY`；不要填写 service role key。若手动创建 Docker Web Service，各项应填写：

- Root Directory：`backend`
- Dockerfile Path：`./Dockerfile`
- Docker Build Context：`.`
- Health Check Path：`/health`

Dockerfile 使用 `uvicorn app.main:app --host 0.0.0.0 --port ${PORT:-8000}`。Render 会提供 `PORT`，本地没有设置时才使用 8000。公开地址必须为 Render 提供的 HTTPS `onrender.com` 地址，保存到 GitHub Actions Variables 的 `VIDEO_API_URL` 时不要在结尾添加 `/`。

服务实例重启后内存任务会丢失；当前最小版本适合单实例。扩容前应把任务状态迁移到 Redis/数据库，把文件迁移到对象存储。

## yt-dlp 维护

`requirements.txt` 设置了已验证的 nightly 最低版本，并安装 curl-cffi 浏览器请求模拟依赖。定期执行 `python -m pip install -U --pre "yt-dlp[default,curl-cffi]"`，验证后更新最低版本并重新构建镜像。平台页面改变后，先更新 yt-dlp 并检查 `/api/health` 返回的版本；若仍失败，查看后端日志，不要通过添加用户 Cookie 来绕过登录或访问控制。
