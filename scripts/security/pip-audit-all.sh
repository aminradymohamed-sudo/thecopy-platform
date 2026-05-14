#!/usr/bin/env bash
# ===================================================================
# scripts/security/pip-audit-all.sh
# ===================================================================
# فحص pip-audit (PyPA الرسمي) لكل requirements.txt في المستودع.
# يقوّي طبقة الفحص الأمني لمشاريع Python حيث يفشل Snyk CLI في
# احترام pin الإصدارات الدقيقة (==). راجع docs/security/acceptable-risks.md
# AR-003 للتفاصيل.
#
# الاستخدام:
#   bash scripts/security/pip-audit-all.sh
#
# المخرجات: ينتهي بنجاح (0) فقط إذا لم تُكتشف ثغرات في حزم المشروع.
# pip نفسه (الـ installer) لا يُحسَب — يُدار عبر صور النشر.
# ===================================================================

set -euo pipefail

REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"

PYTHON_PROJECTS=(
  "apps/backend/editor-runtime/karank_engine"
  "apps/web/src/app/(main)/directors-studio/director_copilot_arabic_mvp_runtime_pack/backend"
)

# Packages excluded from the gate — these are tool-level (the pip installer
# itself) and not project dependencies. Tracked separately via deployment
# image hardening.
EXCLUDED_PACKAGES=("pip")

EXIT_CODE=0

for proj in "${PYTHON_PROJECTS[@]}"; do
  full_path="$REPO_ROOT/$proj"
  req_file="$full_path/requirements.txt"

  if [[ ! -f "$req_file" ]]; then
    echo "::warning::Skipping $proj — no requirements.txt"
    continue
  fi

  echo ""
  echo "==================================================="
  echo "pip-audit: $proj"
  echo "==================================================="

  venv_dir="$full_path/.venv"

  if [[ ! -d "$venv_dir" ]]; then
    echo "Creating venv at $venv_dir..."
    python -m venv "$venv_dir" --clear
  fi

  if [[ -f "$venv_dir/Scripts/pip" ]]; then
    PIP="$venv_dir/Scripts/pip"
    PIP_AUDIT="$venv_dir/Scripts/pip-audit"
  else
    PIP="$venv_dir/bin/pip"
    PIP_AUDIT="$venv_dir/bin/pip-audit"
  fi

  "$PIP" install --no-cache-dir --quiet -r "$req_file" 2>/dev/null
  "$PIP" install --no-cache-dir --quiet pip-audit 2>/dev/null

  # Use JSON format for reliable parsing
  set +e
  json_output=$("$PIP_AUDIT" --format=json 2>/dev/null)
  audit_status=$?
  set -e

  # Filter out excluded packages and count remaining vulnerabilities
  filter_jq='[.dependencies[] | select(.vulns != null and (.vulns | length > 0))'
  for excluded in "${EXCLUDED_PACKAGES[@]}"; do
    filter_jq+=" | select(.name != \"$excluded\")"
  done
  filter_jq+=']'

  project_vulns=$(echo "$json_output" | jq "$filter_jq")
  project_vuln_count=$(echo "$project_vulns" | jq 'length')

  if [[ "$project_vuln_count" -gt 0 ]]; then
    echo "::error::Project-level vulnerabilities found in $proj:"
    echo "$project_vulns" | jq -r '.[] | "  - \(.name)@\(.version): \(.vulns | length) issue(s)"'
    echo ""
    echo "Full details:"
    echo "$project_vulns" | jq '.'
    EXIT_CODE=1
  else
    # Show what was scanned (any excluded findings noted)
    excluded_findings=$(echo "$json_output" | jq -r '[.dependencies[] | select(.vulns != null and (.vulns | length > 0)) | .name] | unique | join(", ")')
    if [[ -n "$excluded_findings" ]] && [[ "$excluded_findings" != "" ]]; then
      echo "OK — project deps clean. (Excluded tool-level findings in: $excluded_findings — tracked separately.)"
    else
      echo "OK — no vulnerabilities found."
    fi
  fi
done

exit $EXIT_CODE
