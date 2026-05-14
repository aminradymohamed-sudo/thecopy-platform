/**
 * @module rate-limit
 * @description محدّد معدل الطلبات في الذاكرة لمسارات API
 *
 * مناسب لبيئات Node.js ذات عملية واحدة (single-process).
 * للإنتاج متعدد النسخ: استبدل بـ Redis أو Upstash.
 */

interface RateLimitEntry {
  /** عدد الطلبات في النافذة الزمنية الحالية */
  count: number;
  /** توقيت إعادة تعيين النافذة (milliseconds) */
  resetAt: number;
}

/** مخزن الحالة: IP → إدخال الحد */
const store = new Map<string, RateLimitEntry>();

/** حجم المخزن الأقصى — يمنع تسرب الذاكرة عند هجمات تعداد IP */
const MAX_STORE_SIZE = 10_000;

/** فاصل تنظيف المخزن (milliseconds) */
const CLEANUP_INTERVAL_MS = 5 * 60 * 1000; // 5 دقائق

/** تنظيف دوري للإدخالات المنتهية */
setInterval(() => {
  const now = Date.now();
  for (const [key, entry] of store.entries()) {
    if (entry.resetAt <= now) {
      store.delete(key);
    }
  }
}, CLEANUP_INTERVAL_MS);

export interface RateLimitOptions {
  /** الحد الأقصى للطلبات في النافذة الزمنية */
  limit: number;
  /** طول النافذة الزمنية (milliseconds) */
  windowMs: number;
}

export interface RateLimitResult {
  /** هل الطلب مسموح به؟ */
  allowed: boolean;
  /** عدد الطلبات المتبقية في النافذة الحالية */
  remaining: number;
  /** توقيت انتهاء النافذة الحالية (Unix seconds) */
  resetAt: number;
  /** الحد الأقصى */
  limit: number;
}

/**
 * فحص حد معدل الطلبات لمفتاح معين (عادةً IP)
 */
export function checkRateLimit(
  key: string,
  options: RateLimitOptions
): RateLimitResult {
  const now = Date.now();
  const { limit, windowMs } = options;

  let entry = store.get(key);

  if (!entry || entry.resetAt <= now) {
    // نافذة جديدة
    if (store.size >= MAX_STORE_SIZE && !store.has(key)) {
      // المخزن ممتلئ — ارفض بشكل آمن
      return {
        allowed: false,
        remaining: 0,
        resetAt: Math.floor((now + windowMs) / 1000),
        limit,
      };
    }
    entry = { count: 1, resetAt: now + windowMs };
    store.set(key, entry);
    return {
      allowed: true,
      remaining: limit - 1,
      resetAt: Math.floor(entry.resetAt / 1000),
      limit,
    };
  }

  entry.count += 1;
  const remaining = Math.max(0, limit - entry.count);
  const allowed = entry.count <= limit;

  return {
    allowed,
    remaining,
    resetAt: Math.floor(entry.resetAt / 1000),
    limit,
  };
}

/**
 * استخراج IP الطالب من الرأسيات المعيارية
 */
export function getClientIp(request: Request): string {
  const forwarded = request.headers.get("x-forwarded-for");
  if (forwarded) {
    // قد يحتوي على قائمة IPs مفصولة بفواصل — الأول هو العميل
    const first = forwarded.split(",")[0]?.trim();
    if (first) return first;
  }
  const realIp = request.headers.get("x-real-ip");
  if (realIp) return realIp.trim();
  return "unknown";
}
