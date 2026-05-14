# Configuration Guide

## Environment Variables

### Required Variables

| Variable | Description | Example |
|---|---|---|
| `DATABASE_URL` | PostgreSQL connection string | `postgresql://user:password@localhost:5432/thecopy` |
| `REDIS_URL` | Redis connection string | `redis://localhost:6379` |
| `JWT_SECRET` | JWT signing secret | `your-very-secure-secret-key` |
| `GEMINI_API_KEY` | Google Gemini API key | `AIzaSy...` |
| `NODE_ENV` | Environment mode | `development`, `production`, `test` |

### Optional Variables

| Variable | Description | Default |
|---|---|---|
| `PORT` | Backend server port | `3001` |
| `FRONTEND_URL` | Frontend URL for CORS | `http://localhost:3000` |
| `LOG_LEVEL` | Logging level | `info` |
| `RATE_LIMIT_WINDOW` | Rate limit window (ms) | `60000` |
| `RATE_LIMIT_MAX` | Max requests per window | `300` |
| `JWT_EXPIRES_IN` | JWT expiration time | `1h` |
| `SESSION_SECRET` | Session secret | Randomly generated |
| `ENABLE_ANALYTICS` | Enable analytics tracking | `false` |
| `MAX_FILE_SIZE` | Maximum file upload size | `10mb` |
| `QUEUE_CONCURRENCY` | Background job concurrency | `5` |

### Example `.env` File

```env
# Database Configuration
DATABASE_URL=postgresql://thecopy:securepassword@localhost:5432/thecopy
REDIS_URL=redis://localhost:6379/0

# Security Configuration
JWT_SECRET=your-very-secure-secret-key-here
SESSION_SECRET=another-very-secure-secret-key

# API Configuration
GEMINI_API_KEY=AIzaSyYourGeminiAPIKeyHere
NODE_ENV=development
PORT=3001
FRONTEND_URL=http://localhost:3000

# Logging Configuration
LOG_LEVEL=debug

# Rate Limiting
RATE_LIMIT_WINDOW=60000
RATE_LIMIT_MAX=300

# File Uploads
MAX_FILE_SIZE=10mb

# Background Jobs
QUEUE_CONCURRENCY=5

# Features
ENABLE_ANALYTICS=false
```

## Configuration Files

### Database Configuration

**`apps/backend/src/config/database.config.ts`:**
```typescript
import { config } from '@/lib/config';

export const databaseConfig = {
  url: config.DATABASE_URL,
  pool: {
    min: 2,
    max: 10,
    acquire: 30000,
    idle: 10000
  },
  migrations: {
    table: 'drizzle_migrations',
    path: './drizzle'
  }
};
```

### Redis Configuration

**`apps/backend/src/config/redis.config.ts`:**
```typescript
import { config } from '@/lib/config';

export const redisConfig = {
  url: config.REDIS_URL,
  socket: {
    reconnectStrategy: (retries) => Math.min(retries * 100, 5000)
  },
  cache: {
    ttl: 3600, // 1 hour default
    max: 1000 // max items
  }
};
```

### JWT Configuration

**`apps/backend/src/config/auth.config.ts`:**
```typescript
import { config } from '@/lib/config';

export const authConfig = {
  jwt: {
    secret: config.JWT_SECRET,
    expiresIn: config.JWT_EXPIRES_IN || '1h',
    issuer: 'thecopy-platform'
  },
  session: {
    secret: config.SESSION_SECRET || 'fallback-secret',
    maxAge: 24 * 60 * 60 * 1000 // 24 hours
  },
  rateLimiting: {
    windowMs: parseInt(config.RATE_LIMIT_WINDOW || '60000'),
    max: parseInt(config.RATE_LIMIT_MAX || '300')
  }
};
```

### API Configuration

**`apps/backend/src/config/api.config.ts`:**
```typescript
import { config } from '@/lib/config';

export const apiConfig = {
  baseUrl: config.BASE_URL || 'http://localhost:3001',
  frontendUrl: config.FRONTEND_URL || 'http://localhost:3000',
  cors: {
    origin: [config.FRONTEND_URL || 'http://localhost:3000'],
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
    credentials: true
  },
  pagination: {
    defaultLimit: 20,
    maxLimit: 100
  }
};
```

### Queue Configuration

**`apps/backend/src/config/queue.config.ts`:**
```typescript
import { config } from '@/lib/config';

export const queueConfig = {
  connection: config.REDIS_URL,
  defaultQueue: {
    name: 'default',
    concurrency: parseInt(config.QUEUE_CONCURRENCY || '5'),
    limiter: {
      max: 100,
      duration: 1000
    }
  },
  queues: [
    {
      name: 'analysis',
      concurrency: 3,
      limiter: {
        max: 50,
        duration: 1000
      }
    },
    {
      name: 'generation',
      concurrency: 2,
      limiter: {
        max: 30,
        duration: 1000
      }
    }
  ]
};
```

## Feature Flags

### Feature Flag Configuration

**`apps/backend/src/config/features.config.ts`:**
```typescript
import { config } from '@/lib/config';

export const featureFlags = {
  // AI Features
  enhancedCharacterAI: config.ENABLE_ENHANCED_CHARACTER_AI === 'true',
  advancedDialogueAnalysis: config.ENABLE_ADVANCED_DIALOGUE === 'true',
  realtimeCollaboration: config.ENABLE_REALTIME_COLLAB === 'true',

  // Experimental Features
  newAnalysisEngine: config.ENABLE_NEW_ANALYSIS_ENGINE === 'true',
  budgetCalculationV2: config.ENABLE_BUDGET_V2 === 'true',

  // UI Features
  darkMode: true,
  advancedEditor: config.ENABLE_ADVANCED_EDITOR === 'true',

  // Analytics
  usageAnalytics: config.ENABLE_ANALYTICS === 'true',
  errorReporting: true
};
```

### Using Feature Flags

```typescript
import { featureFlags } from '@/config/features.config';

if (featureFlags.enhancedCharacterAI) {
  // Use enhanced character AI
  const result = await enhancedCharacterAnalysis(text);
} else {
  // Use standard character AI
  const result = await standardCharacterAnalysis(text);
}
```

## Logging Configuration

### Logger Configuration

**`apps/backend/src/config/logger.config.ts`:**
```typescript
import { config } from '@/lib/config';

export const loggerConfig = {
  level: config.LOG_LEVEL || 'info',
  format: 'json',
  transports: {
    console: true,
    file: {
      enabled: config.NODE_ENV === 'production',
      path: './logs',
      maxSize: '100m',
      maxFiles: '7'
    }
  },
  redaction: {
    paths: ['password', 'token', 'apiKey'],
    remove: true
  }
};
```

### Logging Levels

| Level | Usage |
|---|---|
| `error` | Critical failures and errors |
| `warn` | Potential issues and warnings |
| `info` | General operational messages |
| `debug` | Detailed debugging information |
| `trace` | Very detailed tracing |

## Configuration Management

### Configuration Loading

**`apps/backend/src/lib/config.ts`:**
```typescript
import { cleanEnv, str } from 'envalid';

export const config = cleanEnv(process.env, {
  DATABASE_URL: str(),
  REDIS_URL: str(),
  JWT_SECRET: str(),
  GEMINI_API_KEY: str(),
  NODE_ENV: str({ choices: ['development', 'production', 'test'], default: 'development' }),
  PORT: str({ default: '3001' }),
  FRONTEND_URL: str({ default: 'http://localhost:3000' }),
  LOG_LEVEL: str({ choices: ['error', 'warn', 'info', 'debug', 'trace'], default: 'info' }),
  RATE_LIMIT_WINDOW: str({ default: '60000' }),
  RATE_LIMIT_MAX: str({ default: '300' }),
  JWT_EXPIRES_IN: str({ default: '1h' }),
  SESSION_SECRET: str({ default: 'fallback-secret' }),
  ENABLE_ANALYTICS: str({ default: 'false' }),
  MAX_FILE_SIZE: str({ default: '10mb' }),
  QUEUE_CONCURRENCY: str({ default: '5' })
});
```

### Configuration Validation

The system uses `envalid` for environment variable validation:

1. **Required variables** must be present
2. **Type validation** ensures correct types
3. **Default values** provided for optional variables
4. **Runtime validation** on startup

## Deployment Configuration

### Production Configuration

**`apps/backend/src/config/production.config.ts`:**
```typescript
import { config } from '@/lib/config';

export const productionConfig = {
  security: {
    helmet: true,
    csp: {
      directives: {
        defaultSrc: ["'self'"],
        scriptSrc: ["'self'", "'unsafe-inline'", 'cdn.example.com'],
        styleSrc: ["'self'", "'unsafe-inline'", 'fonts.googleapis.com'],
        imgSrc: ["'self'", 'data:', 'cdn.example.com'],
        fontSrc: ["'self'", 'fonts.gstatic.com'],
        objectSrc: ["'none'"],
        upgradeInsecureRequests: []
      }
    },
    hsts: {
      maxAge: 31536000,
      includeSubDomains: true,
      preload: true
    }
  },
  performance: {
    compression: true,
    cacheControl: {
      maxAge: 3600,
      staleWhileRevalidate: 600
    }
  },
  monitoring: {
    healthChecks: true,
    metrics: true,
    tracing: config.ENABLE_TRACING === 'true'
  }
};
```

### Development Configuration

**`apps/backend/src/config/development.config.ts`:**
```typescript
export const developmentConfig = {
  security: {
    helmet: false,
    csp: false
  },
  performance: {
    compression: false
  },
  monitoring: {
    healthChecks: true,
    metrics: false,
    tracing: false
  },
  debugging: {
    detailedErrors: true,
    stackTraces: true,
    requestLogging: true
  }
};
```

## Configuration Best Practices

### Security Best Practices

1. **Never commit secrets** to version control
2. **Use different secrets** for different environments
3. **Rotate secrets** regularly
4. **Limit access** to production configuration
5. **Use secret management** tools in production

### Performance Best Practices

1. **Connection pooling** for databases
2. **Appropriate timeouts** for external services
3. **Caching configuration** for frequent operations
4. **Queue concurrency** based on workload
5. **Rate limiting** to prevent abuse

### Maintainability Best Practices

1. **Document all configuration** options
2. **Use sensible defaults** for optional settings
3. **Validate configuration** on startup
4. **Environment-specific** configuration files
5. **Version control** for configuration changes

## Configuration Files Reference

### Main Configuration Files

| File | Purpose |
|---|---|
| `.env` | Environment variables |
| `.env.example` | Example environment variables |
| `apps/backend/src/config/*.ts` | Application configuration |
| `apps/frontend/src/config/*.ts` | Frontend configuration |
| `docker-compose.yml` | Docker configuration |
| `package.json` | Project configuration |

### Configuration File Locations

```
thecopy-platform/
├── .env                # Environment variables
├── .env.example        # Example environment variables
├── docker-compose.yml   # Docker configuration
├── package.json        # Project configuration
└── apps/
    ├── backend/
    │   └── src/config/  # Backend configuration
    └── frontend/
        └── src/config/  # Frontend configuration
```

## Troubleshooting Configuration

### Common Configuration Issues

| Issue | Solution |
|---|---|
| **Missing environment variables** | Check `.env` file against `.env.example` |
| **Database connection failed** | Verify `DATABASE_URL` format and credentials |
| **Redis connection failed** | Check `REDIS_URL` and Redis service status |
| **Invalid JWT secret** | Ensure `JWT_SECRET` is set and not empty |
| **CORS errors** | Verify `FRONTEND_URL` matches your frontend origin |
| **Rate limiting issues** | Check `RATE_LIMIT_*` variables |
| **Feature flags not working** | Verify environment variable values |

### Configuration Validation

```bash
# Validate configuration
pnpm run config:validate

# Check environment variables
pnpm run env:check

# Test database connection
pnpm run db:test-connection

# Test Redis connection
pnpm run redis:test-connection
```

## Configuration Examples

### Production Example

```env
# Production Configuration
NODE_ENV=production
PORT=8080
DATABASE_URL=postgresql://prod_user:secure@db.example.com:5432/thecopy_prod
REDIS_URL=redis://redis.example.com:6379/0
JWT_SECRET=very-secure-production-secret-1234567890
GEMINI_API_KEY=AIzaSyProductionKey1234567890
FRONTEND_URL=https://app.thecopyplatform.com
LOG_LEVEL=info
RATE_LIMIT_WINDOW=60000
RATE_LIMIT_MAX=300
ENABLE_ANALYTICS=true
QUEUE_CONCURRENCY=10
```

### Development Example

```env
# Development Configuration
NODE_ENV=development
PORT=3001
DATABASE_URL=postgresql://dev_user:devpass@localhost:5432/thecopy_dev
REDIS_URL=redis://localhost:6379/1
JWT_SECRET=development-secret-key
GEMINI_API_KEY=AIzaSyDevelopmentKey1234567890
FRONTEND_URL=http://localhost:3000
LOG_LEVEL=debug
RATE_LIMIT_WINDOW=60000
RATE_LIMIT_MAX=1000
ENABLE_ANALYTICS=false
QUEUE_CONCURRENCY=2
```

### Testing Example

```env
# Testing Configuration
NODE_ENV=test
PORT=3002
DATABASE_URL=postgresql://test_user:testpass@localhost:5433/thecopy_test
REDIS_URL=redis://localhost:6380/2
JWT_SECRET=test-secret-key
GEMINI_API_KEY=AIzaSyTestKey1234567890
FRONTEND_URL=http://localhost:3001
LOG_LEVEL=error
RATE_LIMIT_WINDOW=60000
RATE_LIMIT_MAX=10000
ENABLE_ANALYTICS=false
QUEUE_CONCURRENCY=1
```

## Configuration Management Tools

### Recommended Tools

| Tool | Purpose | Usage |
|---|---|---|
| **dotenv** | Environment variable loading | Built-in |
| **envalid** | Environment validation | Built-in |
| **AWS Secrets Manager** | Production secret management | `aws secretsmanager` |
| **HashiCorp Vault** | Enterprise secret management | `vault` CLI |
| **Docker Secrets** | Container secret management | Docker compose |
| **GitHub Secrets** | CI/CD secret management | GitHub Actions |

### Using AWS Secrets Manager

```typescript
import { SecretsManager } from 'aws-sdk';

async function loadSecretsFromAWS() {
  const secretsManager = new SecretsManager();
  const secret = await secretsManager.getSecretValue({
    SecretId: 'thecopy-platform/production'
  }).promise();

  if (secret.SecretString) {
    const secrets = JSON.parse(secret.SecretString);
    process.env.DATABASE_URL = secrets.DATABASE_URL;
    process.env.JWT_SECRET = secrets.JWT_SECRET;
    // Load other secrets
  }
}
```

## Contact Information

### Configuration Support

| Issue | Contact |
|---|---|
| **Configuration Questions** | config-support@thecopyplatform.com |
| **Production Configuration** | devops@thecopyplatform.com |
| **Security Configuration** | security@thecopyplatform.com |
| **Performance Tuning** | perf-team@thecopyplatform.com |

### Resources

- **dotenv Documentation**: https://github.com/motdotla/dotenv
- **envalid Documentation**: https://github.com/af/envalid
- **12 Factor App**: https://12factor.net/config
- **AWS Secrets Manager**: https://aws.amazon.com/secrets-manager

## Complete Environment Variables Reference

All variables defined in `.env.example`, grouped by category.

### Redis Configuration

| Variable | Description | Default |
|---|---|---|
| `REDIS_HOST` | Redis server hostname | `localhost` |
| `REDIS_PORT` | Redis server port | `6379` |
| `REDIS_ENABLED` | Enable/disable Redis features | `true` |
| `REDIS_SENTINEL_ENABLED` | Enable Redis Sentinel for high availability | `false` |

### CORS Configuration

| Variable | Description | Default |
|---|---|---|
| `CORS_ORIGIN` | Comma-separated list of allowed origins | `http://localhost:5000,http://localhost:9002` |
| `ALLOWED_DEV_ORIGIN` | Allowed origin for development mode | `http://localhost:5000` |

### Rate Limiting

| Variable | Description | Default |
|---|---|---|
| `RATE_LIMIT_WINDOW_MS` | Rate limit window in milliseconds | `900000` |
| `RATE_LIMIT_MAX_REQUESTS` | Maximum requests allowed per window | `100` |

### AI Configuration

| Variable | Description | Default |
|---|---|---|
| `GOOGLE_GENAI_API_KEY` | Google Gemini API key (alias for `GEMINI_API_KEY`) | — |
| `AGENT_REVIEW_MODEL` | AI model for the agent review layer (`provider:model`) | `google-genai:gemini-2.5-flash` |
| `FINAL_REVIEW_MODEL` | AI model for final review pass | `google-genai:gemini-2.5-flash` |
| `FINAL_REVIEW_FALLBACK_MODEL` | Fallback model when `FINAL_REVIEW_MODEL` fails | — |
| `AI_DOUBT_ENABLED` | Enable AI doubt/uncertainty feature | `false` |

### Tiptap Pro

| Variable | Description |
|---|---|
| `TIPTAP_PRO_TOKEN` | Tiptap Pro authentication token (required to install `@tiptap-pro` packages) |

### Frontend Variables (`NEXT_PUBLIC_*`)

| Variable | Description | Default |
|---|---|---|
| `NEXT_PUBLIC_APP_ENV` | Application environment label | `development` |
| `NEXT_PUBLIC_ENVIRONMENT` | Environment name exposed to the browser | `development` |
| `NEXT_PUBLIC_API_URL` | Backend API base URL | `http://localhost:3001` |
| `NEXT_PUBLIC_BACKEND_URL` | Backend base URL for client-side requests | `http://localhost:3001` |
| `NEXT_PUBLIC_FILE_IMPORT_BACKEND_URL` | File import endpoint URL | `http://localhost:3001/api/file-extract` |
| `NEXT_PUBLIC_FINAL_REVIEW_BACKEND_URL` | Final review endpoint URL | `http://localhost:3001/api/final-review` |
| `NEXT_PUBLIC_AI_DOUBT_ENABLED` | Enable AI doubt feature in the frontend | `false` |
| `NEXT_PUBLIC_ENABLE_CDN` | Serve static assets from a CDN | `false` |
| `NEXT_PUBLIC_TRACING_ENABLED` | Enable browser-side OpenTelemetry tracing | `false` |
| `NEXT_PUBLIC_SERVICE_NAME` | Frontend service name used in traces | `thecopy-frontend` |
| `NEXT_PUBLIC_APP_VERSION` | Application version string | `1.0.0` |

### Firebase Authentication

| Variable | Description |
|---|---|
| `NEXT_PUBLIC_FIREBASE_API_KEY` | Firebase API key |
| `NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN` | Firebase authentication domain |
| `NEXT_PUBLIC_FIREBASE_PROJECT_ID` | Firebase project ID |
| `NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET` | Firebase Cloud Storage bucket |
| `NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID` | Firebase Cloud Messaging sender ID |
| `NEXT_PUBLIC_FIREBASE_APP_ID` | Firebase application ID |
| `NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID` | Firebase Analytics measurement ID |

### OpenTelemetry — Backend

| Variable | Description | Default |
|---|---|---|
| `TRACING_ENABLED` | Enable backend OpenTelemetry tracing | `false` |
| `SERVICE_NAME` | Backend service name reported in traces | `thecopy-backend` |

### File Import Service

| Variable | Description | Default |
|---|---|---|
| `FILE_IMPORT_HOST` | Hostname for the file import service | `127.0.0.1` |
| `FILE_IMPORT_PORT` | Port for the file import service | `3001` |

### PDF OCR Agent

| Variable | Description | Default |
|---|---|---|
| `PDF_EXTRACTOR_MODE` | PDF extraction strategy | `mistral-script-strict` |
| `MISTRAL_PAGEWISE_CORRECTION_ENABLED` | Enable per-page Mistral correction pass | `true` |
| `PDF_OCR_AGENT_ENABLED` | Enable the PDF OCR agent pipeline | `true` |
| `PDF_OCR_AGENT_TIMEOUT_MS` | Maximum time for a single OCR job (ms) | `600000` |
| `PDF_OCR_AGENT_PAGES` | Which pages to process (`all` or range) | `all` |
| `PDF_OCR_AGENT_CLASSIFY_ENABLED` | Enable page-type classification step | `true` |
| `PDF_OCR_AGENT_ENHANCE_ENABLED` | Enable image enhancement before OCR | `true` |
| `PDF_OCR_ENABLE_VISION_PROOFREAD` | Enable vision model proofreading pass | `false` |
| `OPEN_PDF_AGENT_VERIFY_FOOTPRINT` | Verify PDF footprint before processing | `false` |
| `OPEN_PDF_AGENT_ENABLE_MCP_STAGE` | Enable MCP stage in the PDF agent | `true` |

### Mistral HTTP Tuning

| Variable | Description | Default |
|---|---|---|
| `MISTRAL_HTTP_TIMEOUT_MS` | HTTP request timeout for Mistral API calls | `120000` |
| `MISTRAL_HTTP_MAX_RETRIES` | Maximum retry attempts on Mistral errors | `2` |
| `MISTRAL_HTTP_RETRY_BASE_MS` | Base delay for Mistral retry backoff (ms) | `500` |
| `MISTRAL_BATCH_TIMEOUT_SEC` | Timeout for Mistral batch jobs (seconds) | `300` |
| `MISTRAL_BATCH_POLL_INTERVAL_SEC` | Polling interval for batch status (seconds) | `3` |

### Vector Stores (RAG)

| Variable | Description | Default |
|---|---|---|
| `WEAVIATE_URL` | Weaviate vector store URL | `http://localhost:8080` |
| `WEAVIATE_REQUIRED` | Fail startup if Weaviate is unavailable | `false` |
| `QDRANT_URL` | Qdrant vector store URL | `http://localhost:6333` |
| `PERSISTENT_MEMORY_INFRA_REQUIRED` | Require persistent memory infrastructure on startup | `false` |
| `MEMORY_INFRA_REQUIRED` | Require memory infrastructure on startup | `false` |

### Build Configuration

| Variable | Description | Default |
|---|---|---|
| `ANALYZE` | Enable Next.js bundle analyzer | `false` |
| `SKIP_ENV_VALIDATION` | Skip environment validation during build | `false` |

_meta:
- last_commit: 611b9381dcc0d2254c094172bcca1c7edf12fa67
- date: 2026-05-11
- reference: docs/CONFIGURATION.md:1-200