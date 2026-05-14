# Charter — المحرر السينمائي

> **استكشف صفحة المحرر السينمائي باستخدام أدوات الترجمة و RTL وأحجام الشاشة المختلفة و keyboard-only navigation لاكتشاف انحرافات بصرية و breakages في التفاعل.**

## النطاق

- مسار: `/editor` (وأي sub-routes)
- الميزات: ورقة التحرير، dock، الشريط الجانبي، حفظ تلقائي، استدعاء AI

## خارج النطاق

- تكامل backend (مغطى في 04-regression)
- الأداء (مغطى في 02-performance)

## أفكار للاستكشاف (heuristic-based)

### CRUD heuristic
- جرّب إنشاء/تحرير/حذف بسرعات مختلفة
- جرّب نفس العمليات بـ undo/redo سريع متتالي
- جرّب paste لنص طويل جداً (10K+ حرف)

### Boundaries heuristic
- نص بطول 0
- نص بطول 1
- نص بطول 100K
- نص يحتوي فقط مسافات
- نص يحتوي فقط أحرف عربية
- نص يحتوي bidi (عربي + إنجليزي + أرقام)
- نص يحتوي emojis
- نص يحتوي RTL/LTR override characters

### CRUD on metadata
- اسم مشروع فارغ
- اسم مشروع بـ 1 حرف
- اسم مشروع بـ 500 حرف
- اسم بأحرف خاصة (`<>"'\\/?#:;,.`)

### Interaction heuristic
- نقر مزدوج سريع
- سحب وإفلات داخل/خارج المنطقة
- keyboard-only: Tab/Shift+Tab/Enter/Escape — هل تركز focus على عناصر ميتة؟
- صيحات صوتية (لا ينطبق هنا — لكن جرّب screen reader)

### Internationalization
- بدّل بين ar-SA و en-US
- جرّب OS بإعدادات RTL مختلفة
- تأكد أن caret position صحيح في bidi

### Rendering / Layout
- قاعدة OPERATING-CONTRACT: لا overlay مثبت في منتصف الشاشة. تحقق فعلاً.
- زوّد الـ zoom في المتصفح (75% / 125% / 150%)
- صغّر النافذة لـ 800×600 — هل ينكسر التكوين؟

### Stability heuristic
- اترك الصفحة مفتوحة ساعة بدون تفاعل — هل تظل reactive؟
- افتح 3 tabs بنفس المشروع — هل تتعارض الـ writes؟

## Stop conditions

- وجدت critical bug تمنع الاستمرار
- انتهى الزمن المخصص (90 دقيقة)
- زرت كل المسارات في الـ heuristic بدون نتيجة → اكتب 'cleared'
