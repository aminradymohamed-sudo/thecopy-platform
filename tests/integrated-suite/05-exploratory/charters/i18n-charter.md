# Charter — التدويل و RTL العربي

> **استكشف الواجهة بالكامل بمنظور RTL والمستخدم العربي، لاكتشاف bidi issues، direction overrides، caret positioning، وفروقات الـ formatting.**

## النطاق

- كل الصفحات (`/*`)
- مكتبات: `i18next`, `intl-pluralrules`
- خط: `Tajawal`, `IBM Plex Sans Arabic`

## أفكار للاستكشاف

### Direction
- تحقق `<html dir="rtl">` على كل صفحة
- تحقق أن الـ icons تنعكس عند الحاجة (back/forward arrows)
- لا تنعكس icons غير اتجاهية (search، settings)

### Bidi
- جرّب نص مختلط: "السعر $100 USD"
- جرّب URL داخل نص عربي
- جرّب أرقام تليفون
- تحقق من caret position في الـ inputs

### Text rendering
- تحقق kashida لا يكسر التنسيق
- تحقق diacritics (تشكيل) تظهر صحيحاً
- جرّب نصوص قبطية / فارسية / أوردية إن وُجدت

### Formatting
- التواريخ: ar-SA hijri vs gregorian
- الأرقام: arabic-indic (٠١٢) vs latin (012) — أي يستخدم؟ ثابت؟
- العملات: ر.س / SAR / $
- الوقت: 12h vs 24h

### Pluralization
- 0 / 1 / 2 / 3 / 11 / 100 من نفس الكلمة

### Form validation
- رسائل الخطأ عربية صحيحة نحوياً
- لا تظهر متغيرات غير مُترجمة (`{count}` خام)

### Fonts
- تحميل الخط — هل يحدث FOUT/FOIT؟
- fallback fonts — هل تختلف بين المتصفحات؟

## Stop conditions

- اكتشاف bidi corruption
- اكتشاف نص untranslated في user-facing UI
- انتهى الزمن (60 دقيقة)
