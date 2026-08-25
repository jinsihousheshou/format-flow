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

FFmpeg WebAssembly 核心约 32 MB，音频或视频转换首次使用时会从版本锁定的 CDN 按需加载，不会进入部署平台的静态资源包。

百度统计接入已预留环境变量：

```bash
NEXT_PUBLIC_BAIDU_TONGJI_ID=你的百度统计站点ID
```

复制 `.env.example` 为 `.env.local` 后填写即可。本地环境变量文件不会提交到 Git。
