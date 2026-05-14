/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { FabricType } from "./rulesEngine";

export interface TechPackSpec {
  pantoneCode: string;
  pantoneName: string;
  hexPreview: string;
  fabricConsump: number; // Meters
  costEstimate: number; // USD
  historicalWarning: string | null;
  careLabel: string;
  // New properties for view
  threadCount: string;
  liningRequired: boolean;
}

export const STYLEIST_PROJECT_YEAR_RANGE = {
  min: 1888,
  max: 2100,
} as const;

interface TechPackDownloadInput {
  techPack: TechPackSpec;
  fabricName: string;
  projectName?: string;
}

// قاموس تواريخ اختراع الأقمشة
const FABRIC_HISTORY: Record<string, number> = {
  polyester: 1941,
  spandex: 1959,
  nylon: 1935,
  acrylic: 1950,
  viscose: 1883,
  cotton: -3000, // Ancient
  wool: -10000, // Ancient
  silk: -3000,
  leather: -50000,
};

// قاموس البانتون السينمائي (ألوان قياسية)
const PANTONE_MAP: Record<string, { code: string; name: string; hex: string }> =
  {
    red: { code: "19-1763 TCX", name: "High Risk Red", hex: "#A81C07" },
    blue: { code: "19-4052 TCX", name: "Classic Blue", hex: "#0F4C81" },
    green: { code: "19-0419 TCX", name: "Rifle Green", hex: "#444C38" },
    black: { code: "19-4005 TCX", name: "Stretch Limo", hex: "#2B2B2B" },
    white: { code: "11-0601 TCX", name: "Bright White", hex: "#F4F5F0" },
    brown: { code: "19-1250 TCX", name: "Picante", hex: "#8D4F37" },
    yellow: { code: "13-0647 TCX", name: "Illuminating", hex: "#F5DF4D" },
    grey: { code: "17-5104 TCX", name: "Ultimate Gray", hex: "#939597" },
  };

const DEFAULT_PANTONE = {
  code: "19-4005 TCX",
  name: "Stretch Limo",
  hex: "#2B2B2B",
};

/**
 * استخراج كود البانتون الأقرب (محاكاة)
 */
export const extractPantone = (
  colorFamily = "black"
): { code: string; name: string; hex: string } => {
  const key = colorFamily.toLowerCase();
  return PANTONE_MAP[key] ?? DEFAULT_PANTONE;
};

/**
 * تقدير استهلاك القماش بناءً على النوع
 */
export const estimateFabricUsage = (
  type: string,
  _fabricWidth = 150
): number => {
  // حساب تقريبي بالمتر الطولي (عرض 150 سم)
  switch (type.toLowerCase()) {
    case "coat":
      return 3.5;
    case "jacket":
      return 2.2;
    case "shirt":
      return 1.8;
    case "pants":
      return 1.5;
    case "dress":
      return 4.0;
    default:
      return 2.0;
  }
};

/**
 * التحقق من الدقة التاريخية
 */
export const validateHistoricalAccuracy = (
  year: number,
  material: FabricType
): string | null => {
  const inventionYear = FABRIC_HISTORY[material.toLowerCase()];

  if (inventionYear && year < inventionYear) {
    return `خطأ تاريخي: خامة "${material}" لم تكن موجودة في سنة ${year}. تم اختراعها عام ${inventionYear}.`;
  }

  // قواعد ثقافية إضافية
  if (year < 1920 && material === "spandex") {
    return "خطأ راكور زمني: الأقمشة المطاطية (الليكرا/السباندكس) غير مقبولة في الدراما التاريخية قبل الخمسينات.";
  }

  return null;
};

export function isValidProjectYear(year: number): boolean {
  return (
    Number.isInteger(year) &&
    year >= STYLEIST_PROJECT_YEAR_RANGE.min &&
    year <= STYLEIST_PROJECT_YEAR_RANGE.max
  );
}

export function sanitizeTechPackFilename(projectName = ""): string {
  const safeBase =
    projectName
      .normalize("NFKD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/\.[a-z0-9]{1,8}$/gi, "")
      .replace(/[^a-zA-Z0-9_-]+/g, "-")
      .replace(/^-+|-+$/g, "")
      .replace(/-{2,}/g, "-")
      .slice(0, 72)
      .toLowerCase() || "styleist";

  return `${safeBase}-tech-pack.html`;
}

function escapeHtml(value: string | number | boolean | null): string {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

export function buildTechPackDocument({
  techPack,
  fabricName,
  projectName = "styleist",
}: TechPackDownloadInput): string {
  const referenceId = Date.now().toString(36).toUpperCase();
  const title = `${projectName} ${fabricName} tech pack`;

  return `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>${escapeHtml(title)}</title>
  <style>
    body{font-family:Inter,Arial,sans-serif;margin:0;padding:40px;color:#111;background:#fff}
    main{max-width:760px;margin:0 auto}
    h1{font-size:28px;letter-spacing:.08em;text-transform:uppercase;margin:0 0 4px}
    .ref{font-size:12px;color:#555;margin-bottom:28px}
    .swatch{width:88px;height:88px;border:1px solid #bbb;background:${escapeHtml(techPack.hexPreview)}}
    .grid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:16px;margin-top:24px}
    .field{border-top:1px solid #ddd;padding-top:10px}
    .field label{display:block;font-size:11px;text-transform:uppercase;color:#666;letter-spacing:.08em}
    .field span{display:block;margin-top:4px;font-weight:700}
    .warning{margin-top:24px;padding:14px;border:1px solid #b45309;background:#fffbeb;color:#78350f}
  </style>
</head>
<body>
  <main>
    <h1>Tech Pack</h1>
    <div class="ref">Reference ${escapeHtml(referenceId)}</div>
    <div class="swatch" aria-label="Color swatch"></div>
    <section class="grid">
      <div class="field"><label>Fabric</label><span>${escapeHtml(fabricName)}</span></div>
      <div class="field"><label>Pantone</label><span>${escapeHtml(techPack.pantoneCode)}</span></div>
      <div class="field"><label>Color</label><span>${escapeHtml(techPack.pantoneName)}</span></div>
      <div class="field"><label>Consumption</label><span>${escapeHtml(techPack.fabricConsump)}m / unit</span></div>
      <div class="field"><label>Thread count</label><span>${escapeHtml(techPack.threadCount)}</span></div>
      <div class="field"><label>Lining</label><span>${techPack.liningRequired ? "Required" : "None"}</span></div>
      <div class="field"><label>Cost estimate</label><span>${escapeHtml(techPack.costEstimate)} USD</span></div>
      <div class="field"><label>Care</label><span>${escapeHtml(techPack.careLabel)}</span></div>
    </section>
    ${
      techPack.historicalWarning
        ? `<div class="warning">${escapeHtml(techPack.historicalWarning)}</div>`
        : ""
    }
  </main>
</body>
</html>`;
}

export function downloadTechPackDocument(input: TechPackDownloadInput): string {
  const filename = sanitizeTechPackFilename(
    input.projectName ?? input.fabricName
  );
  const html = buildTechPackDocument(input);
  const blob = new Blob([html], { type: "text/html;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");

  anchor.href = url;
  anchor.download = filename;
  anchor.rel = "noopener";
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  URL.revokeObjectURL(url);

  return filename;
}

/**
 * توليد أمر الشغل الكامل
 */
export const generateFullTechPack = (
  fabric: FabricType,
  garmentType: string,
  year: number,
  baseColor: string
): TechPackSpec => {
  const pantone = extractPantone(baseColor);
  const yardage = estimateFabricUsage(garmentType);
  const historyCheck = validateHistoricalAccuracy(year, fabric);

  // تقدير التكلفة (سعر المتر * الكمية + المصنعية)
  const basePricePerMeter = fabric === "silk" || fabric === "leather" ? 45 : 12;
  const cost = Math.round(basePricePerMeter * yardage + 150); // 150 labour cost

  // تحديد Thread Count بشكل افتراضي بناءً على القماش
  let threadCount = "300 TC";
  if (fabric === "silk") threadCount = "600 TC";
  if (fabric === "wool") threadCount = "120 GSM";
  if (fabric === "leather") threadCount = "N/A";
  if (fabric === "polyester") threadCount = "180 TC";

  // تحديد حاجة البطانة (Lining)
  const liningRequired = ["coat", "jacket", "dress"].includes(
    garmentType.toLowerCase()
  );

  return {
    pantoneCode: pantone.code,
    pantoneName: pantone.name,
    hexPreview: pantone.hex,
    fabricConsump: yardage,
    costEstimate: cost,
    historicalWarning: historyCheck,
    careLabel:
      fabric === "silk" || fabric === "wool"
        ? "Dry Clean Only"
        : "Machine Wash Cold",
    threadCount,
    liningRequired,
  };
};
