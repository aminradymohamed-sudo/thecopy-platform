# The Copy —_ منصة الإبداع السينمائي العربية

![Version](https://img.shields.io/badge/version-1.0.0-blue)
![CI Status](https://img.shields.io/badge/ci-passing-brightgreen)
![Test Coverage](https://img.shields.io/badge/coverage-85%-yellow)

منصة ويب عربية متكاملة للإبداع والإنتاج السينمائي. مستودع أحادي (Monorepo) يجمع تطبيق الويب (طبقة العرض)، الخادوم الخلفي (المسارات المؤمّنة والطوابير والعمليات المستقلة)، و7 حزم عمل مشتركة تعزل منطق الأدوات وواجهاتها القابلة لإعادة الاستخدام.

## Quick Start

### Requirements

| Tool | Required Version |
|---|---|
| Node.js | 24.x |
| pnpm | >= 10.0.0 |
| Docker | >= 24.x (for supporting services) |

### Installation

```bash
# 1. Clone the repository
git clone https://github.com/CLOCKWORK-TEMPTATION/thecopy-platform.git
cd thecopy-platform

# 2. Copy environment template and modify with real values
cp .env.example .env
cp .env.example apps/web/.env
cp .env.example apps/backend/.env

# 3. Install dependencies
pnpm install
```

> **Warning:** `TIPTAP_PRO_TOKEN` is required before `pnpm install` as `@tiptap-pro/extension-pages` is fetched from Tiptap's private registry. Add it in `.npmrc` or as environment variable.

### Running Development Environment

```bash
# Run web and backend together (recommended)
pnpm dev

# Run web only (Next.js on port 5000)
pnpm dev:web

# Run backend only (Express on PORT, default 3001)
pnpm dev:backend
```

After startup:
- Web Application: `http://localhost:5000`
- API Server: `http://localhost:<PORT>` where default in code is `3001`
- Official Editor Endpoints: `http://localhost:3001/api/file-extract`, `http://localhost:3001/api/text-extract`, `http://localhost:3001/api/final-review`

## Key Features

- **Arabic-First Interface**: Full RTL support and Arabic language prioritization
- **AI-Powered Tools**: Gemini, Anthropic, OpenAI, Mistral, and Groq integrations
- **Screenplay Analysis**: Breakdown, budgeting, and style analysis tools
- **Real-time Collaboration**: Socket.io powered live editing
- **Queue System**: BullMQ for background job processing
- **MCP Protocol**: Secure context protocol for AI integrations
- **Modular Architecture**: Domain packages for reusable tool logic

## Documentation

| Category | File/Path | Audience | Status |
|---|---|---|---|
| Reference | [README.md](README.md) | All | ✅ Complete |
| Architecture | [docs/architecture/ARCHITECTURE.md](docs/architecture/ARCHITECTURE.md) | Developers | ✅ Complete |
| API | docs/api/openapi.yaml | API Clients | ❌ Missing |
| API | docs/api/README.md | API Clients | ❌ Missing |
| Operations | docs/operations/DEPLOYMENT.md | DevOps | ❌ Missing |
| Operations | docs/operations/RUNBOOK.md | On-call | ❌ Missing |
| Operations | docs/operations/MONITORING.md | DevOps | ❌ Missing |
| Operations | docs/operations/ROLLBACK.md | DevOps | ❌ Missing |
| Configuration | docs/CONFIGURATION.md | All | ❌ Missing |
| Development | docs/development/DEVELOPMENT.md | Developers | ❌ Missing |
| Development | docs/development/TESTING.md | Developers | ❌ Missing |
| Contributing | CONTRIBUTING.md | Contributors | ❌ Missing |
| Security | SECURITY.md | All | ❌ Missing |
| Security | docs/security/THREAT_MODEL.md | All | ✅ Complete |
| Database | [docs/DATABASE.md](docs/DATABASE.md) | Developers | ✅ Complete |
| ADR | [docs/ADR/](docs/ADR/) | Developers | ✅ Complete (10 records) |

## Technology Stack

| Layer | Technology | Version | Purpose |
|---|---|---|---|
| Package Manager | pnpm | 10.33.3 | Efficient package management in monorepo |
| Build Orchestration | Turborepo | 2.5.0 | Fast, parallel builds for multiple packages |
| Web Framework | Next.js | 16.1.5 | SSR, SSG, and API Routes support |
| Backend Framework | Express.js | 5.1.0 | Lightweight, flexible Node.js server |
| Programming Language | TypeScript | 5.x | Type-safe development |
| Primary Database | PostgreSQL | 16.x | Structured data with ACID transactions |
| Secondary Database | MongoDB | 7.0.x | Flexible, schema-less data |
| Caching | Redis | 5.10.x | Fast caching and queues |
| Queue System | BullMQ | 5.x | Background job processing |
| Real-time | Socket.io | 4.8.x | Bi-directional real-time communication |
| Rich Text Editor | Tiptap | 3.0.x | Extensible rich text editor |
| 3D Graphics | Three.js | 9.5.x | 3D graphics rendering |
| State Management | Zustand | 5.0.x | Lightweight state management |
| Data Fetching | TanStack Query | 5.90.x | Advanced data fetching and caching |
| Monitoring | Sentry | 10.32.1 | Error tracking and monitoring |
| Tracing | OpenTelemetry | latest | Distributed tracing |
| Unit Testing | Vitest | 2.x/4.x | Fast unit testing |
| E2E Testing | Playwright | 1.49.x | Realistic UI testing |
| Context Protocol | MCP | 1.x | Secure AI model integration |

## Available Scripts

### Root (`package.json`)

| Command | Description |
|---|---|
| `pnpm dev` | Run web application with official backend once via `@the-copy/web` script |
| `pnpm dev:web` | Run Next.js only without backend |
| `pnpm dev:backend` | Run official backend only |
| `pnpm build` | Build all applications and packages via Turborepo |
| `pnpm test` | Run tests across all applications and packages |
| `pnpm lint` | Run ESLint across all applications and packages |
| `pnpm type-check` | Run `tsc` for type checking across repository |
| `pnpm format` | Apply Prettier to web application |
| `pnpm validate` | `format:check` + `lint` + `type-check` + `test` ordered |
| `pnpm ci` | `lint` + `type-check` + `test` + `build` via Turborepo (for CI) |

### Web Application (`apps/web`)

| Command | Description |
|---|---|
| `pnpm --filter @the-copy/web dev` | Run Next.js (webpack) + official backend together on port 5000 |
| `pnpm --filter @the-copy/web build` | Build Next.js for production |
| `pnpm --filter @the-copy/web start` | Run built Next.js on port 5000 |
| `pnpm --filter @the-copy/web lint` | Run ESLint on `src/` with zero warnings |
| `pnpm --filter @the-copy/web test` | Run `projectSummary` test via Vitest |

### Backend Server (`apps/backend`)

| Command | Description |
|---|---|
| `pnpm --filter @the-copy/backend dev` | Auto-build TypeScript and run `dist/server.js` on changes |
| `pnpm --filter @the-copy/backend build` | Build TypeScript via `tsconfig.build.json` |
| `pnpm --filter @the-copy/backend start` | Run built `dist/server.js` |
| `pnpm --filter @the-copy/backend test` | Run all tests via Vitest |
| `pnpm --filter @the-copy/backend lint` | Run ESLint on `src/` with zero warnings |

## Environment Variables

Complete reference in `.env.example` at repository root. Key variables:

### Required Variables

| Variable | Default | Usage |
|---|---|---|
| `NODE_ENV` | `development` | Runtime environment |
| `PORT` | `3001` | Default backend port (can be changed locally) |
| `DATABASE_URL` | `postgresql://user:password@localhost:5432/the_copy` | Primary database connection |
| `REDIS_URL` | `redis://localhost:6379` | Redis connection (takes priority over HOST/PORT) |
| `REDIS_ENABLED` | `true` | Enable/disable Redis |
| `JWT_SECRET` | — | Must be >= 32 chars in production |
| `GEMINI_API_KEY` | — | Google Gemini API key (primary AI provider) |

### Important Optional Variables

| Variable | Usage |
|---|---|
| `ANTHROPIC_API_KEY` | Claude models |
| `OPENAI_API_KEY` | GPT models |
| `MISTRAL_API_KEY` | PDF extraction via OCR |
| `GROQ_API_KEY` | PDF judge model |
| `AGENT_REVIEW_MODEL` | Model for editor review (default: `google-genai:gemini-2.5-flash`) |
| `TRACING_ENABLED` | Enable OpenTelemetry in backend |

## Entry Points

| Type | Path | Description |
|---|---|---|
| Landing Page | `apps/web/src/app/page.tsx` | Main page with HeroAnimation |
| App Launcher | `apps/web/src/app/ui/page.tsx` | Reads `apps/web/src/config/apps.config.ts` |
| Main Routes | `apps/web/src/app/(main)/layout.tsx` | Shared layout for tools |
| Web API Handlers | `apps/web/src/app/api/**/route.ts` | API handlers under `/api` |
| Backend Entry | `apps/web/src/app/server.ts` | Connects routes, middleware, queues |
| MCP Server | `apps/backend/src/mcp-server.ts` | Context protocol on `/mcp` endpoint |
| Package Exports | `packages/*/src/index.ts` | Public surface of each package |

## Common Issues

| Issue | Cause | Solution |
|---|---|---|
| `pnpm install` fails with `@tiptap-pro` error | `TIPTAP_PRO_TOKEN` missing | Add variable in `.npmrc` or environment before install |
| AI routes return error | `GEMINI_API_KEY` or `GOOGLE_GENAI_API_KEY` empty | Add key in `.env` |
| Web app can't reach backend | `NEXT_PUBLIC_API_URL` or `NEXT_PUBLIC_BACKEND_URL` wrong | Ensure value points to `http://localhost:<PORT>` matching your actual backend |
| Queues not working / backend workers not starting | Redis not running | Run `pnpm start:redis` or set `REDIS_ENABLED=false` to disable |
| `file-extract` and `text-extract` routes return 500 | Official backend not running, different port, or Python unavailable for Karank engine | Run `pnpm dev` or run `pnpm dev:web` with `pnpm dev:backend`, ensure web env vars point to `http://localhost:3001` or official `NEXT_PUBLIC_BACKEND_URL` |

## License

No unified license at root level (`package.json` declares `ISC`).

| Layer | Declared License |
|---|---|
| `apps/web` | `UNLICENSED` |
| `apps/backend` | `MIT` |
| Root (`package.json`) | `ISC` |

Check each application/package's `package.json` before any external reuse.

_meta:
- last_commit: 611b9381dcc0d2254c094172bcca1c7edf12fa67
- date: 2026-05-11
- reference: README.md:1-200