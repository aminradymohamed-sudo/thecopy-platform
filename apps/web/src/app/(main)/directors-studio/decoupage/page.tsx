/**
 * صفحة Découpage داخل directors-studio.
 *
 * هذه الميزة منقولة من تطبيق D-COUPAGE المصدر إلى المنصّة وفق
 * `docs/dcoupage-audit.md` § INTEGRATION PLAN.
 *
 * المسار: `/directors-studio/decoupage`
 */

import { DecoupageWorkspace } from "./components/DecoupageWorkspace";

export const metadata = {
  title: "Découpage — استوديو المخرجين",
  description:
    "محرّك المنطق الإخراجي بـ 11 مرحلة لتحويل النص الدرامي إلى تصميم بصري كامل.",
};

export default function DecoupagePage() {
  return (
    <main className="container mx-auto px-2 py-6">
      <DecoupageWorkspace />
    </main>
  );
}
