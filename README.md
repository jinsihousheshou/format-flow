# 格式工坊（Format Flow）

一个简洁的浏览器端文件格式转换网站，提供文档、音频和视频转换入口。文件处理在用户浏览器内完成，无需上传到业务服务器。

## 当前功能

- PDF 页面转换为 JPG，并自动打包下载
- 音频转换：MP3、WAV、M4A、OGG
- 视频转换：MP4、WebM、MOV
- 图片、文档、音频、视频分类导航
- 响应式中文界面，支持拖放或选择文件

## 技术栈

- Next.js 16
- React 19
- TypeScript
- Tailwind CSS
- PDF.js
- FFmpeg WebAssembly

## 本地运行

```bash
npm install
npm run dev
```

打开 <http://localhost:3000>。

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

`public/ffmpeg/ffmpeg-core.wasm` 大约 32 MB。部署平台需要允许单个静态文件超过 32 MB；如果平台限制更低，可将 FFmpeg 核心文件改为从 CDN 按需加载。

百度统计接入已预留环境变量：

```bash
NEXT_PUBLIC_BAIDU_TONGJI_ID=你的百度统计站点ID
```

复制 `.env.example` 为 `.env.local` 后填写即可。本地环境变量文件不会提交到 Git。
