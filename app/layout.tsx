import type { Metadata } from "next";
import BaiduAnalytics from "./baidu-analytics";
import "./globals.css";

export const metadata: Metadata = {
  title: "格式工坊 · 在线文件格式转换",
  description: "快速、安全、免费的在线文件转换工具",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="zh-CN">
      <body>
        {children}
        <BaiduAnalytics />
      </body>
    </html>
  );
}
