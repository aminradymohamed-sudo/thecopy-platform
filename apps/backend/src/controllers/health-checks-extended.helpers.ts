import { getEditorIntegrationHealth } from "@/editor/runtime";
import { logger } from "@/lib/logger";
import { weaviateStore } from "@/memory";
import { platformGenAIService } from "@/services/platform-genai.service";
import { getAnalyticsHealth } from "@/utils/connectivity-telemetry";

import {
  HEALTH_AGGREGATE_TTL_MS,
  HEALTH_CHECK_TIMEOUT_MS,
  TtlMemoizer,
  withCheckTimeout,
} from "./health-checks-runtime.helpers.js";
import {
  checkDatabase,
  checkDatabaseSchema,
  checkRedis,
  checkMemory,
  checkDisk,
  checkEnvironment,
} from "./health-checks.helpers.js";

import type {
  HealthCheck,
  HealthStatus,
  ReadinessStatus,
  DetailedHealthStatus,
} from "./health-checks.helpers.js";

export async function checkExternalServices(): Promise<HealthCheck> {
  try {
    const sentryConfigured = Boolean(process.env.SENTRY_DSN?.trim());
    const aiProviderHealth = await platformGenAIService.probeHealth();

    if (aiProviderHealth.status !== "healthy") {
      return {
        status: "unhealthy",
        responseTime: aiProviderHealth.responseTime,
        error:
          aiProviderHealth.error ?? "The AI provider readiness probe failed.",
        details: {
          sentryConfigured,
          aiTriState: aiProviderHealth.triState,
          ...(aiProviderHealth.details ?? {}),
        },
      };
    }

    return {
      status: "healthy",
      responseTime: aiProviderHealth.responseTime,
      message: aiProviderHealth.message ?? "External services are reachable.",
      details: {
        sentryConfigured,
        aiTriState: aiProviderHealth.triState,
        ...(aiProviderHealth.details ?? {}),
      },
    };
  } catch (error) {
    logger.error("External services health check failed", { error });
    return {
      status: "unhealthy",
      error:
        error instanceof Error
          ? error.message
          : "External services check failed",
    };
  }
}

export async function checkWeaviate(): Promise<HealthCheck> {
  const startTime = Date.now();
  const statusBeforeCheck = weaviateStore.getStatus();

  if (!statusBeforeCheck.enabled) {
    return {
      status: "healthy",
      required: false,
      responseTime: 0,
      message: "Weaviate is disabled for this environment.",
      details: statusBeforeCheck as unknown as Record<string, unknown>,
    };
  }

  const healthy = await weaviateStore.healthCheck();
  const statusAfterCheck = weaviateStore.getStatus();

  if (healthy) {
    return {
      status: "healthy",
      required: statusAfterCheck.required,
      responseTime: Date.now() - startTime,
      message: "Weaviate is connected.",
      details: statusAfterCheck as unknown as Record<string, unknown>,
    };
  }

  return {
    status: statusAfterCheck.required ? "unhealthy" : "degraded",
    required: statusAfterCheck.required,
    responseTime: Date.now() - startTime,
    error: statusAfterCheck.required
      ? "Weaviate is required but unavailable."
      : "Weaviate is unavailable; memory routes are degraded.",
    details: statusAfterCheck as unknown as Record<string, unknown>,
  };
}

export async function checkEditorIntegration(): Promise<HealthCheck> {
  const startTime = Date.now();

  try {
    const editorHealth = await getEditorIntegrationHealth();
    const healthy = editorHealth["ok"] === true;

    return {
      status: healthy ? "healthy" : "unhealthy",
      responseTime: Date.now() - startTime,
      details: editorHealth,
      ...(healthy
        ? { message: "Editor integration is fully configured." }
        : { error: "Editor integration is not fully configured." }),
    };
  } catch (error) {
    logger.error("Editor integration health check failed", { error });
    return {
      status: "unhealthy",
      error:
        error instanceof Error
          ? error.message
          : "Editor integration check failed",
    };
  }
}

export function checkAnalyticsPersistence(): HealthCheck {
  const analytics = getAnalyticsHealth();

  // تمييز صريح بين "لم يُمارَس بعد" و"هناك فشل حقيقي":
  // إذا لم يحدث أي نجاح ولم يُسجَّل أي فشل، فالحالة هي "غير مُختبَرة" — وليست
  // صحة شكلية ولا فشل فعلي. نُعيدها كـ degraded مع رسالة صريحة لا تكذب.
  const neverExercised =
    analytics.lastSuccess === null && analytics.failureCount === 0;

  let message: string;
  if (analytics.status === "healthy") {
    message = "Analytics persistence is healthy.";
  } else if (neverExercised) {
    message =
      "Analytics persistence has not been exercised yet (no successes and no failures recorded).";
  } else {
    message = "Analytics persistence has recent failures.";
  }

  return {
    status: analytics.status,
    // تحليلات الكتابة ليست شرطًا لاستعداد التطبيق الأساسي، لكنها تُعرَض في التقرير.
    required: false,
    details: {
      status: analytics.status,
      lastSuccess: analytics.lastSuccess,
      failureCount: analytics.failureCount,
      neverExercised,
    },
    message,
  };
}

export function aggregateHealthStatus(
  checks: Record<string, HealthCheck>,
): "healthy" | "degraded" | "unhealthy" {
  const values = Object.values(checks);
  if (values.some((check) => check.status === "unhealthy")) return "unhealthy";
  if (values.some((check) => check.status === "degraded")) return "degraded";
  return "healthy";
}

export function aggregateReadinessStatus(
  checks: Record<string, HealthCheck>,
): "ready" | "degraded" | "not_ready" {
  const values = Object.values(checks);
  if (values.some((c) => c.status === "unhealthy" && c.required !== false))
    return "not_ready";
  if (
    values.some(
      (c) =>
        c.status === "degraded" ||
        (c.status === "unhealthy" && c.required === false),
    )
  )
    return "degraded";
  return "ready";
}

// تشغيل الفحوصات بالتوازي مع سقف زمني لكل فحص
// =============================================
// المبدأ الهندسي
//
// التشغيل المتسلسل القديم (await بعد await) كان يجمع زمن كل الفحوصات،
// وأي فحص بطيء على خدمة خارجية يعلّق طلب الـ HTTP كله ويمنع الاستجابة
// في الوقت المتوقع. تحت ضغط خمسمائة وحدة افتراضية في stress كان هذا
// السبب المباشر لانفجار p95 إلى ستة آلاف وسبعمائة وتسع وثمانين ملّي ثانية.
//
// التشغيل المتوازي مع timeout لكل فحص يضمن أن زمن استجابة /api/health
// لا يتجاوز سقف الفحص الأبطأ (افتراضياً ألفان من الـ ملّي ثانية).
//
// المُذاكر بفترة قصيرة TtlMemoizer يضمن أن طلبات k6 المتزامنة
// لا تُكرّر نفس الحساب الثقيل، بل تشترك في نسخة واحدة من النتيجة
// خلال نافذة خمس عشرة ثانية. هذا حماية أساسية لاتصالات
// قاعدة البيانات و Redis والمزودات الخارجية.

async function collectHealthChecks(): Promise<Record<string, HealthCheck>> {
  const [
    database,
    database_schema,
    redis,
    external_services,
    weaviate,
    editor,
  ] = await Promise.all([
    withCheckTimeout(checkDatabase(), "database", HEALTH_CHECK_TIMEOUT_MS),
    withCheckTimeout(
      checkDatabaseSchema(),
      "database_schema",
      HEALTH_CHECK_TIMEOUT_MS,
    ),
    withCheckTimeout(checkRedis(), "redis", HEALTH_CHECK_TIMEOUT_MS),
    withCheckTimeout(
      checkExternalServices(),
      "external_services",
      HEALTH_CHECK_TIMEOUT_MS,
    ),
    withCheckTimeout(checkWeaviate(), "weaviate", HEALTH_CHECK_TIMEOUT_MS),
    withCheckTimeout(
      checkEditorIntegration(),
      "editor",
      HEALTH_CHECK_TIMEOUT_MS,
    ),
  ]);

  return {
    database,
    database_schema,
    redis,
    memory: checkMemory(),
    external_services,
    weaviate,
    editor,
    analytics: checkAnalyticsPersistence(),
  };
}

async function collectReadinessChecks(): Promise<Record<string, HealthCheck>> {
  const [
    database,
    database_schema,
    redis,
    external_services,
    weaviate,
    editor,
  ] = await Promise.all([
    withCheckTimeout(checkDatabase(), "database", HEALTH_CHECK_TIMEOUT_MS),
    withCheckTimeout(
      checkDatabaseSchema(),
      "database_schema",
      HEALTH_CHECK_TIMEOUT_MS,
    ),
    withCheckTimeout(checkRedis(), "redis", HEALTH_CHECK_TIMEOUT_MS),
    withCheckTimeout(
      checkExternalServices(),
      "external_services",
      HEALTH_CHECK_TIMEOUT_MS,
    ),
    withCheckTimeout(checkWeaviate(), "weaviate", HEALTH_CHECK_TIMEOUT_MS),
    withCheckTimeout(
      checkEditorIntegration(),
      "editor",
      HEALTH_CHECK_TIMEOUT_MS,
    ),
  ]);

  return {
    database,
    database_schema,
    redis,
    external_services,
    weaviate,
    editor,
    analytics: checkAnalyticsPersistence(),
  };
}

async function collectDetailedChecks(): Promise<Record<string, HealthCheck>> {
  const [
    database,
    database_schema,
    redis,
    disk,
    external_services,
    weaviate,
    editor,
  ] = await Promise.all([
    withCheckTimeout(checkDatabase(), "database", HEALTH_CHECK_TIMEOUT_MS),
    withCheckTimeout(
      checkDatabaseSchema(),
      "database_schema",
      HEALTH_CHECK_TIMEOUT_MS,
    ),
    withCheckTimeout(checkRedis(), "redis", HEALTH_CHECK_TIMEOUT_MS),
    withCheckTimeout(checkDisk(), "disk", HEALTH_CHECK_TIMEOUT_MS),
    withCheckTimeout(
      checkExternalServices(),
      "external_services",
      HEALTH_CHECK_TIMEOUT_MS,
    ),
    withCheckTimeout(checkWeaviate(), "weaviate", HEALTH_CHECK_TIMEOUT_MS),
    withCheckTimeout(
      checkEditorIntegration(),
      "editor",
      HEALTH_CHECK_TIMEOUT_MS,
    ),
  ]);

  return {
    database,
    database_schema,
    redis,
    memory: checkMemory(),
    disk,
    external_services,
    environment: checkEnvironment(),
    weaviate,
    editor,
    analytics: checkAnalyticsPersistence(),
  };
}

const healthChecksMemoizer = new TtlMemoizer<Record<string, HealthCheck>>(
  collectHealthChecks,
  HEALTH_AGGREGATE_TTL_MS,
);

const readinessChecksMemoizer = new TtlMemoizer<Record<string, HealthCheck>>(
  collectReadinessChecks,
  HEALTH_AGGREGATE_TTL_MS,
);

const detailedChecksMemoizer = new TtlMemoizer<Record<string, HealthCheck>>(
  collectDetailedChecks,
  HEALTH_AGGREGATE_TTL_MS,
);

export async function performHealthChecks(
  startTime: number,
): Promise<HealthStatus> {
  const checks = await healthChecksMemoizer.get();

  return {
    status: aggregateHealthStatus(checks),
    timestamp: new Date().toISOString(),
    version: process.env.npm_package_version ?? "1.0.0",
    uptime: Date.now() - startTime,
    checks,
  };
}

export async function performReadinessChecks(): Promise<ReadinessStatus> {
  const checks = await readinessChecksMemoizer.get();

  return {
    status: aggregateReadinessStatus(checks),
    timestamp: new Date().toISOString(),
    checks,
  };
}

export async function performDetailedHealthChecks(
  startTime: number,
): Promise<DetailedHealthStatus> {
  const checks = await detailedChecksMemoizer.get();

  return {
    status: aggregateHealthStatus(checks),
    timestamp: new Date().toISOString(),
    version: process.env.npm_package_version ?? "1.0.0",
    uptime: Date.now() - startTime,
    environment: process.env.NODE_ENV ?? "development",
    checks,
  };
}

/**
 * يُسقط ذاكرة الفحوصات المُذاكَرة فوراً.
 * مخصّص للاستخدام في اختبارات التكامل لضمان عدم تسرّب حالة بين اختبارات.
 */
export function invalidateHealthChecksCache(): void {
  healthChecksMemoizer.invalidate();
  readinessChecksMemoizer.invalidate();
  detailedChecksMemoizer.invalidate();
}
