#!/usr/bin/env bash
# =============================================================================
# سكربت تجميع تقرير ملخص من artifacts المنتجة في الـ CI
# يُستدعى من security-pipeline.yml بعد اكتمال كل الـ jobs
# الاستخدام: ./scripts/security-summary.sh <artifacts-dir> <output-file>
# =============================================================================

set -euo pipefail
IFS=$'\n\t'

ARTIFACTS_DIR="${1:-security-artifacts}"
OUTPUT_FILE="${2:-SECURITY-SUMMARY.md}"

if [[ ! -d "${ARTIFACTS_DIR}" ]]; then
    echo "خطأ: مجلد الـ artifacts غير موجود: ${ARTIFACTS_DIR}" >&2
    exit 1
fi

# -----------------------------------------------------------------------------
# دوال استخراج الأرقام من كل artifact
# -----------------------------------------------------------------------------

count_sarif_findings() {
    local file="$1"
    if [[ -f "${file}" ]] && command -v jq >/dev/null 2>&1; then
        jq '[.runs[]?.results // []] | flatten | length' "${file}" 2>/dev/null || echo "0"
    else
        echo "0"
    fi
}

count_eslint_findings() {
    local file="$1"
    if [[ -f "${file}" ]] && command -v jq >/dev/null 2>&1; then
        jq '[.[] | .messages | length] | add // 0' "${file}" 2>/dev/null || echo "0"
    else
        echo "0"
    fi
}

count_pnpm_audit_critical() {
    local file="$1"
    if [[ -f "${file}" ]] && command -v jq >/dev/null 2>&1; then
        jq '.metadata.vulnerabilities.critical // 0' "${file}" 2>/dev/null || echo "0"
    else
        echo "0"
    fi
}

count_pnpm_audit_high() {
    local file="$1"
    if [[ -f "${file}" ]] && command -v jq >/dev/null 2>&1; then
        jq '.metadata.vulnerabilities.high // 0' "${file}" 2>/dev/null || echo "0"
    else
        echo "0"
    fi
}

count_sbom_components() {
    local file="$1"
    if [[ -f "${file}" ]] && command -v jq >/dev/null 2>&1; then
        jq '.components | length' "${file}" 2>/dev/null || echo "0"
    else
        echo "0"
    fi
}

count_forbidden_licenses() {
    local file="$1"
    if [[ -f "${file}" ]] && command -v jq >/dev/null 2>&1; then
        jq '[to_entries[] | select(.value.licenses | tostring | test("GPL|AGPL|LGPL|CPAL|OSL|EPL|CDDL|SSPL"))] | length' \
            "${file}" 2>/dev/null || echo "0"
    else
        echo "0"
    fi
}

# -----------------------------------------------------------------------------
# جمع الإحصائيات من كل artifact
# -----------------------------------------------------------------------------

SEMGREP_FINDINGS=$(count_sarif_findings "${ARTIFACTS_DIR}/semgrep-results/semgrep-results.sarif")
GITLEAKS_FINDINGS=$(count_sarif_findings "${ARTIFACTS_DIR}/gitleaks-results/gitleaks-results.sarif")
TRIVY_FINDINGS=$(count_sarif_findings "${ARTIFACTS_DIR}/dependency-audit-results/trivy-fs-results.sarif")
ESLINT_FINDINGS=$(count_eslint_findings "${ARTIFACTS_DIR}/eslint-security-results/eslint-security-results.json")
PNPM_CRITICAL=$(count_pnpm_audit_critical "${ARTIFACTS_DIR}/dependency-audit-results/pnpm-audit-results.json")
PNPM_HIGH=$(count_pnpm_audit_high "${ARTIFACTS_DIR}/dependency-audit-results/pnpm-audit-results.json")
SBOM_COMPONENTS=$(count_sbom_components "${ARTIFACTS_DIR}/sbom-cyclonedx/sbom.cyclonedx.json")
FORBIDDEN_LICENSES=$(count_forbidden_licenses "${ARTIFACTS_DIR}/license-audit-results/license-report.json")

TOTAL_CRITICAL=$((SEMGREP_FINDINGS + GITLEAKS_FINDINGS + PNPM_CRITICAL + FORBIDDEN_LICENSES))
TOTAL_HIGH=$((TRIVY_FINDINGS + PNPM_HIGH))
TOTAL_ALL=$((TOTAL_CRITICAL + TOTAL_HIGH + ESLINT_FINDINGS))

# -----------------------------------------------------------------------------
# تحديد الحالة العامة
# -----------------------------------------------------------------------------
if [[ "${TOTAL_CRITICAL}" -gt 0 ]]; then
    STATUS_ICON="❌"
    STATUS_TEXT="فشل - مشاكل حرجة"
elif [[ "${TOTAL_HIGH}" -gt 0 ]]; then
    STATUS_ICON="⚠️"
    STATUS_TEXT="تحذير - مشاكل عالية"
elif [[ "${TOTAL_ALL}" -gt 0 ]]; then
    STATUS_ICON="ℹ️"
    STATUS_TEXT="ملاحظات بسيطة"
else
    STATUS_ICON="✅"
    STATUS_TEXT="نظيف"
fi

# -----------------------------------------------------------------------------
# توليد تقرير Markdown
# -----------------------------------------------------------------------------

cat > "${OUTPUT_FILE}" <<EOF
# ${STATUS_ICON} تقرير الفحوصات الأمنية

**الحالة العامة:** ${STATUS_TEXT}

**التاريخ:** $(date -u '+%Y-%m-%d %H:%M:%S UTC')

## الملخص التنفيذي

| المستوى | العدد |
|---|---|
| حرج | ${TOTAL_CRITICAL} |
| عالي | ${TOTAL_HIGH} |
| الإجمالي | ${TOTAL_ALL} |

## نتائج الفحوصات

| الفحص | الأداة | النتائج | الملاحظات |
|---|---|---|---|
| SAST | Semgrep | ${SEMGREP_FINDINGS} | تحليل الكود الساكن |
| Secrets | Gitleaks | ${GITLEAKS_FINDINGS} | كشف الأسرار |
| Static | ESLint | ${ESLINT_FINDINGS} | تحذيرات أمنية |
| Deps Audit | pnpm | ${PNPM_CRITICAL} حرج / ${PNPM_HIGH} عالي | ثغرات الحزم |
| Filesystem | Trivy | ${TRIVY_FINDINGS} | فحص الملفات والإعدادات |
| SBOM | CycloneDX | ${SBOM_COMPONENTS} مكون | قائمة المواد |
| Licenses | license-checker | ${FORBIDDEN_LICENSES} ممنوع | تراخيص الحزم |

## التوصيات

EOF

if [[ "${TOTAL_CRITICAL}" -gt 0 ]]; then
    cat >> "${OUTPUT_FILE}" <<EOF
### إجراء فوري مطلوب

تم اكتشاف ${TOTAL_CRITICAL} مشكلة حرجة. راجع الـ artifacts المرفقة وعالجها قبل الدمج.

EOF
fi

if [[ "${PNPM_CRITICAL}" -gt 0 || "${PNPM_HIGH}" -gt 0 ]]; then
    cat >> "${OUTPUT_FILE}" <<EOF
### تحديث الحزم

شغّل الأمر التالي لإصلاح الثغرات تلقائياً:

\`\`\`bash
pnpm audit --fix
\`\`\`

EOF
fi

if [[ "${GITLEAKS_FINDINGS}" -gt 0 ]]; then
    cat >> "${OUTPUT_FILE}" <<EOF
### مفاتيح مكشوفة

تم اكتشاف أسرار محتملة. اتبع الخطوات التالية فوراً:

1. إبطال أي مفتاح مكشوف عبر لوحة المزود
2. إزالة المفتاح من تاريخ git عبر BFG Repo-Cleaner أو git filter-repo
3. إصدار مفتاح جديد وتخزينه في إدارة الأسرار

EOF
fi

if [[ "${FORBIDDEN_LICENSES}" -gt 0 ]]; then
    cat >> "${OUTPUT_FILE}" <<EOF
### تراخيص ممنوعة

تم اكتشاف ${FORBIDDEN_LICENSES} حزمة بتراخيص copyleft قوية. ابحث عن بدائل أو استشر الشؤون القانونية.

EOF
fi

cat >> "${OUTPUT_FILE}" <<EOF

## الموارد

- نتائج SARIF منشورة في تبويب Security بالمستودع
- التقارير الكاملة متوفرة في artifacts الـ workflow
- مدة الاحتفاظ بالـ artifacts: 30 يوم (90 يوم لـ SBOM والملخص)

---

_تم التوليد بواسطة Security Pipeline_
EOF

echo "تم توليد التقرير: ${OUTPUT_FILE}"
