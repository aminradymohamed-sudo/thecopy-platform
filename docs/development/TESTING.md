# Testing Guide

## Testing Philosophy

We follow a **test pyramid** approach with emphasis on:

1. **Unit Tests**: Fast, isolated tests for individual components
2. **Integration Tests**: Tests for component interactions
3. **E2E Tests**: User journey tests
4. **Performance Tests**: Load and stress testing

**Test Coverage Targets:**
- Unit Tests: 80% minimum
- Integration Tests: 70% minimum
- E2E Tests: Critical user flows only

## Test Structure

```
tests/
├── unit/                # Unit tests
│   ├── backend/        # Backend unit tests
│   │   ├── services/   # Service layer tests
│   │   ├── controllers/ # Controller tests
│   │   └── utils/      # Utility tests
│   └── frontend/       # Frontend unit tests
│       ├── components/ # Component tests
│       ├── hooks/      # Hook tests
│       └── utils/      # Utility tests
├── integration/        # Integration tests
│   ├── api/           # API integration tests
│   ├── database/      # Database integration tests
│   └── services/      # Service integration tests
└── e2e/                # End-to-end tests
    ├── auth/          # Authentication flows
    ├── analysis/      # Analysis workflows
    └── projects/      # Project management
```

## Testing Tools

| Tool | Purpose | Configuration |
|---|---|---|
| **Jest** | Test runner | `jest.config.js` |
| **Testing Library** | DOM testing | Included in Jest |
| **Supertest** | HTTP assertions | Included in tests |
| **Mock Service Worker** | API mocking | `src/mocks/` |
| **k6** | Load testing | `scripts/load-test.js` |
| **Cypress** | E2E testing | `cypress.config.js` |
| **Istanbul** | Coverage reporting | Included in Jest |

## Unit Testing

### Backend Unit Testing

**Service Test Example:**
```typescript
import { ScreenplayAnalyzer } from '@/services/analysis';
import { mockAnalysisService } from '@tests/mocks';

describe('ScreenplayAnalyzer', () => {
  let analyzer: ScreenplayAnalyzer;

  beforeEach(() => {
    analyzer = new ScreenplayAnalyzer(mockAnalysisService);
  });

  describe('analyze()', () => {
    it('should return analysis result with valid input', async () => {
      const result = await analyzer.analyze('INT. COFFEE SHOP - DAY');
      expect(result).toMatchObject({
        overallScore: expect.any(Number),
        structureScore: expect.any(Number),
        characterScore: expect.any(Number),
        dialogueScore: expect.any(Number)
      });
    });

    it('should throw AnalysisError for empty input', async () => {
      await expect(analyzer.analyze('')).rejects.toThrow(AnalysisError);
    });

    it('should handle AI service errors gracefully', async () => {
      mockAnalysisService.process.mockRejectedValue(new Error('AI failure'));
      await expect(analyzer.analyze('test')).rejects.toThrow(AnalysisError);
    });
  });
});
```

### Frontend Unit Testing

**Component Test Example:**
```typescript
import { render, screen, fireEvent } from '@testing-library/react';
import { AnalysisDashboard } from '@/components/AnalysisDashboard';
import { useAnalysisStore } from '@/stores/analysis';

jest.mock('@/stores/analysis');

describe('AnalysisDashboard', () => {
  const mockAnalysis = {
    overallScore: 85,
    structureScore: 90,
    characterScore: 80,
    dialogueScore: 85
  };

  beforeEach(() => {
    (useAnalysisStore as jest.Mock).mockReturnValue({
      analysis: mockAnalysis,
      isLoading: false,
      error: null
    });
  });

  it('should render analysis scores', () => {
    render(<AnalysisDashboard />);

    expect(screen.getByText('Overall Score: 85')).toBeInTheDocument();
    expect(screen.getByText('Structure: 90')).toBeInTheDocument();
    expect(screen.getByText('Characters: 80')).toBeInTheDocument();
    expect(screen.getByText('Dialogue: 85')).toBeInTheDocument();
  });

  it('should show loading state', () => {
    (useAnalysisStore as jest.Mock).mockReturnValue({
      ...mockAnalysis,
      isLoading: true
    });

    render(<AnalysisDashboard />);
    expect(screen.getByText('Loading...')).toBeInTheDocument();
  });
});
```

## Integration Testing

### API Integration Testing

```typescript
import request from 'supertest';
import { app } from '@/app';
import { setupTestDatabase } from '@tests/utils';

describe('Analysis API Integration', () => {
  beforeAll(async () => {
    await setupTestDatabase();
  });

  describe('POST /api/analysis/screenplay', () => {
    it('should analyze screenplay and return results', async () => {
      const response = await request(app)
        .post('/api/analysis/screenplay')
        .set('Authorization', `Bearer ${testToken}`)
        .send({
          text: 'INT. COFFEE SHOP - DAY\n\nJOHN sits at a table, sipping coffee.',
          language: 'en',
          analysisType: 'full'
        })
        .expect(200);

      expect(response.body).toHaveProperty('overallScore');
      expect(response.body.overallScore).toBeGreaterThan(0);
      expect(response.body).toHaveProperty('structureScore');
      expect(response.body).toHaveProperty('characterScore');
      expect(response.body).toHaveProperty('dialogueScore');
    });

    it('should require authentication', async () => {
      await request(app)
        .post('/api/analysis/screenplay')
        .send({ text: 'test' })
        .expect(401);
    });
  });
});
```

### Database Integration Testing

```typescript
import { db } from '@/lib/db';
import { projects } from '@/db/schema';
import { eq } from 'drizzle-orm';

describe('Database Integration', () => {
  beforeEach(async () => {
    // Clean up test data
    await db.delete(projects).where(eq(projects.id, 'test-project'));
  });

  it('should create and retrieve projects', async () => {
    // Create project
    const [createdProject] = await db.insert(projects).values({
      id: 'test-project',
      name: 'Test Project',
      userId: 'test-user',
      createdAt: new Date(),
      updatedAt: new Date()
    }).returning();

    // Retrieve project
    const [retrievedProject] = await db.select()
      .from(projects)
      .where(eq(projects.id, 'test-project'));

    expect(retrievedProject).toBeDefined();
    expect(retrievedProject.name).toBe('Test Project');
    expect(retrievedProject.userId).toBe('test-user');
  });
});
```

## End-to-End Testing

### Cypress E2E Testing

```typescript
// cypress/e2e/analysis.spec.ts
describe('Screenplay Analysis Workflow', () => {
  beforeEach(() => {
    cy.login('test@example.com', 'password123');
    cy.visit('/dashboard');
  });

  it('should complete screenplay analysis', () => {
    // Upload screenplay
    cy.get('[data-testid="upload-button"]').attachFile('test-screenplay.pdf');

    // Start analysis
    cy.get('[data-testid="analyze-button"]').click();

    // Wait for analysis to complete
    cy.get('[data-testid="analysis-progress"]').should('contain', '100%');

    // Verify results
    cy.get('[data-testid="overall-score"]').should('be.visible');
    cy.get('[data-testid="structure-score"]').should('be.visible');
    cy.get('[data-testid="character-score"]').should('be.visible');

    // Save project
    cy.get('[data-testid="save-project"]').click();
    cy.get('[data-testid="project-name"]').type('Test Analysis');
    cy.get('[data-testid="save-button"]').click();

    // Verify project saved
    cy.url().should('include', '/projects');
    cy.contains('Test Analysis').should('be.visible');
  });
});
```

## Mocking Strategies

### API Mocking with MSW

```typescript
// src/mocks/handlers.ts
import { rest } from 'msw';

export const handlers = [
  rest.post('/api/analysis/screenplay', (req, res, ctx) => {
    return res(
      ctx.json({
        overallScore: 85,
        structureScore: 90,
        characterScore: 80,
        dialogueScore: 85,
        analysisId: 'mock-analysis-123',
        duration: 12000
      })
    );
  }),

  rest.get('/api/projects', (req, res, ctx) => {
    return res(
      ctx.json([
        { id: '1', name: 'Project 1', createdAt: '2026-01-01' },
        { id: '2', name: 'Project 2', createdAt: '2026-01-02' }
      ])
    );
  })
];
```

### Service Mocking

```typescript
// @tests/mocks/analysis-service.ts
export const mockAnalysisService = {
  process: jest.fn().mockImplementation((text: string) => {
    if (!text.trim()) {
      throw new Error('Empty input');
    }

    return Promise.resolve({
      overallScore: 85,
      structureScore: 90,
      characterScore: 80,
      dialogueScore: 85,
      rawData: {
        // mock analysis data
      }
    });
  })
};
```

## Test Utilities

### Common Test Utilities

```typescript
// @tests/utils/setup.ts
import { db } from '@/lib/db';
import { projects, users } from '@/db/schema';
import { eq } from 'drizzle-orm';

export async function setupTestDatabase() {
  // Clean up test data
  await db.delete(projects).where(eq(projects.userId, 'test-user'));
  await db.delete(users).where(eq(users.id, 'test-user'));

  // Create test user
  await db.insert(users).values({
    id: 'test-user',
    email: 'test@example.com',
    name: 'Test User',
    passwordHash: 'hashed-password',
    createdAt: new Date(),
    updatedAt: new Date()
  });
}

export function createTestToken(userId = 'test-user') {
  return jwt.sign(
    { userId, email: 'test@example.com' },
    process.env.JWT_SECRET!,
    { expiresIn: '1h' }
  );
}
```

## Performance Testing

### Load Testing with k6

```javascript
// scripts/load-test.js
import http from 'k6/http';
import { check, sleep } from 'k6';

export const options = {
  stages: [
    { duration: '30s', target: 50 },  // Ramp-up
    { duration: '1m', target: 100 },  // Normal load
    { duration: '30s', target: 150 }, // Spike
    { duration: '30s', target: 100 }, // Ramp-down
    { duration: '30s', target: 0 },   // End
  ],
  thresholds: {
    http_req_duration: ['p(95)<500'],  // 95% of requests < 500ms
    http_req_failed: ['rate<0.01'],     // <1% failed requests
  },
};

const BASE_URL = 'http://localhost:3001';
const TOKEN = 'your-test-token';

export default function () {
  const payload = JSON.stringify({
    text: 'INT. COFFEE SHOP - DAY\n\nJOHN sits at a table, sipping coffee.',
    language: 'en',
    analysisType: 'full'
  });

  const params = {
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${TOKEN}`,
    },
  };

  const res = http.post(`${BASE_URL}/api/analysis/screenplay`, payload, params);

  check(res, {
    'status is 200': (r) => r.status === 200,
    'response has overallScore': (r) => r.json().overallScore > 0,
  });

  sleep(1);
}
```

### Running Performance Tests

```bash
# Install k6
brew install k6

# Run load test
k6 run scripts/load-test.js

# Run with specific VUs
k6 run --vus 200 --duration 5m scripts/load-test.js

# Generate HTML report
k6 run --out json=results.json scripts/load-test.js
```

## Test Coverage

### Coverage Reporting

```bash
# Generate coverage report
pnpm run test:coverage

# View HTML report
open coverage/lcov-report/index.html

# Check coverage thresholds
pnpm run test:coverage:check
```

### Coverage Configuration

**jest.config.js:**
```javascript
module.exports = {
  collectCoverage: true,
  collectCoverageFrom: [
    'src/**/*.{ts,tsx}',
    '!src/**/*.d.ts',
    '!src/**/index.ts',
    '!src/**/types.ts',
    '!src/main.ts',
    '!src/app.ts'
  ],
  coverageDirectory: 'coverage',
  coverageReporters: ['text', 'lcov', 'clover'],
  coverageThreshold: {
    global: {
      branches: 80,
      functions: 80,
      lines: 80,
      statements: 80
    }
  }
};
```

## Continuous Integration

### CI Testing Pipeline

```yaml
# .github/workflows/test.yml
name: Test

on: [push, pull_request]

jobs:
  test:
    runs-on: ubuntu-latest
    services:
      postgres:
        image: postgres:15
        env:
          POSTGRES_USER: test
          POSTGRES_PASSWORD: test
          POSTGRES_DB: test
        ports:
          - 5432:5432
        options: --health-cmd pg_isready --health-interval 10s --health-timeout 5s --health-retries 5

      redis:
        image: redis:7
        ports:
          - 6379:6379
        options: --health-cmd "redis-cli ping" --health-interval 10s --health-timeout 5s --health-retries 5

    steps:
      - uses: actions/checkout@v4

      - name: Set up Node.js
        uses: actions/setup-node@v4
        with:
          node-version: 20
          cache: 'pnpm'

      - name: Install dependencies
        run: pnpm install

      - name: Run linting
        run: pnpm run lint

      - name: Run unit tests
        run: pnpm run test:unit

      - name: Run integration tests
        run: pnpm run test:integration
        env:
          DATABASE_URL: postgresql://test:test@localhost:5432/test
          REDIS_URL: redis://localhost:6379

      - name: Upload coverage
        uses: codecov/codecov-action@v3
        with:
          token: ${{ secrets.CODECOV_TOKEN }}
```

## Test Maintenance

### Keeping Tests Maintainable

1. **DRY Tests**: Use test utilities and helpers
2. **Clear Names**: Use descriptive test names
3. **Single Responsibility**: One assertion per test
4. **Isolation**: Tests should not depend on each other
5. **Speed**: Keep tests fast
6. **Reliability**: Avoid flaky tests
7. **Documentation**: Use test descriptions

### Test Refactoring

**Before:**
```typescript
it('should do something', async () => {
  const analyzer = new ScreenplayAnalyzer(service);
  const result = await analyzer.analyze('test');
  expect(result.overallScore).toBeGreaterThan(0);
  expect(result.structureScore).toBeGreaterThan(0);
  // ... 20 more expectations
});
```

**After:**
```typescript
describe('ScreenplayAnalyzer.analyze()', () => {
  let analyzer: ScreenplayAnalyzer;

  beforeEach(() => {
    analyzer = new ScreenplayAnalyzer(service);
  });

  it('should return valid analysis result', async () => {
    const result = await analyzer.analyze('test');
    expect(result).toMatchSnapshot();
  });

  it('should include all required scores', async () => {
    const result = await analyzer.analyze('test');
    expect(result).toHaveRequiredScores();
  });

  it('should handle empty input', async () => {
    await expect(analyzer.analyze('')).rejects.toThrow();
  });
});
```

## Test Data Management

### Test Data Strategies

1. **Factories**: Use test data factories
2. **Seeds**: Pre-populate test data
3. **Cleanup**: Always clean up after tests
4. **Isolation**: Use transactions or separate databases

**Test Data Factory Example:**
```typescript
// @tests/factories/project.ts
import { db } from '@/lib/db';
import { projects } from '@/db/schema';

export async function createTestProject(overrides = {}) {
  const defaults = {
    name: 'Test Project',
    userId: 'test-user',
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides
  };

  const [project] = await db.insert(projects)
    .values(defaults)
    .returning();

  return project;
}
```

## Testing Best Practices

### General Best Practices

1. **Test Behavior, Not Implementation**: Focus on what code does, not how
2. **Fast Tests**: Keep unit tests under 100ms
3. **Deterministic**: Tests should always produce same result
4. **Independent**: Tests should not affect each other
5. **Clear Failure Messages**: Helpful error messages
6. **Proper Setup/Teardown**: Clean test environment
7. **Edge Cases**: Test boundary conditions

### Specific Guidelines

**Unit Tests:**
- Test one function/class at a time
- Mock all external dependencies
- Focus on logic, not I/O

**Integration Tests:**
- Test component interactions
- Use real dependencies where possible
- Test happy path and error cases

**E2E Tests:**
- Test critical user journeys only
- Avoid testing implementation details
- Use realistic test data

## Debugging Tests

### Common Test Issues

| Issue | Solution |
|---|---|
| **Flaky tests** | Check for timing issues, race conditions |
| **Slow tests** | Reduce test scope, mock external calls |
| **Test pollution** | Clean up test data, use transactions |
| **False positives** | Add more specific assertions |
| **False negatives** | Check test assumptions |
| **Timeout issues** | Increase timeout or optimize test |

### Debugging Tools

```bash
# Run specific test
pnpm run test:unit -- ScreenplayAnalyzer

# Run in watch mode
pnpm run test:watch

# Debug test in VS Code
# Add this to launch.json:
{
  "type": "node",
  "request": "launch",
  "name": "Debug Jest Tests",
  "runtimeExecutable": "${workspaceFolder}/node_modules/.bin/jest",
  "args": ["--runInBand", "--no-coverage"],
  "console": "integratedTerminal",
  "internalConsoleOptions": "neverOpen"
}
```

## Test Reporting

### Test Reporting Tools

| Tool | Purpose | Integration |
|---|---|---|
| **Jest HTML Reporter** | HTML test reports | `jest-html-reporter` |
| **Allure** | Advanced reporting | `allure-jest` |
| **Codecov** | Coverage tracking | GitHub integration |
| **SonarQube** | Quality analysis | CI integration |

### Generating Reports

```bash
# HTML report
pnpm run test:report

# Allure report
pnpm run test:allure
allure serve allure-results

# Codecov upload
pnpm run test:coverage:upload
```

## Performance Testing Best Practices

1. **Realistic Load**: Simulate real user patterns
2. **Gradual Ramp-up**: Increase load gradually
3. **Monitor Resources**: Watch CPU, memory, database
4. **Baseline Metrics**: Compare against known good state
5. **Isolate Variables**: Test one change at a time
6. **Long Duration**: Run tests long enough to find leaks
7. **Document Results**: Track performance over time

## Security Testing

### Security Test Checklist

- [ ] Input validation tests
- [ ] Authentication tests
- [ ] Authorization tests
- [ ] CSRF protection tests
- [ ] SQL injection tests
- [ ] XSS protection tests
- [ ] Rate limiting tests
- [ ] Error handling tests (no info leakage)

**Security Test Example:**
```typescript
describe('Authentication Security', () => {
  it('should reject weak passwords', async () => {
    await request(app)
      .post('/api/auth/register')
      .send({
        email: 'test@example.com',
        password: '123'
      })
      .expect(400);
  });

  it('should prevent brute force attacks', async () => {
    // Make 5 failed attempts
    for (let i = 0; i < 5; i++) {
      await request(app)
        .post('/api/auth/login')
        .send({
          email: 'test@example.com',
          password: 'wrong'
        });
    }

    // 6th attempt should be rate limited
    await request(app)
      .post('/api/auth/login')
      .send({
        email: 'test@example.com',
        password: 'wrong'
      })
      .expect(429);
  });
});
```

## Test Environment Management

### Test Environment Setup

```bash
# Start test environment
pnpm run test:env:start

# Stop test environment
pnpm run test:env:stop

# Reset test environment
pnpm run test:env:reset
```

### Environment Configuration

**.env.test:**
```
NODE_ENV=test
DATABASE_URL=postgresql://test:test@localhost:5433/test
REDIS_URL=redis://localhost:6380
JWT_SECRET=test-secret
LOG_LEVEL=error
```

## Contact Information

### Testing Support

| Issue | Contact |
|---|---|
| **Test Failures** | test-support@thecopyplatform.com |
| **Test Infrastructure** | devops@thecopyplatform.com |
| **Test Strategy** | qa-team@thecopyplatform.com |
| **Performance Testing** | perf-team@thecopyplatform.com |

### Resources

- **Jest Documentation**: https://jestjs.io/docs
- **Cypress Documentation**: https://docs.cypress.io
- **Testing Library**: https://testing-library.com/docs
- **k6 Documentation**: https://k6.io/docs

## Staging Capacity Ceiling

| Scenario | Max VUs | Result |
|---|---|---|
| load | 100 | ✅ 0% error |
| spike | 200 | ✅ 0% error |
| scalability | 200 | ✅ 0% error |
| stress (breaking point) | 500 | ⚠ errors begin |

**200 VUs is the approved staging ceiling** — confirmed by `spike` and `scalability` scenarios with 0% failure.

**500 VUs is an experimental breaking-point threshold**, not a production target.

Any increase of the staging ceiling requires:
1. Raising service resources (RAM / CPU) in Railway.
2. Re-running the `stress` scenario against the upgraded tier.
3. Updating this table with the new ceiling and results.

_meta:
- last_commit: 611b9381dcc0d2254c094172bcca1c7edf12fa67
- date: 2026-05-11
- reference: docs/development/TESTING.md:1-200