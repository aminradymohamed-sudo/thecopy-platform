/// <reference types="node" />

declare namespace NodeJS {
  interface ProcessEnv {
    // Runtime
    NODE_ENV: "development" | "production" | "test";
    NEXT_RUNTIME?: "edge" | "nodejs" | undefined;
    CI?: string | undefined;
    PORT?: string | undefined;
    API_PORT?: string | undefined;
    ANALYZE?: string | undefined;
    NEXT_OUTPUT_MODE?: string | undefined;
    NEXT_PUBLIC_APP_URL?: string | undefined;
    NEXT_PUBLIC_APP_VERSION?: string | undefined;
    NEXT_PUBLIC_ENVIRONMENT?: string | undefined;
    NEXT_PUBLIC_SERVICE_NAME?: string | undefined;
    NAPI_RS_NATIVE_LIBRARY_PATH?: string | undefined;
    VERCEL?: string | undefined;
    VERCEL_URL?: string | undefined;
    VERCEL_ENV?: "production" | "preview" | "development" | undefined;

    // Public frontend endpoints
    NEXT_PUBLIC_API_URL?: string | undefined;
    NEXT_PUBLIC_BACKEND_URL?: string | undefined;
    NEXT_PUBLIC_BREAKAPP_API_URL?: string | undefined;
    NEXT_PUBLIC_CDN_URL?: string | undefined;
    NEXT_PUBLIC_ENABLE_CDN?: string | undefined;
    NEXT_PUBLIC_SOCKET_URL?: string | undefined;
    NEXT_PUBLIC_FILE_IMPORT_BACKEND_URL?: string | undefined;
    NEXT_PUBLIC_FINAL_REVIEW_BACKEND_URL?: string | undefined;
    NEXT_PUBLIC_AI_CONTEXT_ENDPOINT?: string | undefined;
    NEXT_PUBLIC_AI_CONTEXT_ENABLED?: string | undefined;
    NEXT_PUBLIC_OCR_PROVIDER?: string | undefined;
    NEXT_PUBLIC_OTEL_AUTH_TOKEN?: string | undefined;
    NEXT_PUBLIC_OTEL_EXPORTER_OTLP_ENDPOINT?: string | undefined;
    NEXT_PUBLIC_TRACING_ENABLED?: string | undefined;
    NEXT_PUBLIC_LOG_LEVEL?: string | undefined;

    // Backend and service URLs
    BACKEND_URL?: string | undefined;
    ALLOWED_DEV_ORIGIN?: string | undefined;
    EDITOR_RUNTIME_BASE_URL?: string | undefined;
    FILE_IMPORT_BACKEND_URL?: string | undefined;
    FILE_IMPORT_ALLOWED_ORIGINS?: string | undefined;
    APP_BASE_URL?: string | undefined;
    BUDGET_SERVICE_URL?: string | undefined;
    E2E_BACKEND_BASE_URL?: string | undefined;
    E2E_HOST?: string | undefined;
    E2E_PORT?: string | undefined;
    E2E_TARGET_URL?: string | undefined;

    // AI and model credentials
    ANTHROPIC_API_KEY?: string | undefined;
    ANTHROPIC_REVIEW_MODEL?: string | undefined;
    OPENAI_API_KEY?: string | undefined;
    OPENROUTER_API_KEY?: string | undefined;
    GROQ_API_KEY?: string | undefined;
    GEMINI_API_KEY?: string | undefined;
    GEMINI_API_KEY_PROD?: string | undefined;
    GEMINI_API_KEY_STAGING?: string | undefined;
    GOOGLE_GENAI_API_KEY?: string | undefined;
    NEXT_PUBLIC_GEMINI_API_KEY?: string | undefined;
    NEXT_PUBLIC_GEMINI_MODEL?: string | undefined;
    NEXT_PUBLIC_MISTRAL_API_KEY?: string | undefined;
    MISTRAL_API_KEY?: string | undefined;
    MISTRAL_BASE_URL?: string | undefined;
    MISTRAL_OCR_MODEL?: string | undefined;
    MISTRAL_OCR_ENDPOINT?: string | undefined;
    MISTRAL_OCR_TABLE_FORMAT?: string | undefined;
    MISTRAL_BATCH_TIMEOUT_SEC?: string | undefined;
    MISTRAL_BATCH_POLL_INTERVAL_SEC?: string | undefined;
    MISTRAL_ANNOTATION_SCHEMA_PATH?: string | undefined;
    MISTRAL_ANNOTATION_PROMPT?: string | undefined;
    MISTRAL_ANNOTATION_OUTPUT_PATH?: string | undefined;
    MISTRAL_HTTP_TIMEOUT_MS?: string | undefined;
    MISTRAL_HTTP_MAX_RETRIES?: string | undefined;
    MISTRAL_HTTP_RETRY_BASE_MS?: string | undefined;
    MOONSHOT_API_KEY?: string | undefined;
    KIMI_BASE_URL?: string | undefined;
    KIMI_HTTP_TIMEOUT_MS?: string | undefined;
    KIMI_HTTP_MAX_RETRIES?: string | undefined;
    KIMI_THINKING_MODE?: string | undefined;
    AGENT_REVIEW_MODEL?: string | undefined;
    AGENT_REVIEW_MOCK_MODE?: string | undefined;
    FINAL_REVIEW_MODEL?: string | undefined;
    FINAL_REVIEW_FALLBACK_MODEL?: string | undefined;
    FINAL_REVIEW_MOCK_MODE?: string | undefined;

    // OCR and PDF pipeline
    PRE_OCR_LANG?: string | undefined;
    PDF_OCR_AGENT_ROOT?: string | undefined;
    PDF_OCR_AGENT_OPEN_SCRIPT_PATH?: string | undefined;
    PDF_OCR_AGENT_OCR_SCRIPT_PATH?: string | undefined;
    PDF_OCR_AGENT_CLASSIFY_SCRIPT_PATH?: string | undefined;
    PDF_OCR_AGENT_ENHANCE_SCRIPT_PATH?: string | undefined;
    PDF_OCR_AGENT_WRITE_OUTPUT_SCRIPT_PATH?: string | undefined;
    PDF_OCR_AGENT_ENABLED?: string | undefined;
    PDF_OCR_AGENT_TIMEOUT_MS?: string | undefined;
    PDF_OCR_AGENT_PAGES?: string | undefined;
    PDF_OCR_AGENT_LOG_LEVEL?: string | undefined;
    PDF_OCR_AGENT_MOCK_MODE?: string | undefined;
    PDF_OCR_AGENT_MOCK_TEXT?: string | undefined;
    PDF_OCR_AGENT_MOCK_FORCE_REJECT?: string | undefined;
    PDF_OCR_AGENT_CLASSIFY_ENABLED?: string | undefined;
    PDF_OCR_AGENT_ENHANCE_ENABLED?: string | undefined;
    PDF_OCR_EXTERNAL_REFERENCE_PATH?: string | undefined;
    PDF_OCR_ENABLE_VISION_PROOFREAD?: string | undefined;
    PDF_OCR_ENABLE_VISION_QA?: string | undefined;
    PDF_OCR_MISTRAL_REQUEST_ADAPTER_PATH?: string | undefined;
    PDF_VISION_COMPARE_MODEL?: string | undefined;
    PDF_VISION_COMPARE_TIMEOUT_MS?: string | undefined;
    PDF_VISION_JUDGE_MODEL?: string | undefined;
    PDF_VISION_JUDGE_TIMEOUT_MS?: string | undefined;
    PDF_VISION_PROOFREAD_MODEL?: string | undefined;
    PDF_VISION_PROOFREAD_TIMEOUT_MS?: string | undefined;
    PDF_VISION_RENDER_DPI?: string | undefined;
    OPEN_PDF_AGENT_VERIFY_FOOTPRINT?: string | undefined;
    OPEN_PDF_AGENT_ENABLE_MCP_STAGE?: string | undefined;

    // Python and toolchain
    PYTHON?: string | undefined;
    PYTHON_BIN?: string | undefined;
    PYTHON_EXECUTABLE?: string | undefined;
    KARANK_PYTHON_BIN?: string | undefined;
    KARANK_PYTHON_VERSION?: string | undefined;
    POPPLER_BIN?: string | undefined;
    ANTIWORD_PATH?: string | undefined;
    ANTIWORDHOME?: string | undefined;
    DOCX_ENGINE_FAST_TIMEOUT_MS?: string | undefined;
    FORCE_CPU_ONLY?: string | undefined;
    CUDA_VISIBLE_DEVICES?: string | undefined;

    // Storage and infrastructure
    DATABASE_URL?: string | undefined;
    POSTGRES_URL?: string | undefined;
    POSTGRES_PRISMA_URL?: string | undefined;
    POSTGRES_URL_NON_POOLING?: string | undefined;
    DATABASE_HOST?: string | undefined;
    DATABASE_USER?: string | undefined;
    DATABASE_PASSWORD?: string | undefined;
    REDIS_URL?: string | undefined;
    REDIS_ENABLED?: string | undefined;
    UPSTASH_REDIS_REST_URL?: string | undefined;
    UPSTASH_REDIS_REST_TOKEN?: string | undefined;
    STORAGE_URL?: string | undefined;
    STORAGE_BUCKET?: string | undefined;
    QDRANT_URL?: string | undefined;
    QDRANT_API_KEY?: string | undefined;

    // Auth and security
    NEXTAUTH_URL?: string | undefined;
    NEXTAUTH_SECRET?: string | undefined;
    AUTH_SECRET?: string | undefined;
    SESSION_SECRET?: string | undefined;
    JWT_SECRET?: string | undefined;
    ENCRYPTION_KEY?: string | undefined;
    DB_PASSWORD?: string | undefined;
    STRIPE_API_KEY?: string | undefined;

    // Analytics and observability
    NEXT_PUBLIC_GA_MEASUREMENT_ID?: string | undefined;
    NEXT_PUBLIC_GOOGLE_ANALYTICS?: string | undefined;
    NEXT_PUBLIC_GA4_MEASUREMENT_ID?: string | undefined;
    NEXT_PUBLIC_ENABLE_ANALYTICS?: string | undefined;
    NEXT_PUBLIC_ENABLE_OFFLINE?: string | undefined;
    NEXT_PUBLIC_SENTRY_DSN?: string | undefined;
    SENTRY_DSN?: string | undefined;
    SENTRY_AUTH_TOKEN?: string | undefined;
    SENTRY_ORG?: string | undefined;
    SENTRY_PROJECT?: string | undefined;

    // Misc feature flags
    ENABLE_TEST_DIAGNOSTIC_LOGS?: string | undefined;

    // Additional explicit environment keys used by web tooling
    AGENT_MAX_STEPS?: string | undefined;
    AGENT_MODEL?: string | undefined;
    ANALYSIS_E2E_BASE_URL?: string | undefined;
    API_KEY?: string | undefined;
    BREAKAPP_QR_E2E_BASE_URL?: string | undefined;
    BREAKAPP_QR_E2E_LOG_LEVEL?: string | undefined;
    BREAKAPP_QR_E2E_MOCK_BACKEND?: string | undefined;
    BREAKAPP_QR_E2E_ROUTE?: string | undefined;
    BREAKAPP_QR_E2E_TOKEN?: string | undefined;
    BREAKDOWN_E2E_ANALYSIS_TIMEOUT_MS?: string | undefined;
    BREAKDOWN_E2E_BASE_URL?: string | undefined;
    BREAKDOWN_E2E_LOG_LEVEL?: string | undefined;
    BREAKDOWN_E2E_MOCK?: string | undefined;
    BREAKDOWN_E2E_TIMEOUT_MS?: string | undefined;
    CINE_FIXTURE_MODE?: string | undefined;
    CINE_FIXTURE_PORT?: string | undefined;
    DEFAULT_INPUT_DIR?: string | undefined;
    DEFAULT_OUTPUT_DIR?: string | undefined;
    DIRECTORS_EDITOR_E2E?: string | undefined;
    EDITOR_REAL_TEST_BASE_URL?: string | undefined;
    EDITOR_REAL_TEST_E2E_TIMEOUT_MS?: string | undefined;
    EDITOR_REAL_TEST_ENABLE?: string | undefined;
    EDITOR_REAL_TEST_FILE_EXTRACT_URL?: string | undefined;
    EDITOR_REAL_TEST_FIXTURE_PATH?: string | undefined;
    EDITOR_REAL_TEST_IMPORT_WAIT_MS?: string | undefined;
    EDITOR_REAL_TEST_INTEGRATION_TIMEOUT_MS?: string | undefined;
    EDITOR_REAL_TEST_LOG_LEVEL?: string | undefined;
    LOG_LEVEL?: string | undefined;
    MCP_SERVER_PATH?: string | undefined;
    MISTRAL_OCR_TIMEOUT_MS?: string | undefined;
    NEXT_PUBLIC_APP_STATE_BASE_URL?: string | undefined;
    NEXT_PUBLIC_CINE_CAPTURE_HEIGHT?: string | undefined;
    NEXT_PUBLIC_CINE_CAPTURE_MIME?: string | undefined;
    NEXT_PUBLIC_CINE_CAPTURE_QUALITY?: string | undefined;
    NEXT_PUBLIC_CINE_CAPTURE_WIDTH?: string | undefined;
    NEXT_PUBLIC_CINE_IMAGE_MAX_MB?: string | undefined;
    NEXT_PUBLIC_CINE_VIDEO_MAX_MB?: string | undefined;
    NEXT_PUBLIC_CINEMATOGRAPHY_DIAGNOSTICS?: string | undefined;
    NEXT_PUBLIC_DIRECTORS_EDITOR_IMPORT_INTENT_QUERY_PARAM?: string | undefined;
    NEXT_PUBLIC_DIRECTORS_EDITOR_IMPORT_INTENT_VALUE?: string | undefined;
    NEXT_PUBLIC_DIRECTORS_EDITOR_PROJECT_QUERY_PARAM?: string | undefined;
    NEXT_PUBLIC_DIRECTORS_EDITOR_SOURCE_QUERY_PARAM?: string | undefined;
    NEXT_PUBLIC_DIRECTORS_EDITOR_SOURCE_VALUE?: string | undefined;
    NEXT_PUBLIC_E2E_DIAGNOSTICS?: string | undefined;
    NEXT_PUBLIC_ENABLE_BUDGET_REMOTE_STATE?: string | undefined;
    NEXT_PUBLIC_ENABLE_REMOTE_APP_STATE?: string | undefined;
    NEXT_PUBLIC_SENTRY_RELEASE?: string | undefined;
    NEXT_PUBLIC_VERCEL_GIT_COMMIT_SHA?: string | undefined;
    OPEN_PDF_AGENT_ENABLE_MCP_LLM_REVIEW?: string | undefined;
    OPEN_PDF_AGENT_LLM_MODEL?: string | undefined;
    OPEN_PDF_AGENT_LLM_REFERENCE_PATH?: string | undefined;
    PLAYWRIGHT_BASE_URL?: string | undefined;
    PLAYWRIGHT_PORT?: string | undefined;
    PUPPETEER_ALLOW_SANDBOX_FALLBACK?: string | undefined;
    PUPPETEER_DISABLE_SANDBOX?: string | undefined;
    PUPPETEER_EXECUTABLE_PATH?: string | undefined;
    RAILWAY_GIT_COMMIT_SHA?: string | undefined;
    RUN_BACKEND_E2E?: string | undefined;
    SENTRY_RELEASE?: string | undefined;
    STYLEIST_E2E_BASE_URL?: string | undefined;
    STYLEIST_E2E_ROUTE?: string | undefined;
    VERCEL_GIT_COMMIT_SHA?: string | undefined;
    VITEST_CHUNK_SIZE?: string | undefined;
    WEB_PORT?: string | undefined;

    [key: string]: string | undefined;
  }
}
