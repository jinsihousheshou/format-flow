# 格式工坊（Format Flow）

一个带账号、兑换码授权和管理员后台的浏览器端文件格式转换网站。用户文件留在浏览器本地处理；登录、兑换、次数扣减和管理操作由 Supabase 服务端验证。

在线访问：<https://jinsihousheshou.github.io/format-flow/>

## 当前功能

- 用户注册、登录、找回密码、修改密码和退出登录
- 体验码、月卡、年卡、长期版和次数卡
- 管理员批量生成、复制、导出、禁用兑换码
- 管理员调整用户权益和封禁异常账号
- 视频链接下载：后端鉴权、套餐日限额、域名白名单、SSRF 与重定向检查
- 每次转换前由 Edge Function 验证权限并原子扣减次数
- PDF 页面转换为 JPG、PNG 或 WEBP，多页自动打包
- 图片互转：JPG、PNG、WEBP
- 音频输出：MP3、WAV、M4A、OGG、AAC、FLAC
- 视频输出：MP4、WebM、MOV、MKV、AVI
- 图片、文档、音频、视频分类导航
- 响应式中文界面，支持拖放或选择文件

当前没有实现图片转 PDF、PDF 合并、DOCX 转 PDF；页面不会把这些尚未验证的能力展示成可用工具。

## 技术栈

- Next.js 16
- React 19
- TypeScript
- Tailwind CSS
- PDF.js
- FFmpeg WebAssembly
- Supabase Auth、Postgres、RLS 和 Edge Functions

## 本地运行

```bash
npm install
npm run dev
```

复制 `.env.example` 为 `.env.local`，填写 Supabase 的 Project URL 和 anon key，再打开 <http://localhost:3000>。

## 创建 Supabase 后端

1. 在 Supabase 创建项目，打开 SQL Editor。
2. 依次执行 [`supabase/migrations/202609060001_auth_and_licensing.sql`](supabase/migrations/202609060001_auth_and_licensing.sql) 和 [`supabase/migrations/202609070001_video_link_downloader.sql`](supabase/migrations/202609070001_video_link_downloader.sql)。脚本会创建用户资料、管理员、兑换码、权益、转换记录、视频套餐限额、域名白名单、解析日志、RLS 和原子限流函数。
3. 在 Authentication 的 URL Configuration 中设置 Site URL 为线上地址，并把本地与线上个人中心加入 Redirect URLs：
   - `http://localhost:3000/account/`
   - `https://jinsihousheshou.github.io/format-flow/account/`
4. 使用 Supabase CLI 登录并关联项目，然后部署函数：

```bash
supabase login
supabase link --project-ref 你的项目REF
supabase functions deploy redeem-code
supabase functions deploy authorize-conversion
supabase functions deploy finish-conversion
supabase functions deploy admin-api
supabase functions deploy video-link
supabase secrets set ALLOWED_ORIGINS=http://localhost:3000,https://jinsihousheshou.github.io
```

`SUPABASE_URL`、`SUPABASE_ANON_KEY` 和 `SUPABASE_SERVICE_ROLE_KEY` 由 Supabase 自动提供给 Edge Functions。`service_role` 只在服务端函数中读取，严禁放入 `.env.local`、GitHub Pages 或前端代码。

## 安全创建管理员

先通过网站注册管理员邮箱并完成邮箱验证，然后在 Supabase SQL Editor 中执行一次：

```sql
insert into public.admin_users(user_id)
select id from auth.users where email = '你的管理员邮箱';
```

管理员使用普通登录入口登录后，导航会显示“管理后台”。管理员身份由 Edge Function 再次查询 `admin_users`，普通用户修改网址无法执行管理操作。不要把管理员密码写入 SQL、环境变量或前端。

## 生成并发送兑换码

登录管理员账号，进入 `/admin/`，选择套餐、有效期、次数和数量后生成。明文兑换码只在生成结果中显示一次；数据库只保存 SHA-256 哈希和遮罩提示。立即复制或导出，并把单个兑换码通过闲鱼聊天发送给对应买家。

管理员后台的“视频链接套餐限额”可分别设置每种套餐每天的解析次数、下载次数和单文件上限。限流由数据库事务和用户级锁执行，前端修改数据不能绕过。

## 视频链接下载

第一阶段真实支持管理员白名单内的 HTTPS 视频直链。数据库初始只放行 MDN 的公共测试媒体域名；增加自有或已审核的媒体域名时，在 SQL Editor 中执行：

```sql
insert into public.video_source_domains(hostname, label, enabled, allow_subdomains)
values ('media.example.com', '自有媒体域名', true, false)
on conflict (hostname) do update set enabled = excluded.enabled;
```

不要把任意用户可上传或可重定向到任意地址的域名加入白名单。服务端只接受 HTTPS，限制 3 次重定向，每次都会重新检查域名和 DNS，拒绝本机与保留地址；解析和下载分别鉴权、记日志和计入套餐日额度。下载内容通过响应流转发，不创建服务器临时文件。

抖音、快手和哔哩哔哩链接目前只做可靠识别并显示“维护中”。项目没有接入虚构的官方接口，也不会索取用户 Cookie；如果将来取得平台正式开放权限，平台适配入口位于 `supabase/functions/video-link/index.ts`，域名识别位于 `supabase/functions/_shared/video-url.ts`。

解析失败时先查看页面错误码与 `video_link_logs.error_code`：`DOMAIN_NOT_ALLOWED` 表示域名未审核，`PRIVATE_NETWORK_BLOCKED` 表示命中 SSRF 防护，`RATE_LIMITED`/`DAILY_LIMIT_REACHED` 表示限流，`SIZE_LIMIT` 表示源文件大小或套餐上限不符，`UPSTREAM_HTTP_ERROR` 表示源站请求失败。Edge Function 日志不记录完整用户链接。

## 环境变量

本地变量写入 `.env.local`，格式参考 `.env.example`。GitHub 仓库的 Settings → Secrets and variables → Actions 中配置：

- Variable `SUPABASE_URL`：Supabase Project URL
- Secret `SUPABASE_ANON_KEY`：Supabase anon key
- Variable `XIANYU_URL`：闲鱼商品链接，可暂时留空

anon key 可安全用于开启 RLS 的前端；service role 不能添加到 GitHub Pages 构建变量。

## 构建

标准 Next.js 构建：

```bash
npm run build:next
```

Cloudflare/vinext 兼容构建：

```bash
npm run build
```

## 部署说明

FFmpeg WebAssembly 核心约 32 MB，音频或视频转换首次使用时会从本站静态资源按需加载并由浏览器缓存；版本锁定的 CDN 仅作为备用地址。

推送到 `main` 后，`.github/workflows/deploy-github-pages.yml` 会自动构建并发布。数据库变更和 Edge Functions 需要使用 Supabase CLI 单独部署。

## 已验证范围与限制

项目代码已验证静态构建、类型检查、桌面与手机布局、GitHub Pages 子路径资源，以及未激活用户的上传拦截。自动化浏览器使用真实文件成功下载了 PNG→JPG、PDF→JPG、WAV→MP3、WEBM→MP4 结果。其余页面列出的输出格式使用同一组 Canvas、PDF.js 或 FFmpeg 实现，但尚未逐一覆盖所有输入编码组合；GIF 动图、BMP、DOCX 等未列为已验证格式。

视频链接功能已使用带分享文案的抖音短链、快手短链、哔哩哔哩视频页链接验证平台识别和“维护中”分支；普通直链使用 MDN 公共 MP4 文件验证响应类型与大小。完整的账号鉴权、数据库计次和 Edge Function 在线调用需要先按上文配置真实 Supabase 项目。

转换在浏览器本地运行可以降低文件泄露和服务器成本，但用户能够读取前端代码，因此不能做到绝对防破解。当前实现把账号状态、兑换码绑定、有效期、次数扣减和管理员操作放在 Supabase 服务端，避免仅靠按钮或 `localStorage` 判断权限。

百度统计接入已预留环境变量：

```bash
NEXT_PUBLIC_BAIDU_TONGJI_ID=你的百度统计站点ID
```

复制 `.env.example` 为 `.env.local` 后填写即可。本地环境变量文件不会提交到 Git。
