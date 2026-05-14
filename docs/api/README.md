# مرجع واجهة برمجة التطبيقات — The Copy Platform

آخر تحديث: 2026-05-11
مرجع الكود: `docs/api/openapi.yaml`

## ملخص

يحتوي هذا المستند على مرجع شامل لواجهة برمجة تطبيقات منصة The Copy، بما في ذلك طرق المصادقة، حدود المعدل، سياسة الإصدار، أكواد الأخطاء، والمعلومات المرجعية الأخرى.

## 1. المصادقة

### أنواع المصادقة المدعومة

| النوع | الوصف | الرؤوس المطلوبة |
|---|---|---|
| JWT Bearer | مصادقة المستخدمين المسجلين | `Authorization: Bearer <token>` |
| Firebase Auth | مصادقة Firebase مباشرة | `Authorization: Firebase <token>` |
| API Key | مصادقة الخدمة | `X-API-Key: <key>` |

### أمثلة المصادقة

```bash
# مصادقة JWT
curl -X GET https://api.thecopy.ai/api/projects \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."

# مصادقة Firebase
curl -X GET https://api.thecopy.ai/api/projects \
  -H "Authorization: Firebase ya29.c.b0AX9..."

# مفتاح API
curl -X GET https://api.thecopy.ai/api/projects \
  -H "X-API-Key: sk-1234567890abcdef"
```

### إدارة الجلسة

- **مدة الرمز**: 24 ساعة
- **تجديد الرمز**: استخدام `/api/auth/refresh`
- **إنهاء الجلسة**: استخدام `/api/auth/logout`

## 2. الحد من المعدل

### حدود المعدل

| المستوى | الحد | النافذة | الرمز |
|---|---|---|---|
| API العام | 100 طلب/دقيقة | 15 دقيقة | `429` |
| مصادقة | 10 محاولات/دقيقة | 1 دقيقة | `429` |
| نقاط نهاية الذكاء الاصطناعي | 20 طلب/دقيقة | 5 دقائق | `429` |
| المستخدمون المتميزون | 200 طلب/دقيقة | 15 دقيقة | `429` |

### رؤوس الحد من المعدل

```http
RateLimit-Limit: 100
RateLimit-Remaining: 85
RateLimit-Reset: 300
Retry-After: 60
```

### التعامل مع حدود المعدل

```javascript
// مثال JavaScript للتعامل مع حدود المعدل
async function makeApiRequest() {
  try {
    const response = await fetch('https://api.thecopy.ai/api/ai/chat', {
      method: 'POST',
      headers: {
        'Authorization': 'Bearer your_token',
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ message: "Hello" })
    });

    if (response.status === 429) {
      const retryAfter = response.headers.get('Retry-After');
      console.log(`Rate limited. Retry after ${retryAfter} seconds.`);
      await new Promise(resolve => setTimeout(resolve, retryAfter * 1000));
      return makeApiRequest(); // إعادة المحاولة تلقائيًا
    }

    return response.json();
  } catch (error) {
    console.error('API request failed:', error);
  }
}
```

## 3. سياسة الإصدار

### استراتيجية الإصدارات

| الإصدار | الحالة | تاريخ نهاية الدعم |
|---|---|---|
| v1 | حالية | 2027-12-31 |
| v2 | مخطط لها | - |

### تنسيق المسار

```
https://api.thecopy.ai/v1/endpoint
```

### سياسة إهلاك الإصدار

1. **إشعار أولي**: 6 أشهر قبل الإهلاك
2. **تحذيرات**: في رؤوس الاستجابة
3. **دعم محدود**: 3 أشهر بعد الإهلاك
4. **إزالة**: بعد 9 أشهر من الإشعار

## 4. أكواد الأخطاء

### جدول أكواد الأخطاء

| الرمز | النوع | الوصف | الإجراء |
|---|---|---|---|
| `400` | BadRequest | طلب غير صالح | إصلاح البيانات المرسلة |
| `401` | Unauthorized | غير مصدق | إعادة المصادقة |
| `403` | Forbidden | الوصول مرفوض | التحقق من الأذونات |
| `404` | NotFound | الموارد غير موجودة | التحقق من المسار |
| `409` | Conflict | تعارض | حل التعارض |
| `422` | UnprocessableEntity | كيان غير قابل للمعالجة | إصلاح البيانات |
| `429` | TooManyRequests | الكثير من الطلبات | الانتظار وإعادة المحاولة |
| `500` | InternalServerError | خطأ في الخادم | إعادة المحاولة لاحقًا |
| `503` | ServiceUnavailable | الخدمة غير متاحة | إعادة المحاولة لاحقًا |

### استجابات الخطأ القياسية

```json
{
  "success": false,
  "error": "invalid_request",
  "message": "Request validation failed",
  "details": {
    "field": "email",
    "reason": "must be a valid email address"
  },
  "timestamp": "2026-05-11T00:28:31Z"
}
```

## 5. الترقيم

### تنسيق الترقيم

```
GET /api/projects?page=1&limit=10
```

| المعلمة | الوصف | الافتراضي |
|---|---|---|
| `page` | رقم الصفحة | 1 |
| `limit` | عدد النتائج لكل صفحة | 20 |
| `sort` | حقل الفرز | `createdAt` |
| `order` | اتجاه الفرز (`asc`/`desc`) | `desc` |

### مثال استجابة الترقيم

```json
{
  "data": [
    { "id": "proj_123", "name": "Project 1" },
    { "id": "proj_456", "name": "Project 2" }
  ],
  "pagination": {
    "page": 1,
    "limit": 10,
    "total": 25,
    "pages": 3
  }
}
```

## 6. الإيدمبوتنسي

### استخدام مفتاح الإيدمبوتنسي

```bash
curl -X POST https://api.thecopy.ai/api/projects \
  -H "Authorization: Bearer your_token" \
  -H "Idempotency-Key: req_abc123" \
  -H "Content-Type: application/json" \
  -d '{"name": "My Project"}'
```

### قواعد الإيدمبوتنسي

1. **المدة**: 24 ساعة
2. **المسارات المدعومة**: جميع مسارات POST/PUT/PATCH
3. **طول المفتاح**: 36-255 حرف
4. **التنسيق**: UUID أو حرف عشوائي

## 7. Webhooks

### أحداث Webhook

| الحدث | الوصف | الحمولة |
|---|---|---|
| `project.created` | مشروع تم إنشاؤه | بيانات المشروع |
| `project.updated` | مشروع تم تحديثه | بيانات المشروع |
| `analysis.completed` | تحليل تم إكماله | نتائج التحليل |
| `job.failed` | عمل فاشل | تفاصيل الفشل |

### مثال حمولة Webhook

```json
{
  "event": "project.created",
  "timestamp": "2026-05-11T00:28:31Z",
  "data": {
    "id": "proj_123",
    "name": "New Project",
    "createdBy": "user_456"
  },
  "signature": "sha256=abc123..."
}
```

### التحقق من توقيع Webhook

```javascript
const crypto = require('crypto');

function verifyWebhookSignature(payload, signature, secret) {
  const hmac = crypto.createHmac('sha256', secret);
  const digest = 'sha256=' + hmac.update(payload).digest('hex');
  return crypto.timingSafeEqual(Buffer.from(digest), Buffer.from(signature));
}
```

## 8. أفضل الممارسات

### أفضل ممارسات الاستهلاك

1. **التخزين المؤقت**: تخزين استجابات GET المؤقتة
2. **المعالجة المتزامنة**: استخدام الطوابير للعمليات طويلة الأمد
3. **إدارة الأخطاء**: التعامل بشكل مناسب مع أكواد الخطأ
4. **الترقيم**: استخدام معلمات الترقيم بشكل صحيح
5. **الإيدمبوتنسي**: استخدام مفاتيح الإيدمبوتنسي للعمليات الحرجة

### أفضل ممارسات الأمن

1. **لا تخزن الأسرار**: لا تخزن مفاتيح API في الكود
2. **استخدم HTTPS**: جميع الطلبات عبر HTTPS
3. **تدوير المفاتيح**: دور مفاتيح API بانتظام
4. **الحد من النطاقات**: حد من نطاقات IP إذا كان ممكنًا
5. **التحقق من الصحة**: تحقق من صحة جميع المدخلات

## 9. أمثلة الكود

### مثال JavaScript

```javascript
const API_BASE = 'https://api.thecopy.ai';
const API_KEY = 'your_api_key_here';

async function getProjects() {
  const response = await fetch(`${API_BASE}/api/projects`, {
    headers: {
      'Authorization': `Bearer ${API_KEY}`,
      'Accept': 'application/json'
    }
  });

  if (!response.ok) {
    throw new Error(`API request failed: ${response.status}`);
  }

  return response.json();
}

async function createProject(projectData) {
  const response = await fetch(`${API_BASE}/api/projects`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${API_KEY}`,
      'Content-Type': 'application/json',
      'Idempotency-Key': crypto.randomUUID()
    },
    body: JSON.stringify(projectData)
  });

  return response.json();
}
```

### مثال Python

```python
import requests

API_BASE = "https://api.thecopy.ai"
API_KEY = "your_api_key_here"

def get_projects():
    headers = {
        "Authorization": f"Bearer {API_KEY}",
        "Accept": "application/json"
    }
    response = requests.get(f"{API_BASE}/api/projects", headers=headers)
    response.raise_for_status()
    return response.json()

def create_project(project_data):
    headers = {
        "Authorization": f"Bearer {API_KEY}",
        "Content-Type": "application/json",
        "Idempotency-Key": str(uuid.uuid4())
    }
    response = requests.post(
        f"{API_BASE}/api/projects",
        headers=headers,
        json=project_data
    )
    return response.json()
```

## 10. المراجع

- `docs/api/openapi.yaml` — مواصفة OpenAPI الكاملة
- `docs/architecture/ARCHITECTURE.md` — توثيق المعمارية
- `docs/CONFIGURATION.md` — توثيق التهيئة
- `docs/operations/DEPLOYMENT.md` — توثيق النشر