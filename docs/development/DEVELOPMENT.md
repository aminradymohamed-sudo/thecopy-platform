# Development Guide

## Prerequisites

### Required Software

| Software | Version | Purpose |
|---|---|---|
| Node.js | 20.x LTS | JavaScript runtime |
| pnpm | 8.x | Package manager |
| Docker | Latest | Database services |
| Git | Latest | Version control |
| VS Code | Latest | Recommended IDE |
| PostgreSQL | 15.x | Database |
| Redis | 7.x | Caching |

### Installation

```bash
# Install Node.js (using nvm recommended)
nvm install 20
nvm use 20

# Install pnpm
npm install -g pnpm

# Install Docker
# Follow platform-specific instructions from docker.com

# Clone repository
git clone https://github.com/CLOCKWORK-TEMPTATION/thecopy-platform.git
cd thecopy-platform
```

## Project Setup

### Initial Setup

```bash
# Install dependencies
pnpm install

# Set up environment variables
cp .env.example .env

# Edit .env with your local configuration
# Required variables:
# - DATABASE_URL=postgresql://user:password@localhost:5432/thecopy
# - REDIS_URL=redis://localhost:6379
# - JWT_SECRET=your-secret-key
# - GEMINI_API_KEY=your-gemini-api-key

# Set up database
pnpm run db:setup
```

### Environment Configuration

**.env Variables:**

| Variable | Description | Required |
|---|---|---|
| `DATABASE_URL` | PostgreSQL connection string | ✅ |
| `REDIS_URL` | Redis connection string | ✅ |
| `JWT_SECRET` | JWT signing secret | ✅ |
| `GEMINI_API_KEY` | Gemini API key | ✅ |
| `NODE_ENV` | Environment (development/production) | ✅ |
| `PORT` | Backend port | ❌ (default: 3001) |
| `FRONTEND_URL` | Frontend URL for CORS | ❌ (default: http://localhost:3000) |
| `LOG_LEVEL` | Logging level | ❌ (default: info) |

## Development Commands

### Common Commands

| Command | Description |
|---|---|
| `pnpm install` | Install dependencies |
| `pnpm run dev` | Start full development stack |
| `pnpm run dev:backend` | Start backend only |
| `pnpm run dev:frontend` | Start frontend only |
| `pnpm run dev:services` | Start database services |
| `pnpm run build` | Build for production |
| `pnpm run start` | Start production server |
| `pnpm run test` | Run all tests |
| `pnpm run test:unit` | Run unit tests |
| `pnpm run test:integration` | Run integration tests |
| `pnpm run test:e2e` | Run end-to-end tests |
| `pnpm run lint` | Run linting |
| `pnpm run format` | Format code |
| `pnpm run db:setup` | Set up database |
| `pnpm run db:push` | Apply database migrations |
| `pnpm run db:studio` | Open Drizzle Studio |

### Development Servers

| Service | URL | Port |
|---|---|---|
| Backend API | http://localhost:3001 | 3001 |
| Frontend | http://localhost:3000 | 3000 |
| PostgreSQL | localhost | 5432 |
| Redis | localhost | 6379 |
| Drizzle Studio | http://localhost:5433 | 5433 |

## Development Workflow

### Typical Development Session

```bash
# Start database services in one terminal
pnpm run dev:services

# Start backend in another terminal
pnpm run dev:backend

# Start frontend in another terminal
pnpm run dev:frontend

# Make code changes - backend will hot reload
# Frontend will hot reload

# Run tests periodically
pnpm run test
```

### Hot Reloading

- **Backend**: Automatic restart on file changes
- **Frontend**: Fast refresh for React components
- **Configuration**: Changes require restart

## Database Development

### Database Setup

```bash
# Start PostgreSQL and Redis
pnpm run dev:services

# Run migrations
pnpm run db:push

# Open Drizzle Studio (GUI)
pnpm run db:studio
```

### Database Migrations

```bash
# Generate new migration
pnpm run db:generate

# Apply migrations
pnpm run db:push

# Reset database (development only)
pnpm run db:reset

# Run database seeds
pnpm run db:seed
```

### Database Tools

| Tool | Command | Description |
|---|---|---|
| Drizzle Studio | `pnpm run db:studio` | Web-based database GUI |
| psql | `psql -h localhost -U user -d thecopy` | PostgreSQL CLI |
| redis-cli | `redis-cli -h localhost` | Redis CLI |
| pgAdmin | N/A | Install separately |

## API Development

### API Endpoints

| Method | Endpoint | Description |
|---|---|---|
| POST | `/api/analysis/screenplay` | Analyze screenplay |
| GET | `/api/projects` | List projects |
| POST | `/api/projects` | Create project |
| GET | `/api/app-state/{appId}` | Get app state |
| PUT | `/api/app-state/{appId}` | Update app state |

### API Testing

```bash
# Test analysis endpoint
curl -X POST http://localhost:3001/api/analysis/screenplay \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -d '{
    "text": "INT. COFFEE SHOP - DAY\n\nJOHN sits at a table, sipping coffee.",
    "language": "en",
    "analysisType": "full"
  }'

# Test with API client
import { TheCopyClient } from '@the-copy/api-client';

const client = new TheCopyClient({
  baseUrl: 'http://localhost:3001',
  apiKey: 'your-api-key'
});

const analysis = await client.analysis.analyzeScreenplay({
  text: 'INT. COFFEE SHOP - DAY...',
  language: 'en'
});
```

## Frontend Development

### Frontend Structure

```
frontend/
├── public/          # Static assets
├── src/
│   ├── components/  # React components
│   ├── hooks/       # Custom hooks
│   ├── pages/       # Next.js pages
│   ├── services/    # API services
│   ├── stores/      # State management
│   ├── styles/      # CSS and styling
│   ├── types/       # TypeScript types
│   └── utils/       # Utility functions
```

### Frontend Development Tips

1. **Component Development**: Use Storybook for isolated component development
2. **State Management**: Use Zustand for global state
3. **API Calls**: Use React Query for data fetching
4. **Styling**: Use Tailwind CSS for utility-first styling
5. **Internationalization**: Use next-i18next for translations

## Testing

### Testing Setup

```bash
# Run all tests
pnpm run test

# Run specific test suite
pnpm run test:unit
pnpm run test:integration
pnpm run test:e2e

# Run tests with coverage
pnpm run test:coverage

# Watch mode
pnpm run test:watch
```

### Test Structure

```
tests/
├── unit/            # Unit tests
│   ├── backend/    # Backend unit tests
│   └── frontend/   # Frontend unit tests
├── integration/    # Integration tests
└── e2e/            # End-to-end tests
```

### Writing Tests

**Unit Test Example:**
```typescript
import { ScreenplayAnalyzer } from '@/services/analysis';
import { mockAnalysisService } from '@tests/mocks';

describe('ScreenplayAnalyzer', () => {
  let analyzer: ScreenplayAnalyzer;

  beforeEach(() => {
    analyzer = new ScreenplayAnalyzer(mockAnalysisService);
  });

  it('should analyze screenplay text', async () => {
    const result = await analyzer.analyze('INT. COFFEE SHOP - DAY');
    expect(result.overallScore).toBeGreaterThan(0);
  });
});
```

**Integration Test Example:**
```typescript
import request from 'supertest';
import { app } from '@/app';

describe('Analysis API', () => {
  it('should analyze screenplay', async () => {
    const response = await request(app)
      .post('/api/analysis/screenplay')
      .send({
        text: 'INT. COFFEE SHOP - DAY',
        language: 'en'
      })
      .expect(200);

    expect(response.body.overallScore).toBeDefined();
  });
});
```

## Debugging

### Debugging Tools

| Tool | Usage |
|---|---|
| **VS Code Debugger** | Attach to Node.js process |
| **Chrome DevTools** | Frontend debugging |
| **Sentry** | Error tracking |
| **Logger** | Structured logging |
| **API Logs** | Request/response logging |

### Debugging Configuration

**.vscode/launch.json:**
```json
{
  "version": "0.2.0",
  "configurations": [
    {
      "type": "node",
      "request": "launch",
      "name": "Debug Backend",
      "runtimeExecutable": "pnpm",
      "runtimeArgs": ["run", "dev:backend"],
      "port": 9229,
      "skipFiles": ["<node_internals>/**"]
    },
    {
      "type": "chrome",
      "request": "launch",
      "name": "Debug Frontend",
      "url": "http://localhost:3000",
      "webRoot": "${workspaceFolder}/frontend"
    }
  ]
}
```

### Common Debugging Scenarios

**Backend Debugging:**
```bash
# Start backend with debug flags
NODE_OPTIONS='--inspect' pnpm run dev:backend

# Then attach debugger in VS Code
```

**Database Debugging:**
```bash
# Enable PostgreSQL logging
# Edit postgresql.conf:
# log_statement = 'all'
# log_min_duration_statement = 0

# View logs
tail -f /var/log/postgresql/postgresql-15-main.log
```

## Performance Optimization

### Performance Tips

1. **Database**: Add indexes for frequent queries
2. **Caching**: Use Redis for expensive operations
3. **API**: Implement pagination for list endpoints
4. **Frontend**: Use code splitting and lazy loading
5. **Images**: Optimize and compress images
6. **Bundling**: Use Webpack optimization

### Performance Testing

```bash
# Load testing with k6
k6 run --vus 100 --duration 30s scripts/load-test.js

# Memory profiling
node --inspect apps/backend/dist/main.js
# Then use Chrome DevTools Memory tab
```

## Deployment

### Local Deployment

```bash
# Build for production
pnpm run build

# Start production server
pnpm run start

# Or use Docker
docker build -t thecopy-platform .
docker run -p 3001:3001 thecopy-platform
```

### Deployment Checklist

- [ ] All tests passing
- [ ] Code reviewed and approved
- [ ] Documentation updated
- [ ] Database migrations tested
- [ ] Environment variables configured
- [ ] Monitoring set up
- [ ] Backup verified
- [ ] Rollback plan prepared

## Troubleshooting

### Common Issues

| Issue | Solution |
|---|---|
| **Database connection failed** | Check DATABASE_URL, ensure PostgreSQL running |
| **Port already in use** | Change port or kill existing process |
| **Dependency installation failed** | Delete node_modules and pnpm-lock.yaml, retry |
| **TypeScript compilation errors** | Fix type errors, run `pnpm run build` |
| **Hot reload not working** | Restart dev server, check file watchers |
| **CORS errors** | Check FRONTEND_URL in .env |
| **Authentication failed** | Verify JWT_SECRET matches |
| **Redis connection failed** | Check Redis is running, verify REDIS_URL |

### Troubleshooting Commands

```bash
# Check running processes
ps aux | grep node

# Check open ports
lsof -i :3001

# View logs
pnpm run logs:backend
pnpm run logs:frontend

# Database connection test
psql -h localhost -U user -d thecopy -c "SELECT 1"

# Redis connection test
redis-cli -h localhost ping
```

## IDE Configuration

### VS Code Extensions

| Extension | Purpose |
|---|---|
| ESLint | JavaScript linting |
| Prettier | Code formatting |
| TypeScript Toolbox | TypeScript utilities |
| GitLens | Git integration |
| Docker | Docker support |
| REST Client | API testing |
| Thunder Client | Alternative API testing |
| PostgreSQL | Database support |

### VS Code Settings

**.vscode/settings.json:**
```json
{
  "editor.formatOnSave": true,
  "editor.defaultFormatter": "esbenp.prettier-vscode",
  "eslint.validate": ["javascript", "typescript"],
  "typescript.tsdk": "node_modules/typescript/lib",
  "editor.codeActionsOnSave": {
    "source.fixAll.eslint": true
  },
  "[typescript]": {
    "editor.defaultFormatter": "esbenp.prettier-vscode"
  },
  "[javascript]": {
    "editor.defaultFormatter": "esbenp.prettier-vscode"
  }
}
```

## Best Practices

### Development Best Practices

1. **Small Commits**: Make small, focused commits
2. **Frequent Testing**: Run tests frequently
3. **Code Reviews**: Get reviews for all changes
4. **Documentation**: Update docs as you code
5. **Error Handling**: Always handle errors properly
6. **Logging**: Add appropriate logging
7. **Performance**: Consider performance impact
8. **Security**: Follow security best practices

### Code Quality

```bash
# Run linting
pnpm run lint

# Fix linting issues
pnpm run lint:fix

# Format code
pnpm run format

# Check types
pnpm run type-check
```

## Learning Resources

### Recommended Learning

| Topic | Resources |
|---|---|
| **TypeScript** | typescriptlang.org/docs |
| **Node.js** | nodejs.org/en/docs |
| **React** | react.dev/learn |
| **Next.js** | nextjs.org/docs |
| **PostgreSQL** | postgresqltutorial.com |
| **Redis** | redis.io/docs |
| **Docker** | docs.docker.com |
| **Testing** | jestjs.io/docs |

### Project-Specific Resources

- **Architecture**: `docs/architecture/ARCHITECTURE.md`
- **API Documentation**: `docs/api/README.md`
- **Contributing Guide**: `CONTRIBUTING.md`
- **ADR Records**: `docs/adr/`

## Contact Information

### Development Support

| Issue | Contact |
|---|---|
| **Setup Issues** | dev-support@thecopyplatform.com |
| **API Questions** | api-support@thecopyplatform.com |
| **Frontend Questions** | frontend-team@thecopyplatform.com |
| **Backend Questions** | backend-team@thecopyplatform.com |
| **Database Questions** | dba-team@thecopyplatform.com |

### Community

- **Slack**: Join our community Slack
- **GitHub Discussions**: Ask questions on GitHub
- **Weekly Office Hours**: Fridays 2-3 PM UTC

_meta:
- last_commit: 611b9381dcc0d2254c094172bcca1c7edf12fa67
- date: 2026-05-11
- reference: docs/development/DEVELOPMENT.md:1-200