# Charter — المصادقة و الجلسات

> **استكشف تدفقات تسجيل الدخول/الخروج/التجديد والـ session management لاكتشاف auth bypass، session fixation، والـ token misuse.**

## النطاق

- `/auth/*`
- `apps/backend/src/auth/*`
- BreakApp QR login
- Session storage (cookies / JWT / refresh tokens)

## أفكار للاستكشاف

### Login
- email صحيح + password صحيح
- email صحيح + password خاطئ
- email غير موجود
- email بصيغة غير صالحة
- password فارغ
- 100 محاولة فاشلة في دقيقة — هل rate-limit يعمل؟

### Logout
- logout عادي — هل الـ token يصبح غير صالح فوراً؟
- logout من tab واحد بينما tab آخر مفتوح — السلوك؟
- استخدام token قديم بعد logout — يجب 401

### Token misuse
- خذ token من مستخدم آخر — يجب رفض
- عدّل JWT signature — يجب رفض
- استخدم expired token — يجب رفض مع تمييز
- استخدم token بدون Bearer prefix — السلوك؟

### Session fixation
- احصل على session ID قبل login
- سجّل دخول
- يجب أن يتجدد الـ session ID

### CSRF
- POST من origin خارجي بـ CORS-allowed credentials — يجب رفض
- تحقق من CSRF token في الـ POST endpoints

### QR login (BreakApp)
- QR ينتهي صلاحيته بعد X دقيقة
- نفس QR لا يُستخدم مرتين
- QR يربط فقط بالجهاز الذي طلبه

## Stop conditions

- اكتشاف auth bypass
- اكتشاف session fixation
- انتهى الزمن (45 دقيقة)
