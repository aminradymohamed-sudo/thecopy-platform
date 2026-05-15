#!/usr/bin/env bash
# =============================================================================
# سكربت تشغيل محلي شامل للفحوصات الأمنية
# يُشغل نفس أدوات الـ CI محلياً مع تقارير موحدة
# المتطلبات: bash 4+, jq, الأدوات المرغوب فحصها
# الاستخدام: ./scripts/security-scan.sh [--with-dast]
# =============================================================================

set -euo pipefail
IFS=$'\n\t'

# فرض UTF-8 على بايثون: مطلوب لقراءة configs/.semgrep.yml الذي يحوي تعليقات عربية.
# على ويندوز بدون هذا الإعداد يفشل semgrep بـ UnicodeDecodeError (cp1252).
# لا يضعف الفحص — يضمن فقط قراءة الإعدادات على كل المنصات.
export PYTHONUTF8=1
export PYTHONIOENCODING=utf-8

# -----------------------------------------------------------------------------
# الإعدادات العامة
# -----------------------------------------------------------------------------
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "${SCRIPT_DIR}/../.." && pwd)"
REPORTS_DIR="${REPO_ROOT}/reports"
CONFIGS_DIR="${REPO_ROOT}/configs"
TIMESTAMP="$(date +%Y%m%d-%H%M%S)"
LOG_FILE="${REPORTS_DIR}/scan-${TIMESTAMP}.log"

# ألوان للطرفية
readonly RED='\033[0;31m'
readonly GREEN='\033[0;32m'
readonly YELLOW='\033[0;33m'
readonly BLUE='\033[0;34m'
readonly BOLD='\033[1m'
readonly NC='\033[0m'

# متغيرات لتتبع النتائج
declare -A SCAN_RESULTS
declare -A SCAN_FILES
TOTAL_ISSUES=0
FAILED_SCANS=()
SUCCESS_SCANS=()
SKIPPED_SCANS=()
RUN_DAST="${RUN_DAST:-false}"

# -----------------------------------------------------------------------------
# دوال logging احترافية
# -----------------------------------------------------------------------------
_log() {
    local level="$1"
    local color="$2"
    shift 2
    local message="$*"
    local timestamp
    timestamp="$(date '+%Y-%m-%d %H:%M:%S')"
    printf '[%s] [%-7s] %b%s%b\n' \
        "${timestamp}" "${level}" "${color}" "${message}" "${NC}" \
        | tee -a "${LOG_FILE}"
}

log_info()    { _log "INFO"    "${BLUE}"   "$@"; }
log_success() { _log "SUCCESS" "${GREEN}"  "$@"; }
log_warn()    { _log "WARN"    "${YELLOW}" "$@"; }
log_error()   { _log "ERROR"   "${RED}"    "$@"; }
log_section() {
    echo "" | tee -a "${LOG_FILE}"
    printf '%b===== %s =====%b\n' "${BOLD}" "$*" "${NC}" | tee -a "${LOG_FILE}"
}

# -----------------------------------------------------------------------------
# التحقق من توفر الأدوات المطلوبة
# -----------------------------------------------------------------------------
check_tool() {
    local tool="$1"
    local install_hint="$2"
    if ! command -v "${tool}" >/dev/null 2>&1; then
        log_warn "${tool} غير مثبت"
        log_warn "للتثبيت: ${install_hint}"
        return 1
    fi
    return 0
}

require_jq() {
    if ! command -v jq >/dev/null 2>&1; then
        log_error "jq مطلوب لتحليل النتائج. ثبّته بـ: brew install jq"
        exit 1
    fi
}

# -----------------------------------------------------------------------------
# الفحوصات الفردية
# -----------------------------------------------------------------------------

run_semgrep() {
    log_section "1/9 Semgrep SAST"
    if ! check_tool "semgrep" "python3 -m pip install --user semgrep"; then
        SKIPPED_SCANS+=("semgrep")
        return 0
    fi

    local output_file="${REPORTS_DIR}/semgrep-${TIMESTAMP}.sarif"
    local custom_config=""
    if [[ -f "${CONFIGS_DIR}/.semgrep.yml" ]]; then
        custom_config="--config=${CONFIGS_DIR}/.semgrep.yml"
    fi

    if semgrep scan \
        --config=p/default \
        --config=p/security-audit \
        --config=p/owasp-top-ten \
        ${custom_config} \
        --sarif \
        --output="${output_file}" \
        --metrics=off \
        --quiet 2>>"${LOG_FILE}"; then

        local findings
        findings=$(jq '.runs[0].results | length' "${output_file}" 2>/dev/null || echo "0")
        SCAN_RESULTS["semgrep"]="${findings}"
        SCAN_FILES["semgrep"]="${output_file}"
        TOTAL_ISSUES=$((TOTAL_ISSUES + findings))
        log_success "Semgrep انتهى. النتائج: ${findings}"
        SUCCESS_SCANS+=("semgrep")
    else
        log_error "Semgrep فشل"
        FAILED_SCANS+=("semgrep")
    fi
}

run_gitleaks() {
    log_section "2/9 Gitleaks Secrets"
    local hint="brew install gitleaks أو راجع releases على repo الأداة"
    if ! check_tool "gitleaks" "${hint}"; then
        SKIPPED_SCANS+=("gitleaks")
        return 0
    fi

    local output_file="${REPORTS_DIR}/gitleaks-${TIMESTAMP}.sarif"
    local config_arg=""
    if [[ -f "${REPO_ROOT}/.gitleaks.toml" ]]; then
        config_arg="--config=${REPO_ROOT}/.gitleaks.toml"
    elif [[ -f "${CONFIGS_DIR}/.gitleaks.toml" ]]; then
        config_arg="--config=${CONFIGS_DIR}/.gitleaks.toml"
    fi

    gitleaks detect \
        --source="${REPO_ROOT}" \
        ${config_arg} \
        --report-format=sarif \
        --report-path="${output_file}" \
        --redact \
        --no-banner \
        --exit-code=0 2>>"${LOG_FILE}" || true

    if [[ -f "${output_file}" ]]; then
        local findings
        findings=$(jq '.runs[0].results | length' "${output_file}" 2>/dev/null || echo "0")
        SCAN_RESULTS["gitleaks"]="${findings}"
        SCAN_FILES["gitleaks"]="${output_file}"
        TOTAL_ISSUES=$((TOTAL_ISSUES + findings))
        if [[ "${findings}" -gt 0 ]]; then
            log_warn "Gitleaks اكتشف ${findings} أسرار محتملة"
        else
            log_success "Gitleaks انتهى. لا توجد أسرار مكشوفة"
        fi
        SUCCESS_SCANS+=("gitleaks")
    else
        log_error "Gitleaks لم ينتج تقرير"
        FAILED_SCANS+=("gitleaks")
    fi
}

run_eslint_security() {
    log_section "3/9 ESLint Security"
    if ! check_tool "pnpm" "npm install -g pnpm"; then
        SKIPPED_SCANS+=("eslint")
        return 0
    fi

    local output_file="${REPORTS_DIR}/eslint-${TIMESTAMP}.json"

    pushd "${REPO_ROOT}" >/dev/null
    pnpm exec eslint . \
        --ext .js,.jsx,.ts,.tsx \
        --format=json \
        --output-file="${output_file}" \
        --no-error-on-unmatched-pattern 2>>"${LOG_FILE}" || true
    popd >/dev/null

    if [[ -f "${output_file}" ]]; then
        local findings
        findings=$(jq '[.[] | .messages | length] | add // 0' "${output_file}" 2>/dev/null || echo "0")
        SCAN_RESULTS["eslint"]="${findings}"
        SCAN_FILES["eslint"]="${output_file}"
        TOTAL_ISSUES=$((TOTAL_ISSUES + findings))
        log_success "ESLint انتهى. التحذيرات: ${findings}"
        SUCCESS_SCANS+=("eslint")
    else
        log_error "ESLint فشل"
        FAILED_SCANS+=("eslint")
    fi
}

run_pnpm_audit() {
    log_section "4/9 pnpm audit"
    if ! check_tool "pnpm" "npm install -g pnpm"; then
        SKIPPED_SCANS+=("pnpm-audit")
        return 0
    fi

    local output_file="${REPORTS_DIR}/pnpm-audit-${TIMESTAMP}.json"

    pushd "${REPO_ROOT}" >/dev/null
    pnpm audit --json > "${output_file}" 2>>"${LOG_FILE}" || true
    popd >/dev/null

    if [[ -f "${output_file}" && -s "${output_file}" ]]; then
        local critical high moderate low
        critical=$(jq '.metadata.vulnerabilities.critical // 0' "${output_file}" 2>/dev/null || echo "0")
        high=$(jq '.metadata.vulnerabilities.high // 0' "${output_file}" 2>/dev/null || echo "0")
        moderate=$(jq '.metadata.vulnerabilities.moderate // 0' "${output_file}" 2>/dev/null || echo "0")
        low=$(jq '.metadata.vulnerabilities.low // 0' "${output_file}" 2>/dev/null || echo "0")
        local total=$((critical + high))
        SCAN_RESULTS["pnpm-audit"]="critical:${critical} high:${high} moderate:${moderate} low:${low}"
        SCAN_FILES["pnpm-audit"]="${output_file}"
        TOTAL_ISSUES=$((TOTAL_ISSUES + total))
        if [[ "${total}" -gt 0 ]]; then
            log_warn "pnpm audit وجد ${total} ثغرات حرجة/عالية"
        else
            log_success "pnpm audit نظيف من الثغرات الحرجة"
        fi
        SUCCESS_SCANS+=("pnpm-audit")
    else
        log_error "pnpm audit فشل"
        FAILED_SCANS+=("pnpm-audit")
    fi
}

run_trivy_fs() {
    log_section "5/9 Trivy Filesystem"
    local hint="brew install trivy أو راجع موقع Aqua Security"
    if ! check_tool "trivy" "${hint}"; then
        SKIPPED_SCANS+=("trivy")
        return 0
    fi

    local output_file="${REPORTS_DIR}/trivy-fs-${TIMESTAMP}.sarif"

    trivy fs \
        --scanners vuln,secret,misconfig \
        --severity CRITICAL,HIGH,MEDIUM \
        --format sarif \
        --output "${output_file}" \
        --ignore-unfixed \
        --quiet \
        "${REPO_ROOT}" 2>>"${LOG_FILE}" || true

    if [[ -f "${output_file}" ]]; then
        local findings
        findings=$(jq '.runs[0].results | length' "${output_file}" 2>/dev/null || echo "0")
        SCAN_RESULTS["trivy"]="${findings}"
        SCAN_FILES["trivy"]="${output_file}"
        TOTAL_ISSUES=$((TOTAL_ISSUES + findings))
        log_success "Trivy انتهى. النتائج: ${findings}"
        SUCCESS_SCANS+=("trivy")
    else
        log_error "Trivy فشل"
        FAILED_SCANS+=("trivy")
    fi
}

run_sbom() {
    log_section "6/9 SBOM CycloneDX"
    if ! check_tool "pnpm" "npm install -g pnpm"; then
        SKIPPED_SCANS+=("sbom")
        return 0
    fi

    local output_file="${REPORTS_DIR}/sbom-${TIMESTAMP}.cyclonedx.json"

    pushd "${REPO_ROOT}" >/dev/null
    if pnpm dlx @cyclonedx/cyclonedx-npm \
        --output-format JSON \
        --output-file "${output_file}" \
        --spec-version 1.5 \
        --omit dev 2>>"${LOG_FILE}"; then

        local components
        components=$(jq '.components | length' "${output_file}" 2>/dev/null || echo "0")
        SCAN_RESULTS["sbom"]="${components} مكونات"
        SCAN_FILES["sbom"]="${output_file}"
        log_success "SBOM تم توليده. المكونات: ${components}"
        SUCCESS_SCANS+=("sbom")
    else
        log_error "SBOM فشل"
        FAILED_SCANS+=("sbom")
    fi
    popd >/dev/null
}

run_license_check() {
    log_section "7/9 License Checker"
    if ! check_tool "pnpm" "npm install -g pnpm"; then
        SKIPPED_SCANS+=("license")
        return 0
    fi

    local output_file="${REPORTS_DIR}/licenses-${TIMESTAMP}.json"

    pushd "${REPO_ROOT}" >/dev/null
    if pnpm dlx license-checker \
        --production \
        --json \
        --excludePrivatePackages \
        --out "${output_file}" 2>>"${LOG_FILE}"; then

        local total_packages forbidden
        total_packages=$(jq 'length' "${output_file}" 2>/dev/null || echo "0")
        forbidden=$(jq '[to_entries[] | select(.value.licenses | tostring | test("GPL|AGPL|LGPL|CPAL|OSL|EPL|CDDL|SSPL"))] | length' "${output_file}" 2>/dev/null || echo "0")
        SCAN_RESULTS["license"]="إجمالي:${total_packages} ممنوع:${forbidden}"
        SCAN_FILES["license"]="${output_file}"
        TOTAL_ISSUES=$((TOTAL_ISSUES + forbidden))
        if [[ "${forbidden}" -gt 0 ]]; then
            log_warn "License Checker وجد ${forbidden} حزم بتراخيص ممنوعة"
        else
            log_success "License Checker انتهى. كل التراخيص مقبولة"
        fi
        SUCCESS_SCANS+=("license")
    else
        log_error "License Checker فشل"
        FAILED_SCANS+=("license")
    fi
    popd >/dev/null
}

run_zap_baseline() {
    log_section "8/9 OWASP ZAP Baseline"
    if ! check_tool "docker" "راجع وثائق تثبيت Docker"; then
        SKIPPED_SCANS+=("zap")
        return 0
    fi

    local target="${ZAP_TARGET_URL:-}"
    if [[ -z "${target}" ]]; then
        log_warn "متغير ZAP_TARGET_URL غير معرف. تخطي ZAP"
        SKIPPED_SCANS+=("zap")
        return 0
    fi

    local output_dir="${REPORTS_DIR}/zap-${TIMESTAMP}"
    mkdir -p "${output_dir}"

    docker run --rm \
        -v "${output_dir}:/zap/wrk:rw" \
        -t ghcr.io/zaproxy/zaproxy:stable \
        zap-baseline.py \
        -t "${target}" \
        -J zap-report.json \
        -r zap-report.html \
        -m 5 -T 60 2>>"${LOG_FILE}" || true

    if [[ -f "${output_dir}/zap-report.json" ]]; then
        SCAN_RESULTS["zap"]="انتهى"
        SCAN_FILES["zap"]="${output_dir}/zap-report.html"
        log_success "ZAP Baseline انتهى. التقرير: ${output_dir}"
        SUCCESS_SCANS+=("zap")
    else
        log_warn "ZAP لم ينتج تقرير"
        FAILED_SCANS+=("zap")
    fi
}

run_nuclei() {
    log_section "9/9 Nuclei HTTP Probes"
    local hint="راجع وثائق ProjectDiscovery لتثبيت nuclei"
    if ! check_tool "nuclei" "${hint}"; then
        SKIPPED_SCANS+=("nuclei")
        return 0
    fi

    local target="${NUCLEI_TARGET_URL:-${ZAP_TARGET_URL:-}}"
    if [[ -z "${target}" ]]; then
        log_warn "متغير NUCLEI_TARGET_URL غير معرف. تخطي Nuclei"
        SKIPPED_SCANS+=("nuclei")
        return 0
    fi

    local output_file="${REPORTS_DIR}/nuclei-${TIMESTAMP}.txt"
    local templates_arg=""
    if [[ -f "${CONFIGS_DIR}/nuclei-templates.txt" ]]; then
        templates_arg="-templates ${CONFIGS_DIR}/nuclei-templates.txt"
    fi

    nuclei \
        -target "${target}" \
        ${templates_arg} \
        -severity critical,high,medium \
        -rate-limit 50 \
        -timeout 10 \
        -output "${output_file}" \
        -silent 2>>"${LOG_FILE}" || true

    if [[ -f "${output_file}" ]]; then
        local findings
        findings=$(wc -l < "${output_file}" 2>/dev/null || echo "0")
        SCAN_RESULTS["nuclei"]="${findings}"
        SCAN_FILES["nuclei"]="${output_file}"
        TOTAL_ISSUES=$((TOTAL_ISSUES + findings))
        log_success "Nuclei انتهى. النتائج: ${findings}"
        SUCCESS_SCANS+=("nuclei")
    else
        log_warn "Nuclei لم ينتج تقرير"
        FAILED_SCANS+=("nuclei")
    fi
}

# -----------------------------------------------------------------------------
# توليد تقرير ملخص نهائي بصيغة Markdown
# -----------------------------------------------------------------------------
generate_summary() {
    local summary_file="${REPORTS_DIR}/SUMMARY-${TIMESTAMP}.md"

    {
        echo "# تقرير الفحوصات الأمنية"
        echo ""
        echo "**التاريخ:** $(date '+%Y-%m-%d %H:%M:%S')"
        echo ""
        echo "**إجمالي المشاكل المكتشفة:** ${TOTAL_ISSUES}"
        echo ""
        echo "**حالة الفحوصات:**"
        echo ""
        echo "- ناجحة: ${#SUCCESS_SCANS[@]}"
        echo "- فاشلة: ${#FAILED_SCANS[@]}"
        echo "- متخطاة: ${#SKIPPED_SCANS[@]}"
        echo ""
        echo "## النتائج التفصيلية"
        echo ""
        echo "| الأداة | الحالة | النتيجة | الملف |"
        echo "|---|---|---|---|"

        for scan in "${SUCCESS_SCANS[@]}"; do
            local result="${SCAN_RESULTS[${scan}]:-—}"
            local file="${SCAN_FILES[${scan}]:-—}"
            local file_basename="${file##*/}"
            printf '| %s | ✓ نجح | %s | `%s` |\n' \
                "${scan}" "${result}" "${file_basename}"
        done

        for scan in "${FAILED_SCANS[@]}"; do
            printf '| %s | ✗ فشل | راجع السجل | — |\n' "${scan}"
        done

        for scan in "${SKIPPED_SCANS[@]}"; do
            printf '| %s | — تخطي | الأداة غير متوفرة | — |\n' "${scan}"
        done

        echo ""
        echo "## الملفات الناتجة"
        echo ""
        echo '```'
        find "${REPORTS_DIR}" -name "*${TIMESTAMP}*" -type f 2>/dev/null | sort
        echo '```'
        echo ""
        echo "---"
        echo ""
        echo "ملف السجل الكامل:"
        echo ""
        echo '```'
        echo "${LOG_FILE}"
        echo '```'
    } > "${summary_file}"

    log_info "ملخص التقرير: ${summary_file}"
    echo ""
    cat "${summary_file}"
}

# -----------------------------------------------------------------------------
# تحليل الوسائط
# -----------------------------------------------------------------------------
parse_args() {
    while [[ $# -gt 0 ]]; do
        case "$1" in
            --with-dast)
                RUN_DAST="true"
                shift
                ;;
            --help|-h)
                cat <<EOF
الاستخدام: $0 [خيارات]

الخيارات:
  --with-dast    تشغيل الفحوصات الديناميكية (ZAP و Nuclei)
  --help, -h     عرض هذه الرسالة

متغيرات البيئة:
  ZAP_TARGET_URL       الـ URL المستهدف لـ ZAP
  NUCLEI_TARGET_URL    الـ URL المستهدف لـ Nuclei
  RUN_DAST             تفعيل الفحوصات الديناميكية (true/false)

أمثلة:
  $0
  $0 --with-dast
  ZAP_TARGET_URL=https://staging.example.com $0 --with-dast
EOF
                exit 0
                ;;
            *)
                log_error "وسيط غير معروف: $1"
                exit 1
                ;;
        esac
    done
}

# -----------------------------------------------------------------------------
# الدالة الرئيسية
# -----------------------------------------------------------------------------
main() {
    parse_args "$@"
    mkdir -p "${REPORTS_DIR}"
    require_jq

    log_info "بدء الفحوصات الأمنية"
    log_info "مسار المستودع: ${REPO_ROOT}"
    log_info "مجلد التقارير: ${REPORTS_DIR}"
    log_info "ملف السجل: ${LOG_FILE}"
    log_info "تشغيل الفحوصات الديناميكية: ${RUN_DAST}"

    # الفحوصات الثابتة تعمل دائماً
    run_semgrep
    run_gitleaks
    run_eslint_security
    run_pnpm_audit
    run_trivy_fs
    run_sbom
    run_license_check

    # الفحوصات الديناميكية اختيارية
    if [[ "${RUN_DAST}" == "true" ]]; then
        run_zap_baseline
        run_nuclei
    else
        log_info "تخطي الفحوصات الديناميكية. استخدم --with-dast لتشغيلها"
    fi

    generate_summary

    if [[ ${#FAILED_SCANS[@]} -gt 0 ]]; then
        log_error "فشل ${#FAILED_SCANS[@]} فحوصات: ${FAILED_SCANS[*]}"
        exit 1
    fi

    log_success "كل الفحوصات اكتملت"
    if [[ "${TOTAL_ISSUES}" -gt 0 ]]; then
        log_warn "إجمالي المشاكل المكتشفة: ${TOTAL_ISSUES}"
        exit 2
    fi
    exit 0
}

main "$@"
