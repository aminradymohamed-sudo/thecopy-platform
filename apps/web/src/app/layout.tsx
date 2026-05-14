import { Analytics } from "@vercel/analytics/next";
import { SpeedInsights } from "@vercel/speed-insights/next";
import { Cairo } from "next/font/google";
import { headers } from "next/headers";

import { SecurityGuard } from "@/components/shared/SecurityGuard";
import { DESKTOP_WEB_APP_BODY_CLASS } from "@/lib/desktop-shell";

import "../styles/globals.css";
import { Providers } from "./providers";

import type { Metadata, Viewport } from "next";

const cairo = Cairo({
  subsets: ["arabic", "latin"],
  weight: ["200", "300", "400", "500", "600", "700", "800", "900"],
  display: "block",
  preload: true,
  variable: "--font-cairo",
  adjustFontFallback: true,
});

export const metadata: Metadata = {
  title: "النسخة - منصة الإبداع السينمائي",
  description: " اهداء ليسري نصر الله",
  icons: {
    icon: "/icon.svg",
    shortcut: "/icon.svg",
    apple: "/icon.svg",
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
};

// تفعيل الـ dynamic rendering لكل الصفحات.
// مطلوب لأن CSP الصارم (nonce + strict-dynamic) يحتاج nonce جديدًا لكل طلب،
// وهذا غير ممكن مع SSG أو ISR حيث يُولَّد HTML مرة واحدة وقت البناء بلا nonce.
// المرجع: https://nextjs.org/docs/app/guides/content-security-policy
export const dynamic = "force-dynamic";

const shouldRenderVercelTelemetry = process.env.VERCEL === "1";

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  // قراءة الـ nonce من request headers (تُمرَّر من proxy.ts).
  // فعل القراءة وحده يحوّل الـ layout لـ dynamic ويُمكِّن Next.js من
  // حقن الـ nonce تلقائيًا في كل سكربت يولّده داخل HTML.
  const nonce = (await headers()).get("x-nonce") ?? undefined;

  return (
    <html
      lang="ar"
      dir="rtl"
      suppressHydrationWarning
      className={`${cairo.variable} dark`}
      style={{ colorScheme: "dark" }}
    >
      <head>
        {/* Hero intro video is served same-origin via /api/hero-video */}
        {nonce ? <meta name="x-nonce" content={nonce} /> : null}
      </head>
      <body
        className={`${DESKTOP_WEB_APP_BODY_CLASS} ${cairo.className} antialiased`}
      >
        <SecurityGuard />
        <Providers>{children}</Providers>
        {shouldRenderVercelTelemetry ? (
          <>
            <SpeedInsights />
            <Analytics />
          </>
        ) : null}
      </body>
    </html>
  );
}
