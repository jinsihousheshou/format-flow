import type { Metadata } from "next";
import BaiduAnalytics from "./baidu-analytics";
import { AuthProvider } from "../components/auth-provider";
import "./globals.css";

export const metadata: Metadata = {
  title: "格式工坊 · 在线文件格式转换",
  description: "简单、安全、高效的在线文件处理工具",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="zh-CN">
      <body>
        <AuthProvider>{children}</AuthProvider>
        <BaiduAnalytics />
      </body>
    </html>
  );
}
