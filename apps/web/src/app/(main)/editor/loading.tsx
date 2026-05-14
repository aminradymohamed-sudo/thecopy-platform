/**
 * مؤشر تحميل المحرر
 * يُعرض أثناء تحميل محرر النصوص الديناميكي
 */
import Link from "next/link";

export default function EditorLoading() {
  return (
    <main
      role="main"
      data-editor-sheet
      aria-label="محرر النص الإبداعي"
      className="bg-background flex min-h-screen flex-col items-center justify-center gap-6"
    >
      <a
        href="#editor-loading-status"
        className="sr-only focus-visible:not-sr-only focus-visible:absolute focus-visible:top-4 focus-visible:right-4 focus-visible:rounded-md focus-visible:bg-white/10 focus-visible:px-4 focus-visible:py-2 focus-visible:text-white focus-visible:ring-2 focus-visible:ring-white/60"
        aria-label="تخطّي إلى محتوى المحرر"
      >
        تخطّي إلى المحتوى
      </a>
      <div
        id="editor-loading-status"
        className="rounded-md px-3 py-2 text-center outline-none focus-visible:ring-2 focus-visible:ring-white/60"
        role="status"
        aria-live="polite"
        aria-label="جارٍ تحميل المحرر"
      >
        <div
          className="border-primary mx-auto mb-4 h-12 w-12 animate-spin rounded-full border-b-2"
          aria-hidden="true"
        ></div>
        <p className="text-white/55">جاري تحميل المحرر...</p>
      </div>
      <nav aria-label="روابط الاستوديو" className="flex gap-3 text-sm">
        <a
          href="/directors-studio"
          className="rounded-md border border-white/15 bg-white/5 px-4 py-2 text-white/85 hover:bg-white/10 focus-visible:ring-2 focus-visible:ring-white/60 focus-visible:outline-none"
          aria-label="العودة إلى استوديو المخرج"
        >
          الاستوديو
        </a>
        <Link
          href="/"
          className="rounded-md border border-white/15 bg-white/5 px-4 py-2 text-white/85 hover:bg-white/10 focus-visible:ring-2 focus-visible:ring-white/60 focus-visible:outline-none"
          aria-label="العودة إلى الصفحة الرئيسية"
        >
          الرئيسية
        </Link>
      </nav>
    </main>
  );
}
