---
name: implementation-safety-planner
description: Create detailed, step-by-step implementation plans with comprehensive testing strategy, rollback procedures, edge case analysis, and technical feasibility assessment. Use before implementing any feature that affects databases, critical APIs, or production systems. Ensures safe execution through test-first planning and data-safe rollback strategies.
---

# Implementation Safety Planner

## Core Philosophy

**القاعدة الذهبية**: خطة الاختبار وخطة الرجوع جزء أساسي من تصميم الحل، ليست مهام ما بعد التنفيذ.

```
❌ Wrong: Design → Implement → Test → Rollback Plan
✅ Right: Design + Testing Strategy + Rollback Plan → Implement
```

## When to Use This Skill

استخدم هذه المهارة **قبل كتابة أي كود** في الحالات التالية:

### High-Risk Scenarios (إلزامي)
- ✅ Database migrations أو schema changes
- ✅ تعديل على API endpoints موجودة
- ✅ تغييرات على authentication/authorization
- ✅ معالجة بيانات حساسة (مالية، شخصية)
- ✅ أنظمة تتطلب high availability
- ✅ تعديلات على قاعدة بيانات production

### Medium-Risk Scenarios (موصى به)
- ✅ ميزات جديدة تتفاعل مع خدمات موجودة
- ✅ تكامل مع third-party APIs
- ✅ معالجة ملفات أو uploads
- ✅ Background jobs أو scheduled tasks

### Low-Risk Scenarios (اختياري)
- ✅ مكونات UI جديدة منفصلة
- ✅ utility functions مستقلة
- ✅ مشاريع جديدة من الصفر (للتخطيط)

**لا تستخدم** للمهام البسيطة مثل:
- ❌ تغيير نص ثابت
- ❌ تعديل CSS
- ❌ إضافة console.log

## Core Workflow

```
Phase 1: Implementation Details & Dependencies
         ↓ تحديد التفاصيل الدقيقة والتبعيات
         
Phase 2: Testing Strategy Design
         ↓ تصميم استراتيجية الاختبار قبل الكود
         
Phase 3: Rollback Plan
         ↓ خطة التراجع الآمنة للبيانات
         
Phase 4: Edge Cases Analysis
         ↓ تحديد وتوثيق جميع الحالات الحدية
         
Phase 5: Technical Feasibility Assessment
         ↓ تقييم الواقعية التقنية
         
Phase 6: Step-by-Step Execution Plan
         ↓ خطة تنفيذ تفصيلية خطوة بخطوة
         
Phase 7: Safety Checklist
         ✓ مراجعة نهائية للأمان
```

---

## Phase 1: Implementation Details & Dependencies

### Objectives
- تحديد كل dependency مطلوبة للتنفيذ
- توضيح التفاصيل التقنية الدقيقة
- تحديد ترتيب التنفيذ الصحيح

### Step 1.1: External Dependencies

```typescript
interface ExternalDependency {
  name: string;
  type: 'npm_package' | 'service' | 'database' | 'api' | 'infrastructure';
  version?: string;
  purpose: string;
  installation: string;
  configuration: string[];
  documentation: string;
}

// مثال: إضافة rate limiting
const externalDeps: ExternalDependency[] = [
  {
    name: 'express-rate-limit',
    type: 'npm_package',
    version: '^7.1.0',
    purpose: 'Rate limiting middleware للحماية من abuse',
    installation: 'npm install express-rate-limit',
    configuration: [
      'windowMs: 15 minutes',
      'max: 100 requests per window',
      'standardHeaders: true',
      'legacyHeaders: false'
    ],
    documentation: 'https://github.com/express-rate-limit/express-rate-limit'
  },
  {
    name: 'Redis',
    type: 'infrastructure',
    version: '7.0+',
    purpose: 'تخزين rate limit counters موزع',
    installation: 'docker run -d -p 6379:6379 redis:7-alpine',
    configuration: [
      'host: localhost',
      'port: 6379',
      'password: من environment variables'
    ],
    documentation: 'https://redis.io/docs'
  }
]
```

### Step 1.2: Internal Dependencies

```typescript
interface InternalDependency {
  component: string;
  location: string;
  requiredMethods: string[];
  modifications?: string[];
  reason: string;
}

// مثال: ميزة Notifications تحتاج UserService
const internalDeps: InternalDependency[] = [
  {
    component: 'UserService',
    location: 'src/services/user.service.ts',
    requiredMethods: ['getUserById', 'getUserPreferences'],
    modifications: [
      'إضافة method: updateNotificationPreferences(userId, prefs)'
    ],
    reason: 'للحصول على user details و notification preferences'
  },
  {
    component: 'EmailService',
    location: 'src/services/email.service.ts',
    requiredMethods: ['sendEmail'],
    modifications: [], // no changes needed
    reason: 'لإرسال email notifications'
  }
]
```

### Step 1.3: Database Dependencies

```typescript
interface DatabaseDependency {
  operation: 'create_table' | 'add_column' | 'add_index' | 'modify_column';
  table: string;
  details: string;
  reversible: boolean;
  rollbackSQL?: string;
  dataImpact: 'none' | 'low' | 'medium' | 'high';
}

const dbDeps: DatabaseDependency[] = [
  {
    operation: 'create_table',
    table: 'notifications',
    details: `
      CREATE TABLE notifications (
        id SERIAL PRIMARY KEY,
        user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        message TEXT NOT NULL,
        type VARCHAR(50) NOT NULL CHECK (type IN ('email', 'sms', 'push')),
        status VARCHAR(50) NOT NULL DEFAULT 'pending',
        sent_at TIMESTAMP,
        created_at TIMESTAMP NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMP NOT NULL DEFAULT NOW()
      );
      CREATE INDEX idx_notifications_user_id ON notifications(user_id);
      CREATE INDEX idx_notifications_status ON notifications(status);
    `,
    reversible: true,
    rollbackSQL: 'DROP TABLE IF EXISTS notifications CASCADE;',
    dataImpact: 'none' // جدول جديد، لا يوجد بيانات موجودة
  },
  {
    operation: 'add_column',
    table: 'users',
    details: `
      ALTER TABLE users 
      ADD COLUMN notification_preferences JSONB DEFAULT '{"email": true, "sms": false, "push": true}'::jsonb;
    `,
    reversible: true,
    rollbackSQL: 'ALTER TABLE users DROP COLUMN notification_preferences;',
    dataImpact: 'low' // إضافة عمود مع default value آمن
  }
]
```

### Step 1.4: Environment Variables

```typescript
interface EnvironmentVariable {
  name: string;
  required: boolean;
  defaultValue?: string;
  description: string;
  validation: string;
  example: string;
}

const envVars: EnvironmentVariable[] = [
  {
    name: 'REDIS_URL',
    required: true,
    description: 'Redis connection URL for rate limiting',
    validation: 'Must be valid Redis URL format',
    example: 'redis://localhost:6379'
  },
  {
    name: 'NOTIFICATION_QUEUE_CONCURRENCY',
    required: false,
    defaultValue: '5',
    description: 'Number of concurrent notification jobs',
    validation: 'Must be integer between 1-20',
    example: '10'
  }
]
```

### Step 1.5: Implementation Order

```typescript
interface ImplementationStep {
  order: number;
  phase: string;
  tasks: string[];
  dependencies: string[];
  estimatedTime: string;
  canRunInParallel: boolean;
}

const implementationOrder: ImplementationStep[] = [
  {
    order: 1,
    phase: 'Infrastructure Setup',
    tasks: [
      'تثبيت Redis',
      'إضافة environment variables',
      'تحديث .env.example'
    ],
    dependencies: [],
    estimatedTime: '30 minutes',
    canRunInParallel: false
  },
  {
    order: 2,
    phase: 'Database Migration',
    tasks: [
      'إنشاء migration file',
      'اختبار migration على dev database',
      'تجهيز rollback script'
    ],
    dependencies: ['Infrastructure Setup'],
    estimatedTime: '1 hour',
    canRunInParallel: false
  },
  {
    order: 3,
    phase: 'Core Services',
    tasks: [
      'NotificationService implementation',
      'NotificationQueue setup',
      'NotificationRepository'
    ],
    dependencies: ['Database Migration'],
    estimatedTime: '4 hours',
    canRunInParallel: true // يمكن تقسيمها على developers
  }
]
```

### Output of Phase 1

```markdown
## Implementation Details & Dependencies

### External Dependencies
| Package | Version | Purpose | Installation Time |
|---------|---------|---------|-------------------|
| express-rate-limit | ^7.1.0 | Rate limiting | 5 min |
| Redis | 7.0+ | Distributed storage | 15 min |

### Internal Dependencies
- **UserService**: يحتاج modification (add method: updateNotificationPreferences)
- **EmailService**: استخدام مباشر (no changes)

### Database Changes
1. **CREATE TABLE** `notifications` ✅ Reversible
   - Rollback: `DROP TABLE notifications`
   - Data Impact: None (new table)

2. **ALTER TABLE** `users` ADD COLUMN `notification_preferences` ✅ Reversible
   - Rollback: `ALTER TABLE users DROP COLUMN notification_preferences`
   - Data Impact: Low (has safe default)

### Environment Variables
- `REDIS_URL` (required)
- `NOTIFICATION_QUEUE_CONCURRENCY` (optional, default: 5)

### Implementation Order
1. Infrastructure (30 min) → 2. Migration (1 hr) → 3. Services (4 hrs)

**Total Estimated Time**: 5.5 hours
```

---

## Phase 2: Testing Strategy Design

### Objectives
- تحديد **أين** نكتب الاختبارات **قبل** كتابة الكود
- تصميم test structure واضحة
- تحديد test coverage requirements

### The Testing Pyramid

```
        /\
       /  \        E2E Tests (5%)
      /____\       - Full user flow
     /      \      - Critical paths only
    / Integ. \     Integration Tests (15%)
   /__________\    - API + DB
  /            \   - Service interactions
 /  Unit Tests \   Unit Tests (80%)
/________________\ - Pure functions
                   - Business logic
```

### Step 2.1: Unit Tests Planning

```typescript
interface UnitTestPlan {
  file: string;
  testFile: string;
  testsToWrite: {
    describe: string;
    tests: {
      it: string;
      arrange: string; // setup
      act: string;     // action
      assert: string;  // verification
      mocks?: string[];
    }[];
  }[];
  coverageTarget: number; // percentage
}

// مثال: NotificationService unit tests
const unitTestPlan: UnitTestPlan = {
  file: 'src/services/notification.service.ts',
  testFile: 'src/services/__tests__/notification.service.test.ts',
  testsToWrite: [
    {
      describe: 'NotificationService.sendNotification',
      tests: [
        {
          it: 'should create notification record in database',
          arrange: 'Mock NotificationRepository.create()',
          act: 'Call sendNotification(userId, message, type)',
          assert: 'Verify repository.create was called with correct data',
          mocks: ['NotificationRepository']
        },
        {
          it: 'should add job to notification queue',
          arrange: 'Mock NotificationQueue.add()',
          act: 'Call sendNotification()',
          assert: 'Verify queue.add was called with notification data',
          mocks: ['NotificationQueue']
        },
        {
          it: 'should throw error if user not found',
          arrange: 'Mock UserService.getUserById to return null',
          act: 'Call sendNotification() with invalid userId',
          assert: 'Expect UserNotFoundError to be thrown',
          mocks: ['UserService']
        },
        {
          it: 'should validate notification type',
          arrange: 'Setup test data with invalid type',
          act: 'Call sendNotification() with type="invalid"',
          assert: 'Expect ValidationError with message about type',
          mocks: []
        }
      ]
    }
  ],
  coverageTarget: 90
}
```

### Step 2.2: Integration Tests Planning

```typescript
interface IntegrationTestPlan {
  scope: string;
  testFile: string;
  setup: string[];
  teardown: string[];
  tests: {
    describe: string;
    tests: {
      it: string;
      preconditions: string[];
      steps: string[];
      assertions: string[];
      dataCleanup: string;
    }[];
  }[];
}

const integrationTestPlan: IntegrationTestPlan = {
  scope: 'Notification API Endpoints',
  testFile: 'src/controllers/__tests__/notification.controller.integration.test.ts',
  setup: [
    'Start test database (Docker container)',
    'Run migrations',
    'Seed test users',
    'Start Redis instance',
    'Initialize Express app'
  ],
  teardown: [
    'Clear all tables',
    'Stop Redis',
    'Stop database container'
  ],
  tests: [
    {
      describe: 'POST /api/notifications',
      tests: [
        {
          it: 'should create notification and return 201',
          preconditions: [
            'User exists in database',
            'User is authenticated'
          ],
          steps: [
            'Send POST request to /api/notifications',
            'Body: { userId, message, type: "email" }',
            'Include valid JWT token in Authorization header'
          ],
          assertions: [
            'Response status = 201',
            'Response body contains notificationId',
            'Notification exists in database',
            'Queue job was created'
          ],
          dataCleanup: 'DELETE FROM notifications WHERE id = returned_id'
        },
        {
          it: 'should return 401 if not authenticated',
          preconditions: [],
          steps: [
            'Send POST request without Authorization header'
          ],
          assertions: [
            'Response status = 401',
            'No notification created in database'
          ],
          dataCleanup: 'none'
        }
      ]
    }
  ]
}
```

### Step 2.3: E2E Tests Planning

```typescript
interface E2ETestPlan {
  scenario: string;
  testFile: string;
  tools: string[];
  tests: {
    userStory: string;
    steps: string[];
    expectedOutcome: string;
  }[];
}

const e2eTestPlan: E2ETestPlan = {
  scenario: 'Complete Notification Flow',
  testFile: 'tests/e2e/notification-flow.e2e.test.ts',
  tools: ['Playwright', 'Test Database'],
  tests: [
    {
      userStory: 'As a user, I should receive email notification when task is assigned',
      steps: [
        '1. Login as admin user',
        '2. Create new task',
        '3. Assign task to test user',
        '4. Wait for notification to be sent (async)',
        '5. Check notification status in database',
        '6. Verify email was sent (check email service logs or mock)'
      ],
      expectedOutcome: 'Notification status = "sent", email service called with correct data'
    }
  ]
}
```

### Step 2.4: Test Data Strategy

```typescript
interface TestDataStrategy {
  approach: 'fixtures' | 'factories' | 'builders';
  location: string;
  examples: {
    name: string;
    code: string;
  }[];
}

const testDataStrategy: TestDataStrategy = {
  approach: 'factories',
  location: 'tests/factories/',
  examples: [
    {
      name: 'UserFactory',
      code: `
// tests/factories/user.factory.ts
export const createTestUser = (overrides = {}) => ({
  id: faker.string.uuid(),
  email: faker.internet.email(),
  name: faker.person.fullName(),
  notificationPreferences: {
    email: true,
    sms: false,
    push: true
  },
  ...overrides
});
      `
    },
    {
      name: 'NotificationFactory',
      code: `
// tests/factories/notification.factory.ts
export const createTestNotification = (overrides = {}) => ({
  userId: faker.string.uuid(),
  message: faker.lorem.sentence(),
  type: 'email',
  status: 'pending',
  ...overrides
});
      `
    }
  ]
}
```

### Step 2.5: Mocking Strategy

```typescript
interface MockingStrategy {
  service: string;
  mockApproach: 'jest.mock' | 'manual_mock' | 'test_double';
  mockLocation: string;
  example: string;
}

const mockingStrategies: MockingStrategy[] = [
  {
    service: 'EmailService',
    mockApproach: 'manual_mock',
    mockLocation: 'src/services/__mocks__/email.service.ts',
    example: `
// __mocks__/email.service.ts
export class MockEmailService {
  private sentEmails: any[] = [];
  
  async sendEmail(to: string, subject: string, body: string) {
    this.sentEmails.push({ to, subject, body, sentAt: new Date() });
    return { success: true, messageId: 'mock-id-' + Date.now() };
  }
  
  getSentEmails() {
    return this.sentEmails;
  }
  
  clearSentEmails() {
    this.sentEmails = [];
  }
}
    `
  },
  {
    service: 'NotificationQueue',
    mockApproach: 'jest.mock',
    mockLocation: 'inline in test files',
    example: `
// في test file
jest.mock('../notification-queue.service');

const mockQueue = {
  add: jest.fn().mockResolvedValue({ id: 'job-123' }),
  process: jest.fn()
};
    `
  }
]
```

### Output of Phase 2

```markdown
## Testing Strategy

### Test Distribution (Pyramid)
- **Unit Tests**: 80% coverage
  - All services: `*.service.test.ts`
  - All utilities: `*.util.test.ts`
  - All validators: `*.validator.test.ts`

- **Integration Tests**: 15% coverage
  - API endpoints: `*.controller.integration.test.ts`
  - Database operations: `*.repository.integration.test.ts`

- **E2E Tests**: 5% coverage
  - Critical user flows only
  - notification-flow.e2e.test.ts

### Unit Tests Files to Create
1. `notification.service.test.ts` (Target: 95% coverage)
   - 12 test cases covering all methods
   - Mocks: UserService, EmailService, NotificationQueue

2. `notification.validator.test.ts` (Target: 100% coverage)
   - 8 test cases for all validation rules

### Integration Tests Files to Create
1. `notification.controller.integration.test.ts`
   - 6 test cases covering all endpoints
   - Real database + Redis
   - Test data cleanup after each test

### Test Data Approach
- **Factories** in `tests/factories/`
- Using `@faker-js/faker` for realistic data
- Consistent overrides pattern

### Mocking Strategy
- EmailService: Manual mock with email tracking
- External APIs: MSW (Mock Service Worker)
- Database: Real test database (Docker)
- Redis: Real Redis instance (Docker)

### Pre-Implementation Checklist
- [ ] All test files scaffolded
- [ ] Test factories created
- [ ] Mock services implemented
- [ ] Test database setup script ready
- [ ] CI/CD pipeline configured for tests
```

---

## Phase 3: Rollback Plan

### Objectives
- ضمان إمكانية التراجع عن أي تغيير **بدون فقدان بيانات**
- توثيق خطوات الرجوع بالتفصيل
- تحديد نقاط اللاعودة (point of no return)

### The Rollback Hierarchy

```
Level 1: Code Rollback        ← آمن دائماً (git revert)
Level 2: Config Rollback       ← آمن (env vars, feature flags)
Level 3: Schema Rollback       ← احتياج حذر (migrations)
Level 4: Data Rollback         ← خطر عالي (data loss possible)
```

### Step 3.1: Code Rollback Plan

```typescript
interface CodeRollbackPlan {
  strategy: 'git_revert' | 'feature_flag' | 'deployment_rollback';
  steps: string[];
  timeToRollback: string;
  dataImpact: 'none' | 'low' | 'medium' | 'high';
  prerequisites: string[];
}

const codeRollback: CodeRollbackPlan = {
  strategy: 'feature_flag',
  steps: [
    '1. Set feature flag ENABLE_NOTIFICATIONS=false في production',
    '2. انتظار 5 دقائق لتطبيق التغيير على جميع instances',
    '3. التحقق من توقف إنشاء notifications جديدة',
    '4. مراقبة logs للتأكد من عدم وجود errors'
  ],
  timeToRollback: '< 10 minutes',
  dataImpact: 'none', // فقط توقف الميزة، البيانات الموجودة آمنة
  prerequisites: [
    'Feature flag infrastructure موجودة',
    'Redis متاح (لتخزين feature flags)'
  ]
}
```

### Step 3.2: Database Rollback Plan

```typescript
interface DatabaseRollbackPlan {
  migration: string;
  rollbackSQL: string;
  dataPreservation: {
    backupRequired: boolean;
    backupCommand?: string;
    restoreCommand?: string;
  };
  risks: {
    risk: string;
    probability: 'low' | 'medium' | 'high';
    mitigation: string;
  }[];
  pointOfNoReturn?: string;
}

const dbRollbackPlan: DatabaseRollbackPlan = {
  migration: '20260208_create_notifications_table',
  rollbackSQL: `
    -- Step 1: Backup data (if table has data)
    CREATE TABLE notifications_backup AS SELECT * FROM notifications;
    
    -- Step 2: Drop the table
    DROP TABLE IF EXISTS notifications CASCADE;
    
    -- Step 3: Remove column from users table
    ALTER TABLE users DROP COLUMN IF EXISTS notification_preferences;
    
    -- Optional: Restore backup if needed
    -- CREATE TABLE notifications AS SELECT * FROM notifications_backup;
    -- DROP TABLE notifications_backup;
  `,
  dataPreservation: {
    backupRequired: true,
    backupCommand: 'pg_dump -U postgres -d mydb -t notifications > notifications_backup.sql',
    restoreCommand: 'psql -U postgres -d mydb < notifications_backup.sql'
  },
  risks: [
    {
      risk: 'فقدان بيانات notifications إذا لم يتم عمل backup',
      probability: 'high',
      mitigation: 'إلزامي: backup قبل أي rollback'
    },
    {
      risk: 'Foreign key constraints قد تمنع DROP TABLE',
      probability: 'medium',
      mitigation: 'استخدام CASCADE في DROP statement'
    }
  ],
  pointOfNoReturn: 'بعد حذف backup table (notifications_backup)'
}
```

### Step 3.3: Data Migration Rollback

```typescript
interface DataMigrationRollback {
  migration: string;
  description: string;
  forwardSQL: string;
  rollbackSQL: string;
  verification: {
    beforeRollback: string;
    afterRollback: string;
  };
  estimatedTime: string;
}

// مثال: نقل بيانات من جدول قديم لجديد
const dataMigrationRollback: DataMigrationRollback = {
  migration: 'migrate_user_settings_to_preferences',
  description: 'نقل إعدادات المستخدم من جدول منفصل إلى JSONB column',
  
  forwardSQL: `
    -- Copy data from user_settings to users.notification_preferences
    UPDATE users u
    SET notification_preferences = jsonb_build_object(
      'email', us.email_enabled,
      'sms', us.sms_enabled,
      'push', us.push_enabled
    )
    FROM user_settings us
    WHERE u.id = us.user_id;
  `,
  
  rollbackSQL: `
    -- Restore data from users.notification_preferences to user_settings
    INSERT INTO user_settings (user_id, email_enabled, sms_enabled, push_enabled)
    SELECT 
      id,
      (notification_preferences->>'email')::boolean,
      (notification_preferences->>'sms')::boolean,
      (notification_preferences->>'push')::boolean
    FROM users
    WHERE notification_preferences IS NOT NULL
    ON CONFLICT (user_id) DO UPDATE SET
      email_enabled = EXCLUDED.email_enabled,
      sms_enabled = EXCLUDED.sms_enabled,
      push_enabled = EXCLUDED.push_enabled;
  `,
  
  verification: {
    beforeRollback: `
      SELECT COUNT(*) as users_with_preferences 
      FROM users 
      WHERE notification_preferences IS NOT NULL;
      -- Expected: > 0
    `,
    afterRollback: `
      SELECT COUNT(*) as restored_settings 
      FROM user_settings;
      -- Expected: = count from beforeRollback
    `
  },
  
  estimatedTime: '5-10 minutes for 100K users'
}
```

### Step 3.4: Staged Rollback Strategy

```typescript
interface StagedRollback {
  stages: {
    stage: number;
    name: string;
    actions: string[];
    verification: string;
    rollbackIfFailed: string[];
    proceedIfSuccess: string;
  }[];
}

const stagedRollback: StagedRollback = {
  stages: [
    {
      stage: 1,
      name: 'Disable Feature',
      actions: [
        'Set ENABLE_NOTIFICATIONS=false',
        'Wait 5 minutes for propagation'
      ],
      verification: 'Check metrics: new notifications created = 0',
      rollbackIfFailed: ['Set ENABLE_NOTIFICATIONS=true'],
      proceedIfSuccess: 'Continue to Stage 2'
    },
    {
      stage: 2,
      name: 'Stop Background Jobs',
      actions: [
        'Pause notification queue processing',
        'Wait for current jobs to complete (max 10 min)'
      ],
      verification: 'Queue depth = 0, active jobs = 0',
      rollbackIfFailed: [
        'Resume queue processing',
        'Set ENABLE_NOTIFICATIONS=true'
      ],
      proceedIfSuccess: 'Continue to Stage 3'
    },
    {
      stage: 3,
      name: 'Backup Data',
      actions: [
        'Create notifications_backup table',
        'Verify backup data count matches original'
      ],
      verification: 'SELECT COUNT(*) FROM notifications = SELECT COUNT(*) FROM notifications_backup',
      rollbackIfFailed: [
        'DROP TABLE notifications_backup',
        'Resume queue',
        'Set ENABLE_NOTIFICATIONS=true'
      ],
      proceedIfSuccess: 'Continue to Stage 4 (POINT OF NO RETURN)'
    },
    {
      stage: 4,
      name: 'Schema Rollback (IRREVERSIBLE)',
      actions: [
        'DROP TABLE notifications',
        'ALTER TABLE users DROP COLUMN notification_preferences'
      ],
      verification: 'Tables no longer exist',
      rollbackIfFailed: [
        '⚠️ CRITICAL: Restore from backup immediately',
        'CREATE TABLE notifications AS SELECT * FROM notifications_backup',
        'Contact DBA team'
      ],
      proceedIfSuccess: 'Rollback complete'
    }
  ]
}
```

### Step 3.5: Emergency Rollback Procedure

```typescript
interface EmergencyRollback {
  triggers: string[];
  immediateActions: string[];
  communication: {
    who: string[];
    message: string;
    channel: string;
  }[];
  postmortem: string[];
}

const emergencyRollback: EmergencyRollback = {
  triggers: [
    'Error rate > 5% على notification endpoints',
    'Database connection pool exhausted',
    'Data corruption detected',
    'Security vulnerability discovered'
  ],
  
  immediateActions: [
    '1. STOP: Pause all deployments',
    '2. DISABLE: Set feature flag to false',
    '3. ALERT: Notify #incidents Slack channel',
    '4. VERIFY: Check if disabling stopped the issue',
    '5. ASSESS: Determine if database rollback needed'
  ],
  
  communication: [
    {
      who: ['Engineering Team', 'Product Manager', 'CTO'],
      message: 'Production incident: Notification feature disabled due to [REASON]. Investigating.',
      channel: '#incidents'
    },
    {
      who: ['Support Team'],
      message: 'Notification feature temporarily disabled. Users cannot send/receive notifications.',
      channel: '#support-team'
    }
  ],
  
  postmortem: [
    'Document timeline of events',
    'Root cause analysis',
    'What went wrong?',
    'What went right?',
    'Action items to prevent recurrence'
  ]
}
```

### Output of Phase 3

```markdown
## Rollback Plan

### Rollback Strategy: Staged + Feature Flag

#### Stage 1: Disable Feature (Safe, Reversible)
**Time**: < 5 minutes  
**Data Impact**: None

1. Set `ENABLE_NOTIFICATIONS=false` in production
2. Wait 5 minutes for propagation
3. **Verify**: No new notifications created

**Rollback**: Set `ENABLE_NOTIFICATIONS=true`

#### Stage 2: Stop Background Jobs (Safe, Reversible)
**Time**: 10-15 minutes  
**Data Impact**: None

1. Pause notification queue
2. Wait for jobs to complete
3. **Verify**: Queue depth = 0

**Rollback**: Resume queue processing

#### Stage 3: Backup Data (Safe, Required)
**Time**: 5-10 minutes  
**Data Impact**: None

```sql
CREATE TABLE notifications_backup AS SELECT * FROM notifications;
-- Verify count matches
```

**Rollback**: Drop backup table

#### Stage 4: Schema Rollback (⚠️ POINT OF NO RETURN)
**Time**: 2-5 minutes  
**Data Impact**: HIGH

```sql
-- Backup MUST be completed first
DROP TABLE notifications CASCADE;
ALTER TABLE users DROP COLUMN notification_preferences;
```

**Emergency Restore**:
```sql
CREATE TABLE notifications AS SELECT * FROM notifications_backup;
-- Contact DBA team immediately
```

### Database Rollback Scripts

**File**: `migrations/rollback/20260208_rollback_notifications.sql`

```sql
-- Full rollback script (use with EXTREME caution)
BEGIN;

-- Step 1: Verify backup exists
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'notifications_backup') THEN
    RAISE EXCEPTION 'CRITICAL: Backup table does not exist. ABORT ROLLBACK.';
  END IF;
END $$;

-- Step 2: Drop tables
DROP TABLE IF EXISTS notifications CASCADE;

-- Step 3: Remove column
ALTER TABLE users DROP COLUMN IF EXISTS notification_preferences;

-- Step 4: Optional restore
-- Uncomment if you want to restore data
-- CREATE TABLE notifications AS SELECT * FROM notifications_backup;

COMMIT;
```

### Emergency Procedures

**Triggers for Emergency Rollback**:
- Error rate > 5%
- Database connection pool exhausted
- Data corruption detected

**Immediate Actions**:
1. **STOP** all deployments
2. **DISABLE** feature flag
3. **ALERT** #incidents channel
4. **VERIFY** issue stopped
5. **ASSESS** need for DB rollback

**Communication Matrix**:
| Audience | Channel | Message |
|----------|---------|---------|
| Engineering | #incidents | Production incident details |
| Support | #support-team | Feature disabled message |
| Management | Email + Slack | High-level summary |

### Rollback Testing
- [ ] Test rollback procedure in staging
- [ ] Verify backup/restore works
- [ ] Document rollback time (actual vs estimated)
- [ ] Practice emergency rollback drill

### Point of No Return
⚠️ **After executing DROP TABLE without verified backup**

Before this point: All changes reversible  
After this point: Data loss possible, restore from backup required
```

---

## Phase 4: Edge Cases Analysis

### Objectives
- تحديد **كل** الحالات الحدية المحتملة
- توثيق السلوك المتوقع لكل حالة
- ضمان التعامل الصحيح مع الحالات الشاذة

### Edge Case Categories

```typescript
enum EdgeCaseCategory {
  INPUT_VALIDATION = 'Input Validation',
  BOUNDARY_CONDITIONS = 'Boundary Conditions',
  RACE_CONDITIONS = 'Race Conditions',
  NETWORK_FAILURES = 'Network Failures',
  DATA_INTEGRITY = 'Data Integrity',
  CONCURRENCY = 'Concurrency Issues',
  PERFORMANCE = 'Performance Limits'
}
```

### Step 4.1: Input Validation Edge Cases

```typescript
interface InputEdgeCase {
  category: EdgeCaseCategory;
  case: string;
  input: any;
  expectedBehavior: string;
  actualTest: string;
  priority: 'must_handle' | 'should_handle' | 'nice_to_have';
}

const inputEdgeCases: InputEdgeCase[] = [
  {
    category: EdgeCaseCategory.INPUT_VALIDATION,
    case: 'Empty message',
    input: { userId: '123', message: '', type: 'email' },
    expectedBehavior: 'Return 400 with error: "Message cannot be empty"',
    actualTest: `
      it('should reject empty message', async () => {
        const response = await request(app)
          .post('/api/notifications')
          .send({ userId: '123', message: '', type: 'email' });
        expect(response.status).toBe(400);
        expect(response.body.error).toContain('empty');
      });
    `,
    priority: 'must_handle'
  },
  {
    category: EdgeCaseCategory.INPUT_VALIDATION,
    case: 'Message exceeds max length (500 chars)',
    input: { userId: '123', message: 'a'.repeat(501), type: 'email' },
    expectedBehavior: 'Return 400 with error: "Message too long (max 500 characters)"',
    actualTest: `
      it('should reject message > 500 chars', async () => {
        const longMessage = 'a'.repeat(501);
        const response = await request(app)
          .post('/api/notifications')
          .send({ userId: '123', message: longMessage, type: 'email' });
        expect(response.status).toBe(400);
        expect(response.body.error).toContain('too long');
      });
    `,
    priority: 'must_handle'
  },
  {
    category: EdgeCaseCategory.INPUT_VALIDATION,
    case: 'Invalid notification type',
    input: { userId: '123', message: 'Test', type: 'telegram' },
    expectedBehavior: 'Return 400 with error: "Invalid type. Must be: email, sms, or push"',
    actualTest: `
      it('should reject invalid notification type', async () => {
        const response = await request(app)
          .post('/api/notifications')
          .send({ userId: '123', message: 'Test', type: 'telegram' });
        expect(response.status).toBe(400);
        expect(response.body.error).toContain('Invalid type');
      });
    `,
    priority: 'must_handle'
  },
  {
    category: EdgeCaseCategory.INPUT_VALIDATION,
    case: 'Special characters in message (XSS attempt)',
    input: { userId: '123', message: '<script>alert("xss")</script>', type: 'email' },
    expectedBehavior: 'Sanitize input, store safely, no script execution',
    actualTest: `
      it('should sanitize XSS attempts', async () => {
        const xssPayload = '<script>alert("xss")</script>';
        const response = await request(app)
          .post('/api/notifications')
          .send({ userId: '123', message: xssPayload, type: 'email' });
        
        expect(response.status).toBe(201);
        const notification = await Notification.findById(response.body.notificationId);
        expect(notification.message).not.toContain('<script>');
      });
    `,
    priority: 'must_handle'
  }
]
```

### Step 4.2: Boundary Conditions

```typescript
const boundaryEdgeCases: InputEdgeCase[] = [
  {
    category: EdgeCaseCategory.BOUNDARY_CONDITIONS,
    case: 'User with 0 notification preferences',
    input: { userId: 'user-with-no-prefs', message: 'Test', type: 'email' },
    expectedBehavior: 'Use default preferences: {email: true, sms: false, push: true}',
    actualTest: `
      it('should use default preferences if user has none', async () => {
        // User with notification_preferences = null
        const user = await User.create({ 
          email: 'test@example.com',
          notification_preferences: null 
        });
        
        const response = await sendNotification(user.id, 'Test', 'email');
        expect(response.success).toBe(true);
        // Verify email was sent (preferences defaulted to enabled)
      });
    `,
    priority: 'must_handle'
  },
  {
    category: EdgeCaseCategory.BOUNDARY_CONDITIONS,
    case: 'Send notification to deleted user',
    input: { userId: 'deleted-user-id', message: 'Test', type: 'email' },
    expectedBehavior: 'Return 404 with error: "User not found"',
    actualTest: `
      it('should return 404 for deleted user', async () => {
        const response = await request(app)
          .post('/api/notifications')
          .send({ userId: 'non-existent-id', message: 'Test', type: 'email' });
        expect(response.status).toBe(404);
      });
    `,
    priority: 'must_handle'
  },
  {
    category: EdgeCaseCategory.BOUNDARY_CONDITIONS,
    case: 'Exactly 500 characters (boundary test)',
    input: { userId: '123', message: 'a'.repeat(500), type: 'email' },
    expectedBehavior: 'Accept successfully (exactly at limit)',
    actualTest: `
      it('should accept message with exactly 500 chars', async () => {
        const exactMessage = 'a'.repeat(500);
        const response = await request(app)
          .post('/api/notifications')
          .send({ userId: '123', message: exactMessage, type: 'email' });
        expect(response.status).toBe(201);
      });
    `,
    priority: 'should_handle'
  }
]
```

### Step 4.3: Race Conditions

```typescript
const raceConditionEdgeCases: InputEdgeCase[] = [
  {
    category: EdgeCaseCategory.RACE_CONDITIONS,
    case: 'Two simultaneous requests to send notification to same user',
    input: 'Concurrent POST requests',
    expectedBehavior: 'Both notifications created successfully with unique IDs',
    actualTest: `
      it('should handle concurrent notification creation', async () => {
        const requests = Array(10).fill(null).map(() => 
          request(app)
            .post('/api/notifications')
            .send({ userId: '123', message: 'Test', type: 'email' })
        );
        
        const responses = await Promise.all(requests);
        
        // All should succeed
        responses.forEach(r => expect(r.status).toBe(201));
        
        // All should have unique IDs
        const ids = responses.map(r => r.body.notificationId);
        const uniqueIds = new Set(ids);
        expect(uniqueIds.size).toBe(10);
      });
    `,
    priority: 'must_handle'
  },
  {
    category: EdgeCaseCategory.RACE_CONDITIONS,
    case: 'User updates preferences while notification being sent',
    input: 'Simultaneous: UPDATE user_preferences + sendNotification',
    expectedBehavior: 'Use preferences snapshot from when notification created',
    actualTest: `
      it('should use preferences at notification creation time', async () => {
        // This requires transaction isolation or snapshot pattern
        // Test implementation depends on chosen solution
      });
    `,
    priority: 'should_handle'
  }
]
```

### Step 4.4: Network Failures

```typescript
const networkFailureEdgeCases: InputEdgeCase[] = [
  {
    category: EdgeCaseCategory.NETWORK_FAILURES,
    case: 'Redis is down',
    input: 'Queue.add() throws connection error',
    expectedBehavior: 'Return 503, notification saved to DB but not queued, retry later',
    actualTest: `
      it('should handle Redis downtime gracefully', async () => {
        // Mock Redis to throw error
        jest.spyOn(queue, 'add').mockRejectedValue(new Error('Redis unavailable'));
        
        const response = await request(app)
          .post('/api/notifications')
          .send({ userId: '123', message: 'Test', type: 'email' });
        
        expect(response.status).toBe(503);
        
        // Notification should be in DB with status='failed'
        const notification = await Notification.findOne({ 
          userId: '123', 
          status: 'failed' 
        });
        expect(notification).toBeDefined();
      });
    `,
    priority: 'must_handle'
  },
  {
    category: EdgeCaseCategory.NETWORK_FAILURES,
    case: 'Email service timeout',
    input: 'EmailService.send() takes > 30 seconds',
    expectedBehavior: 'Timeout after 30s, mark notification as failed, retry via queue',
    actualTest: `
      it('should timeout slow email service', async () => {
        // Mock EmailService to delay
        jest.spyOn(emailService, 'sendEmail').mockImplementation(
          () => new Promise(resolve => setTimeout(resolve, 35000))
        );
        
        const processor = new EmailNotificationProcessor();
        await expect(processor.process(job)).rejects.toThrow('Timeout');
        
        // Should be retried by queue
      });
    `,
    priority: 'must_handle'
  }
]
```

### Step 4.5: Data Integrity Edge Cases

```typescript
const dataIntegrityEdgeCases: InputEdgeCase[] = [
  {
    category: EdgeCaseCategory.DATA_INTEGRITY,
    case: 'Database transaction fails mid-save',
    input: 'DB error after notification created but before response sent',
    expectedBehavior: 'Transaction rollback, return 500, no partial data',
    actualTest: `
      it('should rollback on transaction failure', async () => {
        // Mock DB to fail after first insert
        const createSpy = jest.spyOn(Notification, 'create')
          .mockRejectedValueOnce(new Error('DB write failed'));
        
        await expect(
          notificationService.sendNotification('123', 'Test', 'email')
        ).rejects.toThrow();
        
        // Verify no notification in DB
        const count = await Notification.countDocuments({ userId: '123' });
        expect(count).toBe(0);
      });
    `,
    priority: 'must_handle'
  },
  {
    category: EdgeCaseCategory.DATA_INTEGRITY,
    case: 'Foreign key constraint violation (user deleted mid-request)',
    input: 'User deleted between validation and insert',
    expectedBehavior: 'Return 404, no notification created',
    actualTest: `
      it('should handle user deletion mid-request', async () => {
        const user = await User.create({ email: 'test@example.com' });
        
        // Delete user in the middle of notification creation
        const originalCreate = Notification.create;
        Notification.create = async function(data) {
          await User.findByIdAndDelete(user.id);
          return originalCreate.call(this, data);
        };
        
        await expect(
          notificationService.sendNotification(user.id, 'Test', 'email')
        ).rejects.toThrow('User not found');
      });
    `,
    priority: 'should_handle'
  }
]
```

### Step 4.6: Performance Edge Cases

```typescript
const performanceEdgeCases: InputEdgeCase[] = [
  {
    category: EdgeCaseCategory.PERFORMANCE,
    case: 'Sending 1000 notifications simultaneously',
    input: 'Bulk notification request',
    expectedBehavior: 'Queue all, process with configured concurrency (5), no memory overflow',
    actualTest: `
      it('should handle bulk notifications without memory overflow', async () => {
        const bulkRequests = Array(1000).fill(null).map((_, i) => ({
          userId: \`user-\${i}\`,
          message: 'Bulk test',
          type: 'email'
        }));
        
        const startMemory = process.memoryUsage().heapUsed;
        
        await notificationService.sendBulk(bulkRequests);
        
        const endMemory = process.memoryUsage().heapUsed;
        const memoryIncrease = (endMemory - startMemory) / 1024 / 1024; // MB
        
        expect(memoryIncrease).toBeLessThan(100); // < 100MB increase
      });
    `,
    priority: 'should_handle'
  },
  {
    category: EdgeCaseCategory.PERFORMANCE,
    case: 'Message with 500 chars in Arabic (RTL text)',
    input: { message: 'نص عربي '.repeat(100), type: 'email' },
    expectedBehavior: 'Handle correctly, character count not byte count',
    actualTest: `
      it('should count Unicode characters correctly', async () => {
        const arabicText = 'مرحبا '.repeat(100); // 500 chars
        const response = await request(app)
          .post('/api/notifications')
          .send({ userId: '123', message: arabicText, type: 'email' });
        
        expect(response.status).toBe(201);
      });
    `,
    priority: 'should_handle'
  }
]
```

### Output of Phase 4

```markdown
## Edge Cases Analysis

### Total Edge Cases Identified: 20

#### Category Breakdown
| Category | Must Handle | Should Handle | Nice to Have | Total |
|----------|-------------|---------------|--------------|-------|
| Input Validation | 4 | 0 | 0 | 4 |
| Boundary Conditions | 2 | 1 | 0 | 3 |
| Race Conditions | 1 | 1 | 0 | 2 |
| Network Failures | 2 | 0 | 0 | 2 |
| Data Integrity | 1 | 1 | 0 | 2 |
| Performance | 0 | 2 | 0 | 2 |
| **Total** | **10** | **5** | **0** | **15** |

### Critical Edge Cases (Must Handle)

#### 1. Empty Message
- **Expected**: 400 Bad Request
- **Test**: `notification.validation.test.ts`
- **Implementation**: Add validator before service call

#### 2. Message > 500 chars
- **Expected**: 400 Bad Request with clear error
- **Test**: `notification.validation.test.ts`
- **Implementation**: Joi schema with max length

#### 3. Invalid notification type
- **Expected**: 400 with list of valid types
- **Test**: `notification.validation.test.ts`
- **Implementation**: Enum validation

#### 4. XSS in message content
- **Expected**: Sanitize, no script execution
- **Test**: `notification.security.test.ts`
- **Implementation**: Use DOMPurify or validator.escape()

#### 5. User not found (deleted user)
- **Expected**: 404 User Not Found
- **Test**: `notification.service.test.ts`
- **Implementation**: Check user exists before creating notification

#### 6. Concurrent notifications to same user
- **Expected**: All succeed with unique IDs
- **Test**: `notification.concurrency.test.ts`
- **Implementation**: Ensure DB generates unique IDs (UUID or auto-increment)

#### 7. Redis unavailable
- **Expected**: 503 Service Unavailable, save to DB, retry later
- **Test**: `notification.resilience.test.ts`
- **Implementation**: Try-catch around queue.add(), fallback strategy

#### 8. Email service timeout
- **Expected**: Timeout after 30s, mark failed, retry
- **Test**: `email-processor.test.ts`
- **Implementation**: Set timeout on email service calls

#### 9. Transaction rollback on error
- **Expected**: No partial data saved
- **Test**: `notification.transaction.test.ts`
- **Implementation**: Use DB transactions

#### 10. User with null preferences
- **Expected**: Use safe defaults
- **Test**: `notification.service.test.ts`
- **Implementation**: `preferences ?? DEFAULT_PREFERENCES`

### Edge Case Test Checklist
- [ ] All "Must Handle" cases have tests written
- [ ] All "Should Handle" cases have tests written
- [ ] Security edge cases (XSS, injection) covered
- [ ] Network failure scenarios tested
- [ ] Database transaction failures tested
- [ ] Concurrency scenarios tested
- [ ] Performance limits tested (1000+ notifications)

### Handling Strategy per Category

**Input Validation**: Validate at API layer (middleware)  
**Boundary Conditions**: Defensive programming + defaults  
**Race Conditions**: Database constraints + transactions  
**Network Failures**: Retry logic + circuit breaker  
**Data Integrity**: Transactions + foreign key constraints  
**Performance**: Rate limiting + queue-based processing
```

---

## Phase 5: Technical Feasibility Assessment

### Objectives
- تحديد ما هو **واقعي تقنياً** وما هو **غير واقعي**
- تقييم القيود (constraints) التقنية
- اقتراح البدائل للمتطلبات غير الواقعية

### Step 5.1: Requirements vs Reality Check

```typescript
interface FeasibilityCheck {
  requirement: string;
  requestedBy: string;
  feasibility: 'realistic' | 'challenging' | 'unrealistic' | 'impossible';
  reasoning: string;
  constraints: string[];
  alternative?: string;
  estimatedEffort?: string;
}

const feasibilityChecks: FeasibilityCheck[] = [
  {
    requirement: 'Send email notification within 100ms',
    requestedBy: 'Product Manager',
    feasibility: 'unrealistic',
    reasoning: `
      - Email services (SendGrid, Mailgun) typically take 200-500ms per email
      - Network latency alone can be 50-100ms
      - Cannot guarantee 100ms SLA
    `,
    constraints: [
      'Email service API response time: ~300ms average',
      'Network variability: 50-200ms',
      'Email rendering time: 50-100ms'
    ],
    alternative: `
      Realistic approach:
      1. Return API response immediately (< 100ms)
      2. Queue email for async processing
      3. User gets instant confirmation, email sent in background
      4. Realistic email delivery: 1-3 seconds
    `,
    estimatedEffort: 'No additional effort, this is the recommended architecture'
  },
  {
    requirement: 'Support 10,000 notifications per second',
    requestedBy: 'Business Team',
    feasibility: 'challenging',
    reasoning: `
      - Current architecture: single server can handle ~500 req/s
      - 10K/s requires horizontal scaling + load balancing
      - Database needs sharding or read replicas
      - Queue needs clustering (Bull + Redis Cluster)
    `,
    constraints: [
      'Single Express instance limit: ~500 req/s',
      'Database write limit: ~1000 inserts/s per instance',
      'Redis single instance: ~10K ops/s'
    ],
    alternative: `
      Phased approach:
      Phase 1: Optimize to 1K/s (vertical scaling + caching)
      Phase 2: Horizontal scaling to 5K/s (load balancer + 10 instances)
      Phase 3: Full distributed system for 10K/s
      
      Estimated cost: $5K/month infrastructure (vs $500/month currently)
    `,
    estimatedEffort: 'Phase 1: 2 weeks, Phase 2: 4 weeks, Phase 3: 8 weeks'
  },
  {
    requirement: 'Zero downtime database migration',
    requestedBy: 'DevOps',
    feasibility: 'realistic',
    reasoning: `
      Achievable with proper migration strategy:
      1. Add new column/table without dropping old ones
      2. Dual-write to both old and new schema
      3. Backfill data
      4. Switch reads to new schema
      5. Remove old schema after verification
    `,
    constraints: [
      'Requires multiple deployment steps',
      'Temporary storage increase (dual schema)',
      'Performance impact during dual-write period'
    ],
    alternative: null, // No alternative needed, this is realistic
    estimatedEffort: '3-4 days including testing and monitoring'
  },
  {
    requirement: 'Guarantee email delivery within 1 second',
    requestedBy: 'Sales Team',
    feasibility: 'unrealistic',
    reasoning: `
      Email delivery depends on external factors:
      - Recipient's mail server response time
      - DNS lookups
      - Spam filtering
      - Network conditions
      
      We can only control our sending time, not recipient receipt time.
    `,
    constraints: [
      'Email protocol (SMTP) doesn't guarantee instant delivery',
      'Recipient server may queue emails',
      'Some emails take minutes or hours to arrive'
    ],
    alternative: `
      What we CAN guarantee:
      - Email sent from our server within 3 seconds (99th percentile)
      - Confirmation that email was accepted by recipient server
      - Retry mechanism for failed sends
      
      What we CANNOT guarantee:
      - When user actually receives email (depends on their provider)
      - That email won't go to spam folder
    `,
    estimatedEffort: 'N/A - set expectations, not technical effort'
  }
]
```

### Step 5.2: Technical Constraints Documentation

```typescript
interface TechnicalConstraint {
  category: 'infrastructure' | 'database' | 'api' | 'performance' | 'security';
  constraint: string;
  impact: string;
  workaround?: string;
}

const technicalConstraints: TechnicalConstraint[] = [
  {
    category: 'database',
    constraint: 'PostgreSQL row-level lock timeout: 30 seconds',
    impact: 'Long-running transactions will fail after 30s',
    workaround: 'Break large operations into smaller batches'
  },
  {
    category: 'infrastructure',
    constraint: 'API Gateway timeout: 29 seconds',
    impact: 'All API requests must complete within 29s',
    workaround: 'Use async processing for long-running tasks'
  },
  {
    category: 'api',
    constraint: 'Email service rate limit: 100 emails/minute',
    impact: 'Cannot send more than 100 emails/min without queuing',
    workaround: 'Implement queue with rate limiting'
  },
  {
    category: 'performance',
    constraint: 'Node.js single-threaded event loop',
    impact: 'CPU-intensive tasks block other requests',
    workaround: 'Use worker threads or separate service for heavy processing'
  },
  {
    category: 'security',
    constraint: 'API keys cannot be stored in frontend code',
    impact: 'All email sending must go through backend API',
    workaround: 'Already planned architecture - no workaround needed'
  }
]
```

### Step 5.3: Performance Limits

```typescript
interface PerformanceLimit {
  component: string;
  metric: string;
  limit: number;
  unit: string;
  testMethod: string;
  exceedanceStrategy: string;
}

const performanceLimits: PerformanceLimit[] = [
  {
    component: 'Express Server (single instance)',
    metric: 'Requests per second',
    limit: 500,
    unit: 'req/s',
    testMethod: 'Load test with Apache Bench: ab -n 10000 -c 100',
    exceedanceStrategy: 'Horizontal scaling: Add more server instances behind load balancer'
  },
  {
    component: 'PostgreSQL',
    metric: 'Concurrent connections',
    limit: 100,
    unit: 'connections',
    testMethod: 'Monitor pg_stat_activity table',
    exceedanceStrategy: 'Connection pooling (PgBouncer) or read replicas'
  },
  {
    component: 'Redis',
    metric: 'Memory usage',
    limit: 512,
    unit: 'MB',
    testMethod: 'redis-cli INFO memory',
    exceedanceStrategy: 'Increase Redis memory or implement TTL on keys'
  },
  {
    component: 'Email Queue',
    metric: 'Processing rate',
    limit: 100,
    unit: 'emails/min',
    testMethod: 'Queue metrics dashboard',
    exceedanceStrategy: 'Upgrade email service plan or distribute across multiple senders'
  }
]
```

### Step 5.4: Realistic Timeline

```typescript
interface TimelineEstimate {
  phase: string;
  tasks: string[];
  optimistic: string;
  realistic: string;
  pessimistic: string;
  assumptions: string[];
  risks: string[];
}

const timeline: TimelineEstimate[] = [
  {
    phase: 'Infrastructure Setup',
    tasks: ['Install Redis', 'Configure env vars', 'Update CI/CD'],
    optimistic: '4 hours',
    realistic: '1 day',
    pessimistic: '2 days',
    assumptions: [
      'Docker already set up',
      'Team has Redis experience',
      'No infrastructure blockers'
    ],
    risks: [
      'Redis configuration issues',
      'Network/firewall restrictions'
    ]
  },
  {
    phase: 'Database Migration',
    tasks: ['Write migration', 'Test on staging', 'Run on production'],
    optimistic: '4 hours',
    realistic: '1 day',
    pessimistic: '3 days',
    assumptions: [
      'Migration is straightforward',
      'No data conflicts',
      'Database backup in place'
    ],
    risks: [
      'Migration fails on production',
      'Need rollback',
      'Foreign key conflicts'
    ]
  },
  {
    phase: 'Core Implementation',
    tasks: ['Services', 'Controllers', 'Routes', 'Queue processors'],
    optimistic: '2 days',
    realistic: '4 days',
    pessimistic: '1 week',
    assumptions: [
      'Requirements clear',
      'No major blockers',
      'Developer familiar with stack'
    ],
    risks: [
      'Requirements change mid-implementation',
      'Technical challenges discovered',
      'Integration issues'
    ]
  },
  {
    phase: 'Testing',
    tasks: ['Unit tests', 'Integration tests', 'Manual testing'],
    optimistic: '1 day',
    realistic: '2 days',
    pessimistic: '4 days',
    assumptions: [
      'Test infrastructure ready',
      'Clear acceptance criteria'
    ],
    risks: [
      'Bugs discovered',
      'Edge cases not handled',
      'Performance issues'
    ]
  }
]

// Total realistic timeline
const totalRealistic = '8-10 working days (~2 weeks)'
```

### Output of Phase 5

```markdown
## Technical Feasibility Assessment

### Requirements Reality Check

#### ✅ Realistic Requirements
1. **Zero downtime migration** - Achievable with multi-step deployment
2. **Queue-based async processing** - Standard pattern, well-supported
3. **500 req/s throughput** - Within single server capabilities

#### ⚠️ Challenging but Possible
1. **10,000 notifications/second**
   - Requires: Horizontal scaling, database sharding, Redis cluster
   - Estimated effort: 8-12 weeks
   - Infrastructure cost: $5K/month (vs $500/month now)
   - **Recommendation**: Start with 1K/s target, scale incrementally

#### ❌ Unrealistic Requirements
1. **Email delivery in 100ms**
   - External email APIs take 200-500ms minimum
   - **Alternative**: Instant API response, async email delivery (1-3s)
   
2. **Guarantee email arrival in 1 second**
   - Email protocol doesn't support this
   - **Alternative**: Guarantee our send within 3s, track delivery status

### Technical Constraints

| Component | Constraint | Impact | Mitigation |
|-----------|------------|--------|------------|
| PostgreSQL | 30s lock timeout | Long transactions fail | Batch operations |
| API Gateway | 29s timeout | Long requests fail | Async processing |
| Email Service | 100/min rate limit | Sending throttled | Queue implementation |
| Node.js | Single-threaded | CPU tasks block | Worker threads |

### Performance Limits

| Component | Limit | Exceedance Strategy |
|-----------|-------|---------------------|
| Express | 500 req/s | Horizontal scaling |
| PostgreSQL | 100 connections | Connection pooling |
| Redis | 512 MB memory | TTL or memory upgrade |
| Email Queue | 100/min | Service upgrade |

### Realistic Timeline

**Total Estimated Time**: **8-10 working days (2 weeks)**

| Phase | Realistic | Pessimistic | Key Risks |
|-------|-----------|-------------|-----------|
| Infrastructure | 1 day | 2 days | Redis config issues |
| Migration | 1 day | 3 days | Production rollback |
| Implementation | 4 days | 1 week | Requirements changes |
| Testing | 2 days | 4 days | Unexpected bugs |

### Assumptions
- Developer familiar with TypeScript/Node.js/Express
- Docker and CI/CD already configured
- Database backups in place
- Clear requirements (no mid-implementation changes)
- No major infrastructure blockers

### High-Risk Areas
1. **Database migration in production** - Requires careful planning + rollback
2. **Email service integration** - External dependency, failure modes
3. **Queue processing reliability** - Must handle crashes gracefully

### Go/No-Go Decision

✅ **GO** if:
- Timeline of 2 weeks acceptable
- Infrastructure budget approved ($100/month for Redis)
- Team comfortable with async/queue patterns
- Clear understanding that email delivery is not instant

❌ **NO-GO** if:
- Need instant email delivery (technically impossible)
- Need 10K/s without major infrastructure investment
- Cannot accept 2-week timeline
```

---

## Phase 6: Step-by-Step Execution Plan

### Objectives
- خطة تنفيذ تفصيلية خطوة بخطوة
- ترتيب المهام حسب التبعيات
- نقاط التحقق (checkpoints) في كل مرحلة

### Execution Phases

```typescript
interface ExecutionPhase {
  phase: number;
  name: string;
  duration: string;
  tasks: ExecutionTask[];
  checkpoints: Checkpoint[];
  rollbackPoint: string;
}

interface ExecutionTask {
  id: string;
  task: string;
  owner: string;
  prerequisites: string[];
  steps: string[];
  verification: string;
  outputs: string[];
}

interface Checkpoint {
  name: string;
  criteria: string[];
  failureAction: string;
}
```

### Step 6.1: Pre-Implementation Phase

```typescript
const preImplementation: ExecutionPhase = {
  phase: 0,
  name: 'Pre-Implementation Setup',
  duration: '1 day',
  tasks: [
    {
      id: 'TASK-0.1',
      task: 'Environment Setup',
      owner: 'DevOps',
      prerequisites: [],
      steps: [
        '1. Install Redis in development environment',
        '2. Install Redis in staging environment',
        '3. Configure Redis password and persistence',
        '4. Update .env.example with REDIS_URL',
        '5. Document Redis setup in README'
      ],
      verification: 'redis-cli ping → PONG',
      outputs: [
        'Redis running on dev and staging',
        'Environment variables documented'
      ]
    },
    {
      id: 'TASK-0.2',
      task: 'Create Feature Branch',
      owner: 'Developer',
      prerequisites: [],
      steps: [
        '1. Pull latest main branch',
        '2. Create feature branch: feature/notification-system',
        '3. Push empty branch to remote',
        '4. Set up CI/CD for branch'
      ],
      verification: 'git log shows feature branch',
      outputs: ['Feature branch ready']
    },
    {
      id: 'TASK-0.3',
      task: 'Database Backup',
      owner: 'DBA',
      prerequisites: [],
      steps: [
        '1. Create full backup of staging database',
        '2. Verify backup integrity',
        '3. Document backup location',
        '4. Test restore procedure'
      ],
      verification: 'Successful test restore',
      outputs: ['Verified database backup']
    }
  ],
  checkpoints: [
    {
      name: 'Pre-Implementation Complete',
      criteria: [
        'Redis accessible from app',
        'Feature branch created',
        'Database backup verified'
      ],
      failureAction: 'Do not proceed to Phase 1'
    }
  ],
  rollbackPoint: 'Delete feature branch, remove Redis'
}
```

### Step 6.2: Database Migration Phase

```typescript
const databaseMigration: ExecutionPhase = {
  phase: 1,
  name: 'Database Migration',
  duration: '4-6 hours',
  tasks: [
    {
      id: 'TASK-1.1',
      task: 'Write Migration File',
      owner: 'Backend Developer',
      prerequisites: ['TASK-0.1', 'TASK-0.2'],
      steps: [
        '1. Create migration file: 20260208_create_notifications_table.ts',
        '2. Write up() function (create table + indexes)',
        '3. Write down() function (rollback)',
        '4. Add migration to version control',
        '5. Peer review migration code'
      ],
      verification: 'Migration code reviewed and approved',
      outputs: ['migrations/20260208_create_notifications_table.ts']
    },
    {
      id: 'TASK-1.2',
      task: 'Test Migration on Development',
      owner: 'Backend Developer',
      prerequisites: ['TASK-1.1'],
      steps: [
        '1. Run migration: npm run migrate:up',
        '2. Verify tables created: \\dt in psql',
        '3. Insert test data manually',
        '4. Run rollback: npm run migrate:down',
        '5. Verify tables dropped and data cleaned',
        '6. Re-run migration (verify idempotence)'
      ],
      verification: 'Migration works both ways without errors',
      outputs: ['Dev database with notifications table']
    },
    {
      id: 'TASK-1.3',
      task: 'Run Migration on Staging',
      owner: 'DevOps + DBA',
      prerequisites: ['TASK-1.2', 'TASK-0.3'],
      steps: [
        '1. Announce maintenance window (if needed)',
        '2. Take final backup of staging DB',
        '3. Run migration: npm run migrate:up (staging)',
        '4. Verify schema changes: SELECT * FROM information_schema.tables',
        '5. Check for any errors in migration logs',
        '6. Run smoke tests on staging'
      ],
      verification: 'Staging DB schema updated successfully',
      outputs: ['Staging database migrated']
    }
  ],
  checkpoints: [
    {
      name: 'Migration Verified on Staging',
      criteria: [
        'Tables exist in staging database',
        'Indexes created successfully',
        'No errors in logs',
        'Rollback tested and works'
      ],
      failureAction: 'Rollback migration, investigate issue, fix, retry'
    }
  ],
  rollbackPoint: 'Run migration down() on staging, restore from backup if needed'
}
```

### Step 6.3: Core Implementation Phase

```typescript
const coreImplementation: ExecutionPhase = {
  phase: 2,
  name: 'Core Services Implementation',
  duration: '3-4 days',
  tasks: [
    {
      id: 'TASK-2.1',
      task: 'Notification Model & Repository',
      owner: 'Backend Developer',
      prerequisites: ['TASK-1.3'],
      steps: [
        '1. Create Notification model: src/models/notification.model.ts',
        '2. Define TypeScript interface for Notification',
        '3. Create NotificationRepository: src/repositories/notification.repository.ts',
        '4. Implement CRUD methods (create, findById, update, delete)',
        '5. Write unit tests for repository',
        '6. Run tests: npm test notification.repository'
      ],
      verification: 'All repository tests pass',
      outputs: [
        'notification.model.ts',
        'notification.repository.ts',
        'notification.repository.test.ts'
      ]
    },
    {
      id: 'TASK-2.2',
      task: 'Notification Queue Service',
      owner: 'Backend Developer',
      prerequisites: ['TASK-0.1'],
      steps: [
        '1. Install Bull: npm install bull',
        '2. Create queue service: src/services/notification-queue.service.ts',
        '3. Configure Bull with Redis connection',
        '4. Implement add() method',
        '5. Implement process() method',
        '6. Add error handling and retry logic',
        '7. Write unit tests with mocked Redis'
      ],
      verification: 'Queue service tests pass',
      outputs: [
        'notification-queue.service.ts',
        'notification-queue.service.test.ts'
      ]
    },
    {
      id: 'TASK-2.3',
      task: 'Notification Service (Business Logic)',
      owner: 'Backend Developer',
      prerequisites: ['TASK-2.1', 'TASK-2.2'],
      steps: [
        '1. Create service: src/services/notification.service.ts',
        '2. Implement sendNotification(userId, message, type)',
        '3. Add validation logic',
        '4. Integrate with NotificationRepository',
        '5. Integrate with NotificationQueue',
        '6. Add error handling',
        '7. Write comprehensive unit tests (12+ test cases)',
        '8. Run tests: npm test notification.service'
      ],
      verification: 'All service tests pass with >90% coverage',
      outputs: [
        'notification.service.ts',
        'notification.service.test.ts'
      ]
    },
    {
      id: 'TASK-2.4',
      task: 'Email Notification Processor',
      owner: 'Backend Developer',
      prerequisites: ['TASK-2.2'],
      steps: [
        '1. Create processor: src/processors/email-notification.processor.ts',
        '2. Implement process(job) method',
        '3. Integrate with EmailService',
        '4. Update notification status after send',
        '5. Add timeout handling (30s)',
        '6. Write unit tests with mocked EmailService'
      ],
      verification: 'Processor tests pass',
      outputs: [
        'email-notification.processor.ts',
        'email-notification.processor.test.ts'
      ]
    }
  ],
  checkpoints: [
    {
      name: 'Core Services Complete',
      criteria: [
        'All unit tests pass',
        'Code coverage > 90%',
        'No TypeScript errors',
        'Code reviewed and approved'
      ],
      failureAction: 'Fix failing tests, address code review comments'
    }
  ],
  rollbackPoint: 'Git revert commits, feature flag remains off'
}
```

### Step 6.4: API Implementation Phase

```typescript
const apiImplementation: ExecutionPhase = {
  phase: 3,
  name: 'API Endpoints',
  duration: '1-2 days',
  tasks: [
    {
      id: 'TASK-3.1',
      task: 'Notification Controller',
      owner: 'Backend Developer',
      prerequisites: ['TASK-2.3'],
      steps: [
        '1. Create controller: src/controllers/notification.controller.ts',
        '2. Implement POST /api/notifications endpoint',
        '3. Implement GET /api/notifications/:id endpoint',
        '4. Add request validation middleware',
        '5. Add authentication middleware',
        '6. Write integration tests',
        '7. Run integration tests'
      ],
      verification: 'Integration tests pass',
      outputs: [
        'notification.controller.ts',
        'notification.controller.integration.test.ts'
      ]
    },
    {
      id: 'TASK-3.2',
      task: 'Routes Setup',
      owner: 'Backend Developer',
      prerequisites: ['TASK-3.1'],
      steps: [
        '1. Create routes: src/routes/notification.routes.ts',
        '2. Register routes in src/routes/index.ts',
        '3. Add feature flag check middleware',
        '4. Test routes manually with Postman/Insomnia',
        '5. Document API endpoints (Swagger/OpenAPI)'
      ],
      verification: 'Manual API tests successful',
      outputs: [
        'notification.routes.ts',
        'API documentation updated'
      ]
    }
  ],
  checkpoints: [
    {
      name: 'API Ready',
      criteria: [
        'All endpoints work in staging',
        'Authentication enforced',
        'Validation working',
        'Error responses correct'
      ],
      failureAction: 'Fix issues before proceeding'
    }
  ],
  rollbackPoint: 'Remove routes registration, feature flag off'
}
```

### Step 6.5: Testing & QA Phase

```typescript
const testingQA: ExecutionPhase = {
  phase: 4,
  name: 'Comprehensive Testing',
  duration: '2-3 days',
  tasks: [
    {
      id: 'TASK-4.1',
      task: 'Complete Test Suite',
      owner: 'QA Engineer + Developer',
      prerequisites: ['TASK-3.2'],
      steps: [
        '1. Run all unit tests: npm test',
        '2. Run integration tests: npm run test:integration',
        '3. Generate coverage report: npm run test:coverage',
        '4. Review coverage, add tests for gaps',
        '5. Fix any failing tests'
      ],
      verification: 'All tests pass, coverage >90%',
      outputs: ['Test coverage report']
    },
    {
      id: 'TASK-4.2',
      task: 'Manual Testing on Staging',
      owner: 'QA Engineer',
      prerequisites: ['TASK-4.1'],
      steps: [
        '1. Enable feature flag on staging',
        '2. Test happy path: create notification',
        '3. Test validation errors (empty message, invalid type)',
        '4. Test authentication (with/without token)',
        '5. Test edge cases (deleted user, long message)',
        '6. Verify email actually sends',
        '7. Check notification status updates correctly',
        '8. Test concurrent requests (load test)'
      ],
      verification: 'All manual tests pass',
      outputs: ['QA test report']
    },
    {
      id: 'TASK-4.3',
      task: 'Performance Testing',
      owner: 'DevOps',
      prerequisites: ['TASK-4.2'],
      steps: [
        '1. Run load test: ab -n 1000 -c 50 http://staging/api/notifications',
        '2. Monitor response times (p50, p95, p99)',
        '3. Check database query performance',
        '4. Monitor Redis memory usage',
        '5. Verify no memory leaks (run for 1 hour)',
        '6. Document performance metrics'
      ],
      verification: 'Performance meets requirements (<500ms p95)',
      outputs: ['Performance test report']
    }
  ],
  checkpoints: [
    {
      name: 'Production Ready',
      criteria: [
        'All tests pass',
        'Performance acceptable',
        'No critical bugs',
        'Security review passed'
      ],
      failureAction: 'Fix issues, re-test'
    }
  ],
  rollbackPoint: 'Feature flag off on staging'
}
```

### Step 6.6: Production Deployment Phase

```typescript
const productionDeployment: ExecutionPhase = {
  phase: 5,
  name: 'Production Deployment',
  duration: '1 day',
  tasks: [
    {
      id: 'TASK-5.1',
      task: 'Production Database Migration',
      owner: 'DBA + DevOps',
      prerequisites: ['TASK-4.3'],
      steps: [
        '1. Schedule maintenance window (low-traffic time)',
        '2. Announce to team and users (if needed)',
        '3. Take full production database backup',
        '4. Verify backup integrity',
        '5. Run migration on production',
        '6. Verify migration success',
        '7. Run smoke tests'
      ],
      verification: 'Production schema updated, smoke tests pass',
      outputs: ['Production database migrated']
    },
    {
      id: 'TASK-5.2',
      task: 'Code Deployment',
      owner: 'DevOps',
      prerequisites: ['TASK-5.1'],
      steps: [
        '1. Merge feature branch to main',
        '2. Tag release: v1.1.0-notifications',
        '3. Deploy to production (CI/CD pipeline)',
        '4. Verify deployment successful',
        '5. Check logs for errors',
        '6. Feature flag still OFF'
      ],
      verification: 'Code deployed, feature flag off, no errors',
      outputs: ['v1.1.0 deployed']
    },
    {
      id: 'TASK-5.3',
      task: 'Gradual Rollout',
      owner: 'Product Manager + DevOps',
      prerequisites: ['TASK-5.2'],
      steps: [
        '1. Enable feature for internal team only (10 users)',
        '2. Monitor for 1 hour: logs, metrics, errors',
        '3. Enable for 10% of users',
        '4. Monitor for 2 hours',
        '5. Enable for 50% of users',
        '6. Monitor for 4 hours',
        '7. Enable for 100% of users'
      ],
      verification: 'Feature fully enabled, no issues',
      outputs: ['Feature live for all users']
    }
  ],
  checkpoints: [
    {
      name: 'Production Stable',
      criteria: [
        'Error rate < 1%',
        'Response time < 500ms p95',
        'No data loss',
        'Positive user feedback'
      ],
      failureAction: 'Rollback immediately (disable feature flag)'
    }
  ],
  rollbackPoint: 'Feature flag to OFF, or full rollback (migration down + code revert)'
}
```

### Output of Phase 6

```markdown
## Step-by-Step Execution Plan

### Timeline Overview

| Phase | Duration | Prerequisites | Rollback Point |
|-------|----------|---------------|----------------|
| 0. Pre-Implementation | 1 day | None | Delete branch |
| 1. Database Migration | 4-6 hours | Phase 0 | Migration down |
| 2. Core Implementation | 3-4 days | Phase 1 | Git revert |
| 3. API Implementation | 1-2 days | Phase 2 | Remove routes |
| 4. Testing & QA | 2-3 days | Phase 3 | Feature flag off |
| 5. Production Deployment | 1 day | Phase 4 | Full rollback |

**Total Timeline**: **8-10 working days (2 weeks)**

### Phase 0: Pre-Implementation (Day 1)

#### Tasks
- [x] TASK-0.1: Install Redis (dev + staging) - **DevOps**
- [x] TASK-0.2: Create feature branch - **Developer**
- [x] TASK-0.3: Database backup - **DBA**

#### Checkpoint: Pre-Implementation Complete
- ✅ Redis accessible
- ✅ Feature branch created
- ✅ Database backup verified

---

### Phase 1: Database Migration (Day 2, 4-6 hours)

#### Tasks
- [ ] TASK-1.1: Write migration file - **Developer**
- [ ] TASK-1.2: Test on dev - **Developer**
- [ ] TASK-1.3: Run on staging - **DevOps + DBA**

#### Checkpoint: Migration Verified
- ✅ Tables exist
- ✅ Indexes created
- ✅ Rollback tested

**Rollback**: `npm run migrate:down` on staging

---

### Phase 2: Core Implementation (Days 3-6)

#### Tasks
- [ ] TASK-2.1: Notification Model & Repository (6 hours)
- [ ] TASK-2.2: Queue Service (8 hours)
- [ ] TASK-2.3: Notification Service (10 hours)
- [ ] TASK-2.4: Email Processor (6 hours)

#### Checkpoint: Core Services Complete
- ✅ All unit tests pass
- ✅ Coverage > 90%
- ✅ Code reviewed

**Rollback**: Git revert commits

---

### Phase 3: API Implementation (Days 7-8)

#### Tasks
- [ ] TASK-3.1: Controller + integration tests (8 hours)
- [ ] TASK-3.2: Routes setup + docs (4 hours)

#### Checkpoint: API Ready
- ✅ All endpoints work
- ✅ Auth enforced
- ✅ Validation working

**Rollback**: Remove routes registration

---

### Phase 4: Testing & QA (Days 9-10)

#### Tasks
- [ ] TASK-4.1: Complete test suite (4 hours)
- [ ] TASK-4.2: Manual testing (6 hours)
- [ ] TASK-4.3: Performance testing (4 hours)

#### Checkpoint: Production Ready
- ✅ All tests pass
- ✅ Performance OK
- ✅ No critical bugs

**Rollback**: Feature flag off

---

### Phase 5: Production Deployment (Day 11)

#### Tasks
- [ ] TASK-5.1: Production migration (2 hours)
- [ ] TASK-5.2: Code deployment (1 hour)
- [ ] TASK-5.3: Gradual rollout (6 hours)

#### Rollout Schedule
- **Hour 0-1**: Internal team (10 users)
- **Hour 1-3**: 10% of users
- **Hour 3-7**: 50% of users
- **Hour 7+**: 100% of users

#### Checkpoint: Production Stable
- ✅ Error rate < 1%
- ✅ Response time < 500ms
- ✅ No data loss

**Emergency Rollback**: Feature flag OFF immediately

---

### Daily Standup Template

**Yesterday:**
- Completed: [tasks]
- Blockers: [issues]

**Today:**
- Working on: [current tasks]
- Expected completion: [time]

**Blockers:**
- [any blockers]

### Deployment Checklist

#### Pre-Deployment
- [ ] All tests pass
- [ ] Code review approved
- [ ] Database backup completed
- [ ] Rollback plan documented
- [ ] Team notified of deployment

#### During Deployment
- [ ] Migration runs successfully
- [ ] Code deploys without errors
- [ ] Smoke tests pass
- [ ] Monitoring dashboards ready

#### Post-Deployment
- [ ] Feature flag enabled gradually
- [ ] Metrics monitored continuously
- [ ] Error logs reviewed
- [ ] User feedback collected
```

---

## Phase 7: Safety Checklist

### Pre-Implementation Safety Review

```markdown
## Safety Checklist

### Code Safety
- [ ] All dependencies version-locked in package.json
- [ ] No sensitive data (API keys, passwords) in code
- [ ] All user input validated and sanitized
- [ ] SQL injection prevention (using parameterized queries/ORM)
- [ ] XSS prevention (input sanitization)
- [ ] CSRF protection (if needed)
- [ ] Rate limiting implemented
- [ ] Authentication required for all endpoints
- [ ] Authorization checks in place

### Data Safety
- [ ] Database backup completed and verified
- [ ] Migration has rollback script
- [ ] Migration tested on dev and staging
- [ ] No data loss in rollback scenario
- [ ] Foreign key constraints properly defined
- [ ] Indexes created for performance
- [ ] Data validation at database level (constraints)

### Testing Safety
- [ ] Unit tests cover >90% of code
- [ ] Integration tests for all API endpoints
- [ ] Edge cases documented and tested
- [ ] Performance tests completed
- [ ] Security testing done (OWASP Top 10)
- [ ] Load testing completed
- [ ] Rollback procedure tested

### Deployment Safety
- [ ] Feature flag implemented
- [ ] Gradual rollout plan in place
- [ ] Monitoring dashboards ready
- [ ] Alert thresholds configured
- [ ] Rollback plan documented and tested
- [ ] Team trained on rollback procedure
- [ ] Communication plan for incidents

### Infrastructure Safety
- [ ] Redis has persistence enabled
- [ ] Redis has password authentication
- [ ] Database connection pool properly sized
- [ ] Environment variables secured
- [ ] Logs don't contain sensitive data
- [ ] HTTPS enforced for all API calls
- [ ] CORS properly configured

### Operational Safety
- [ ] On-call rotation scheduled
- [ ] Incident response plan ready
- [ ] Runbook created for common issues
- [ ] Monitoring and alerting configured
- [ ] Performance metrics baseline established
- [ ] Capacity planning done
```

---

## Skill Usage Example

```
User: أريد إضافة ميزة two-factor authentication للنظام

Claude: [يستخدم implementation-safety-planner skill]

Phase 1: Implementation Details
- Dependencies: speakeasy (TOTP), qrcode (QR code generation)
- Database changes: users table needs 'two_factor_secret' column
- Modifications needed: AuthService, LoginController

Phase 2: Testing Strategy
- Unit tests: 15 test cases for TOTP generation/validation
- Integration tests: 6 test cases for login flow with 2FA
- Security tests: Brute force protection, timing attack prevention

Phase 3: Rollback Plan
CRITICAL: Cannot rollback after users enable 2FA without data loss
Solution: Dual-mode operation
  1. Add 2FA column (optional)
  2. Users opt-in gradually
  3. Never force-remove 2FA secrets

Phase 4: Edge Cases
- User loses 2FA device → Backup codes required
- Clock skew → Accept 1-step time window
- QR code doesn't scan → Show manual entry code

Phase 5: Feasibility
✅ Realistic: TOTP is proven technology
⚠️ Risk: Account lockout if user loses device
  Mitigation: Mandatory backup codes

Phase 6: Execution Plan
[خطة تفصيلية من 10 أيام عمل]

Phase 7: Safety Checklist
- [ ] Backup codes generated (10 per user)
- [ ] Rate limiting on 2FA attempts
- [ ] Timing attack prevention
...
```

---

## Integration with Other Skills

This skill **complements** `codebase-deep-analyzer`:

```
codebase-deep-analyzer: WHAT to build (requirements, architecture)
         ↓
implementation-safety-planner: HOW to build safely (testing, rollback, execution)
```

**Recommended workflow**:
1. Use `codebase-deep-analyzer` first for context and requirements
2. Use `implementation-safety-planner` for detailed execution planning
3. Start implementation only after both are complete

---

## Conclusion

**Remember**: خطة الاختبار وخطة الرجوع ليست مهام ما بعد التنفيذ - هي جزء أساسي من التصميم.

```
تصميم ضعيف + تنفيذ جيد = فشل محتمل
تصميم جيد + تنفيذ ضعيف = فشل مؤكد
تصميم جيد + تخطيط آمن + تنفيذ جيد = نجاح
```