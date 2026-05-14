// وحدة مشتركة لإدارة وقت تشغيل الفحوصات الصحية
//
// الغرض الهندسي
// تقديم ثلاث آليات أساسية لتشغيل فحوصات الصحة تحت ضغط عالٍ
// دون أي تخفيف لصرامة الفحوصات ودون تغيير عقد الـ HTTP API.
//
// 1) Promise.all لتشغيل الفحوصات بالتوازي بدلاً من التسلسل.
//    هذا يخفض الزمن الكلي من مجموع كل الفحوصات إلى زمن أبطأ فحص فقط.
//
// 2) withCheckTimeout لتحديد سقف زمني لكل فحص فردي.
//    إذا تأخّر فحص يتجاوز السقف يُرجَع كائن HealthCheck بحالة unhealthy
//    مع رسالة timeout واضحة. لا يُحجَب طلب الـ HTTP بأكمله.
//
// 3) TtlMemoizer لتخزين نتائج الفحوصات الجماعية لفترة قصيرة.
//    عند طلبات متعددة متزامنة على نفس النقطة الزمنية،
//    يُنفَّذ حساب واحد فقط وتُعاد نسخة منه لكل الطلبات الأخرى.
//
// هذه الوحدة لا تُعدّل أي عتبة فحص ولا تُسقط أي فحص ولا تخفّف أي تحقق.

import type { HealthCheck } from "./health-checks.helpers.js";

const DEFAULT_CHECK_TIMEOUT_MS = 2000;

/**
 * يُغلّف وعد فحص صحي بسقف زمني صارم.
 * إذا تجاوز الفحص السقف، يُرجَع كائن HealthCheck بحالة unhealthy
 * مع زمن الاستجابة المسجّل ورسالة timeout. لا يَرمي.
 *
 * @param promise وعد فحص صحي
 * @param label اسم الفحص لاستخدامه في رسالة الخطأ
 * @param timeoutMs السقف الزمني بالملّي ثانية
 */
export async function withCheckTimeout(
  promise: Promise<HealthCheck>,
  label: string,
  timeoutMs: number = DEFAULT_CHECK_TIMEOUT_MS,
): Promise<HealthCheck> {
  const startTime = Date.now();
  let timer: NodeJS.Timeout | null = null;

  try {
    const timeoutPromise = new Promise<HealthCheck>((resolve) => {
      timer = setTimeout(() => {
        resolve({
          status: "unhealthy",
          required: true,
          responseTime: Date.now() - startTime,
          error: `${label} health check timed out after ${timeoutMs}ms.`,
        });
      }, timeoutMs);
    });

    const result = await Promise.race([promise, timeoutPromise]);
    return result;
  } catch (error) {
    return {
      status: "unhealthy",
      required: true,
      responseTime: Date.now() - startTime,
      error:
        error instanceof Error
          ? error.message
          : `${label} health check threw an unexpected error.`,
    };
  } finally {
    if (timer) {
      clearTimeout(timer);
    }
  }
}

/**
 * مُذاكر نتائج بتاريخ انتهاء صلاحية قصير ودمج طلبات متزامنة.
 *
 * في حالة وصول 500 طلب متزامن خلال نافذة TTL واحدة،
 * يُنفَّذ الحساب الأساسي مرة واحدة فقط والباقي يحصل على نفس النتيجة.
 * هذا حماية أساسية لـ connection pools للقاعدة و Redis و الخدمات الخارجية.
 */
export class TtlMemoizer<T> {
  private readonly compute: () => Promise<T>;
  private readonly ttlMs: number;

  private cached: { value: T; expiresAt: number } | null = null;
  private inFlight: Promise<T> | null = null;

  constructor(compute: () => Promise<T>, ttlMs: number) {
    this.compute = compute;
    this.ttlMs = ttlMs;
  }

  async get(): Promise<T> {
    const now = Date.now();

    if (this.cached && this.cached.expiresAt > now) {
      return this.cached.value;
    }

    if (this.inFlight) {
      return this.inFlight;
    }

    this.inFlight = (async () => {
      try {
        const value = await this.compute();
        this.cached = { value, expiresAt: Date.now() + this.ttlMs };
        return value;
      } finally {
        this.inFlight = null;
      }
    })();

    return this.inFlight;
  }

  invalidate(): void {
    this.cached = null;
  }
}

/**
 * الإعدادات الافتراضية لسقف زمن الفحص.
 * يُصدَّر للاستخدام خارج هذا الملف عند الحاجة لضبطه عبر متغيرات البيئة لاحقاً.
 */
export const HEALTH_CHECK_TIMEOUT_MS = DEFAULT_CHECK_TIMEOUT_MS;

/**
 * مدة صلاحية تخزين نتائج الفحوصات الكاملة في الذاكرة.
 * خمس عشرة ثانية قيمة آمنة تماماً لأنها أقصر بكثير من فترات
 * المراقبة الخارجية، وأطول بما يكفي لاستيعاب موجة طلبات اختبارات الضغط.
 */
export const HEALTH_AGGREGATE_TTL_MS = 15_000;
