# =============================================================================
# Makefile للفحوصات الأمنية
# تشغيل سريع للأدوات الأمنية بأوامر مختصرة
# الاستخدام: make help
# =============================================================================

.PHONY: help \
        security-all \
        security-sast \
        security-secrets \
        security-static \
        security-deps \
        security-trivy \
        security-sbom \
        security-licenses \
        security-dast \
        security-quick \
        security-clean \
        install-tools \
        precommit-install

# ===== الافتراضي =====
.DEFAULT_GOAL := help

# ===== متغيرات =====
SHELL := /bin/bash
# فرض UTF-8 على بايثون: مطلوب لقراءة configs/.semgrep.yml الذي يحوي تعليقات عربية،
# وإلا يفشل semgrep على ويندوز بـ UnicodeDecodeError (cp1252).
# لا يضعف الفحص — يضمن فقط أن يقرأ Semgrep إعداداته على كل المنصات.
export PYTHONUTF8 := 1
export PYTHONIOENCODING := utf-8
REPO_ROOT := $(shell git rev-parse --show-toplevel 2>/dev/null || pwd)
SCRIPTS_DIR := $(REPO_ROOT)/scripts/security
CONFIGS_DIR := $(REPO_ROOT)/configs
REPORTS_DIR := $(REPO_ROOT)/reports
TIMESTAMP := $(shell date +%Y%m%d-%H%M%S)

# ===== الأهداف =====

help: ## عرض هذه الرسالة
	@printf '\n\033[1mأوامر الفحوصات الأمنية المتاحة:\033[0m\n\n'
	@grep -E '^[a-zA-Z_-]+:.*?## .*$$' $(MAKEFILE_LIST) \
		| awk 'BEGIN {FS = ":.*?## "}; {printf "  \033[36m%-22s\033[0m %s\n", $$1, $$2}'
	@printf '\n'

security-all: ## تشغيل كل الفحوصات الثابتة (الإجمالي)
	@bash $(SCRIPTS_DIR)/security-scan.sh

security-quick: ## فحص سريع (Semgrep + Gitleaks فقط)
	@$(MAKE) security-sast
	@$(MAKE) security-secrets

security-sast: ## فحص SAST عبر Semgrep
	@mkdir -p $(REPORTS_DIR)
	@semgrep scan \
		--config=p/security-audit \
		--config=p/owasp-top-ten \
		--config=$(CONFIGS_DIR)/.semgrep.yml \
		--sarif --output=$(REPORTS_DIR)/semgrep-$(TIMESTAMP).sarif \
		--metrics=off

security-secrets: ## كشف الأسرار عبر Gitleaks
	@mkdir -p $(REPORTS_DIR)
	@gitleaks detect \
		--source=. \
		--config=$(REPO_ROOT)/.gitleaks.toml \
		--report-format=sarif \
		--report-path=$(REPORTS_DIR)/gitleaks-$(TIMESTAMP).sarif \
		--redact \
		--no-banner \
		--verbose

security-static: ## فحص ESLint الأمني
	@mkdir -p $(REPORTS_DIR)
	@pnpm exec eslint . \
		--ext .js,.jsx,.ts,.tsx \
		--format=json \
		--output-file=$(REPORTS_DIR)/eslint-$(TIMESTAMP).json \
		--no-error-on-unmatched-pattern

security-deps: ## فحص الاعتمادات عبر pnpm audit
	@mkdir -p $(REPORTS_DIR)
	@pnpm audit --audit-level=moderate

security-trivy: ## فحص نظام الملفات عبر Trivy
	@mkdir -p $(REPORTS_DIR)
	@trivy fs \
		--scanners vuln,secret,misconfig \
		--severity CRITICAL,HIGH,MEDIUM \
		--format sarif \
		--output $(REPORTS_DIR)/trivy-$(TIMESTAMP).sarif \
		--ignore-unfixed \
		.

security-sbom: ## توليد SBOM بصيغة CycloneDX
	@mkdir -p $(REPORTS_DIR)
	@pnpm dlx @cyclonedx/cyclonedx-npm \
		--output-format JSON \
		--output-file $(REPORTS_DIR)/sbom-$(TIMESTAMP).cyclonedx.json \
		--spec-version 1.5 \
		--omit dev
	@printf 'SBOM في: %s\n' "$(REPORTS_DIR)/sbom-$(TIMESTAMP).cyclonedx.json"

security-licenses: ## فحص تراخيص الحزم
	@mkdir -p $(REPORTS_DIR)
	@pnpm dlx license-checker \
		--production \
		--json \
		--excludePrivatePackages \
		--out $(REPORTS_DIR)/licenses-$(TIMESTAMP).json
	@pnpm dlx license-checker \
		--production \
		--summary \
		--excludePrivatePackages \
		--failOn 'GPL;AGPL;LGPL;CPAL;OSL;EPL;CDDL;SSPL'

security-dast: ## فحص ديناميكي (يتطلب ZAP_TARGET_URL)
	@RUN_DAST=true bash $(SCRIPTS_DIR)/security-scan.sh --with-dast

security-clean: ## حذف تقارير الفحوصات القديمة
	@rm -rf $(REPORTS_DIR)
	@printf 'تم حذف %s\n' "$(REPORTS_DIR)"

install-tools: ## تثبيت أدوات الفحص محلياً
	@printf '\033[1mتثبيت Semgrep...\033[0m\n'
	@python3 -m pip install --user --upgrade semgrep
	@printf '\033[1mتثبيت Gitleaks...\033[0m\n'
	@if command -v brew >/dev/null; then \
		brew install gitleaks; \
	else \
		printf 'استخدم الـ binary من releases على repo الأداة\n'; \
	fi
	@printf '\033[1mتثبيت Trivy...\033[0m\n'
	@if command -v brew >/dev/null; then \
		brew install trivy; \
	else \
		printf 'راجع وثائق Aqua Security للتثبيت\n'; \
	fi
	@printf '\033[1mتثبيت jq...\033[0m\n'
	@if command -v brew >/dev/null; then \
		brew install jq; \
	elif command -v apt-get >/dev/null; then \
		sudo apt-get install -y jq; \
	fi
	@printf '\033[32mتم تثبيت الأدوات الأساسية\033[0m\n'

precommit-install: ## تثبيت pre-commit hooks
	@if ! command -v pre-commit >/dev/null; then \
		python3 -m pip install --user pre-commit; \
	fi
	@pre-commit install
	@pre-commit install --hook-type commit-msg
	@printf '\033[32mتم تفعيل pre-commit hooks\033[0m\n'
