import Script from "next/script";

const rawSiteId = process.env.NEXT_PUBLIC_BAIDU_TONGJI_ID?.trim();
const siteId =
  rawSiteId && /^[a-zA-Z0-9_-]+$/.test(rawSiteId) ? rawSiteId : null;

export default function BaiduAnalytics() {
  if (!siteId) {
    return null;
  }

  return (
    <Script id="baidu-tongji" strategy="afterInteractive">
      {`
        window._hmt = window._hmt || [];
        (function () {
          var hm = document.createElement("script");
          hm.src = "https://hm.baidu.com/hm.js?${siteId}";
          var firstScript = document.getElementsByTagName("script")[0];
          firstScript.parentNode.insertBefore(hm, firstScript);
        })();
      `}
    </Script>
  );
}
