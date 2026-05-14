// sitemap.ts — Next.js App Router sitemap generator
// يولّد /sitemap.xml تلقائياً عند البناء، يُقدَّم على https://www.thecopy.app/sitemap.xml
// المرجع: https://nextjs.org/docs/app/api-reference/file-conventions/metadata/sitemap

import type { MetadataRoute } from "next";

const SITE_URL = "https://www.thecopy.app";

/**
 * كل المسارات العامة المُقدَّمة في الموقع.
 * تُحدَّث حين تُضاف صفحة عامة جديدة.
 */
const PUBLIC_ROUTES: {
  path: string;
  changeFrequency: MetadataRoute.Sitemap[number]["changeFrequency"];
  priority: number;
}[] = [
  // الصفحة الرئيسية — أعلى أولوية
  { path: "/", changeFrequency: "weekly", priority: 1.0 },

  // المصادقة
  { path: "/login", changeFrequency: "monthly", priority: 0.5 },
  { path: "/register", changeFrequency: "monthly", priority: 0.5 },

  // الأدوات الرئيسية — أولوية عالية
  { path: "/editor", changeFrequency: "weekly", priority: 0.9 },
  {
    path: "/arabic-creative-writing-studio",
    changeFrequency: "weekly",
    priority: 0.9,
  },
  { path: "/directors-studio", changeFrequency: "weekly", priority: 0.9 },
  { path: "/actorai-arabic", changeFrequency: "weekly", priority: 0.9 },
  { path: "/art-director", changeFrequency: "weekly", priority: 0.9 },
  { path: "/cinematography-studio", changeFrequency: "weekly", priority: 0.9 },

  // أدوات داعمة
  { path: "/breakdown", changeFrequency: "monthly", priority: 0.8 },
  { path: "/brain-storm", changeFrequency: "monthly", priority: 0.8 },
  { path: "/styliest-techpack", changeFrequency: "monthly", priority: 0.7 },
];

/**
 * sitemap.xml generator — يُستدعى وقت البناء وتلقائياً عند زيارة /sitemap.xml.
 */
export default function sitemap(): MetadataRoute.Sitemap {
  const lastModified = new Date();

  return PUBLIC_ROUTES.map((route) => ({
    url: `${SITE_URL}${route.path}`,
    lastModified,
    changeFrequency: route.changeFrequency,
    priority: route.priority,
  }));
}
