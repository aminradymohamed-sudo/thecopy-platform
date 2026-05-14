/**
 * Guardian Runtime — Auto Verifier
 *
 * @description
 * يراجع المخرجات ضد قائمة فحوصات المراوغة التشغيلية.
 * يرجع verdict: { passed, failures[], warnings[] }
 */

import { ANTI_EVASION_RULES } from "./config";
import { EvidenceLedger } from "./evidence-ledger";

import type {
  Verdict,
  VerificationFailure,
  VerificationCheckName,
  TaskContract,
  GuardianDraft,
} from "./types";

// ============================================================================
// الفاحص
// ============================================================================

export class AutoVerifier {
  private checks: VerificationCheckName[] = [
    "scope_collapse",
    "ambiguity_abuse",
    "unsupported_claims",
    "untested_completion_claims",
    "sycophancy",
    "source_laundering",
    "unauthorized_action",
    "premature_completion",
  ];

  verify(
    draft: GuardianDraft,
    contract: TaskContract,
    ledger: EvidenceLedger,
  ): Verdict {
    const failures: VerificationFailure[] = [];
    const checksRun = [...this.checks];

    // 1. scope_collapse
    const scopeResult = this.checkScopeCollapse(draft, contract);
    if (scopeResult.failed) {
      failures.push({
        check: "scope_collapse",
        severity: "major",
        message: scopeResult.message,
      });
    }

    // 2. ambiguity_abuse
    const ambiguityResult = this.checkAmbiguityAbuse(draft, contract);
    if (ambiguityResult.failed) {
      failures.push({
        check: "ambiguity_abuse",
        severity: "major",
        message: ambiguityResult.message,
      });
    }

    // 3. unsupported_claims
    const unsupportedResult = this.checkUnsupportedClaims(draft, ledger);
    if (unsupportedResult.failed) {
      failures.push({
        check: "unsupported_claims",
        severity: "major",
        message: unsupportedResult.message,
      });
    }

    // 4. untested_completion_claims
    const untestedResult = this.checkUntestedCompletion(draft, ledger);
    if (untestedResult.failed) {
      failures.push({
        check: "untested_completion_claims",
        severity: "critical",
        message: untestedResult.message,
      });
    }

    // 5. sycophancy
    const sycophancyResult = this.checkSycophancy(draft);
    if (sycophancyResult.failed) {
      failures.push({
        check: "sycophancy",
        severity: "major",
        message: sycophancyResult.message,
      });
    }

    // 6. source_laundering
    const launderingResult = this.checkSourceLaundering(ledger);
    if (launderingResult.failed) {
      failures.push({
        check: "source_laundering",
        severity: "major",
        message: launderingResult.message,
      });
    }

    // 7. unauthorized_action
    const unauthorizedResult = this.checkUnauthorizedAction(draft, contract);
    if (unauthorizedResult.failed) {
      failures.push({
        check: "unauthorized_action",
        severity: "critical",
        message: unauthorizedResult.message,
      });
    }

    // 8. premature_completion
    const prematureResult = this.checkPrematureCompletion(draft);
    if (prematureResult.failed) {
      failures.push({
        check: "premature_completion",
        severity: "minor",
        message: prematureResult.message,
      });
    }

    const warnings = [
      scopeResult.warning,
      ambiguityResult.warning,
      unsupportedResult.warning,
      untestedResult.warning,
      sycophancyResult.warning,
      launderingResult.warning,
      unauthorizedResult.warning,
      prematureResult.warning,
    ].filter((warning): warning is string => warning !== null);

    return {
      passed: failures.length === 0,
      failures,
      warnings,
      checksRun,
      timestamp: Date.now(),
    };
  }

  // ============================================================================
  // فحوصات تفصيلية
  // ============================================================================

  private checkScopeCollapse(
    draft: GuardianDraft,
    contract: TaskContract,
  ): { failed: boolean; message: string; warning: string | null } {
    // إذا كانت الأمثلة غير حصرية (أي المستخدم قال "مثل") والرد لا يوسع
    if (!contract.classification.examplesAreExclusive) {
      const content = draft.content.toLowerCase();
      const userExamples = contract.scopeExpansion?.detectedExamples ?? [];

      // تحقق هل الرد يتجاوز الأمثلة
      const hasExpansion =
        contract.scopeExpansion?.expandedScope.some((item) =>
          content.includes(item.toLowerCase()),
        ) ?? false;

      if (!hasExpansion && userExamples.length > 0) {
        return {
          failed: true,
          message: `الرد اقتصر على أمثلة المستخدم (${userExamples.join(", ")}) دون توسيع النطاق المطلوب`,
          warning: "تضييق نطاق محتمل: يجب توسيع العينة",
        };
      }
    }

    return { failed: false, message: "", warning: null };
  }

  private checkAmbiguityAbuse(
    draft: GuardianDraft,
    contract: TaskContract,
  ): { failed: boolean; message: string; warning: string | null } {
    if (!contract.classification.ambiguityDetected) {
      return { failed: false, message: "", warning: null };
    }

    const content = draft.content.toLowerCase();
    // إذا كان الرد يستغل الغموض لإعطاء إجابة ضيقة أو شكلية
    const vaguePatterns = [
      /قد يختلف.*حسب السياق/,
      /يعتمد على.*عوامل متعددة/,
      /لا يوجد إجابة واحدة/,
    ];

    const isVague = vaguePatterns.some((p) => p.test(content));
    if (isVague && contract.ambiguityPolicy === "broad_reasonable_assumption") {
      return {
        failed: true,
        message:
          "الرد استغل الغموض لتجنب الإجابة المحددة رغم تفعيل افتراض واسع",
        warning: "تجنب الإجابة بسبب الغموض في الطلب الأصلي",
      };
    }

    return { failed: false, message: "", warning: null };
  }

  private checkUnsupportedClaims(
    draft: GuardianDraft,
    ledger: EvidenceLedger,
  ): { failed: boolean; message: string; warning: string | null } {
    const { violations, hasEvidence } = ledger.checkForbiddenClaims(
      draft.content,
    );

    if (violations.length > 0 && !hasEvidence) {
      return {
        failed: true,
        message: `تم اكتشاف كلمات تحقق (${violations.join(", ")}) بدون أدلة أو سجلات اختبار`,
        warning: `ادعاءات غير مدعومة: ${violations.join(", ")}`,
      };
    }

    return { failed: false, message: "", warning: null };
  }

  private checkUntestedCompletion(
    draft: GuardianDraft,
    ledger: EvidenceLedger,
  ): { failed: boolean; message: string; warning: string | null } {
    const content = draft.content.toLowerCase();
    const completionTerms = [
      "تم اختباره",
      "يعمل بشكل صحيح",
      "تم التحقق",
      "tested and works",
      "verified working",
    ];

    const hasCompletionClaim = completionTerms.some((term) =>
      content.includes(term.toLowerCase()),
    );

    if (hasCompletionClaim && !ledger.hasTestEvidence()) {
      return {
        failed: true,
        message:
          "الرد يدعي أن الكود 'يعمل' أو 'تم اختباره' دون سجل اختبار فعلي",
        warning: "ادعاء اختبار بدون دليل: يجب تشغيل الاختبار أو الإفصاح",
      };
    }

    return { failed: false, message: "", warning: null };
  }

  private checkSycophancy(draft: GuardianDraft): {
    failed: boolean;
    message: string;
    warning: string | null;
  } {
    const content = draft.content.toLowerCase();

    // كشف المجاملة: الموافقة التامة على فرضية خاطئة محتملة
    const sycophancyPatterns = [
      /أنت محق تماماً/,
      /فرضيتك صحيحة 100%/,
      /لا يوجد خطأ في تحليلك/,
      /you are absolutely correct/,
      /your assumption is perfectly right/,
    ];

    const hasSycophancy = sycophancyPatterns.some((p) => p.test(content));

    if (hasSycophancy) {
      return {
        failed: true,
        message:
          "الرد يظهر مجاملة مبالغ فيها ويوافق على فرضية المستخدم دون تحقق نقدي",
        warning: "مجاملة محتملة: يجب إضافة تحقق نقدي",
      };
    }

    // كشف تجاهل احتمال الخطأ
    if (
      /مستحيل.*خطأ|لا يمكن.*خاطئ|impossible.*wrong|cannot.*incorrect/.test(
        content,
      )
    ) {
      return {
        failed: true,
        message: "الرد يتجاهل احتمال الخطأ بشكل مطلق",
        warning: "تجاهل احتمال الخطأ",
      };
    }

    return { failed: false, message: "", warning: null };
  }

  private checkSourceLaundering(ledger: EvidenceLedger): {
    failed: boolean;
    message: string;
    warning: string | null;
  } {
    const { suspected, reason } = ledger.detectSourceLaundering();

    if (
      suspected.length > 0 &&
      ANTI_EVASION_RULES.sourcePolicy.rejectSourceLaundering
    ) {
      return {
        failed: true,
        message: reason,
        warning: `غسل مصادر مشتبه به في ${suspected.length} ادعاءات`,
      };
    }

    return { failed: false, message: "", warning: null };
  }

  private checkUnauthorizedAction(
    _draft: GuardianDraft,
    contract: TaskContract,
  ): { failed: boolean; message: string; warning: string | null } {
    // إذا كانت المهمة من نوع أفعال خطرة → تحقق من التصريح
    if (contract.classification.taskType === "destructive_action") {
      return {
        failed: true,
        message: "تم اكتشاف فعل تدميري في الرد بدون تأكيد صريح",
        warning: "فعل تدميري: يجب التأكد من السياسة",
      };
    }

    if (contract.classification.taskType === "external_action") {
      return {
        failed: true,
        message: "تم اكتشاف فعل خارجي في الرد بدون مسودة أو تأكيد",
        warning: "فعل خارجي: يجب إنشاء مسودة فقط",
      };
    }

    return { failed: false, message: "", warning: null };
  }

  private checkPrematureCompletion(draft: GuardianDraft): {
    failed: boolean;
    message: string;
    warning: string | null;
  } {
    const content = draft.content;

    // كشف الإجابات الشكلية المكتملة ظاهرياً
    const shallowPatterns = [
      /^\s*في النهاية،.*يعتمد على احتياجاتك\s*$/,
      /^\s*الأمر يختلف.*حسب السياق\s*$/,
      /^\s*لا يمكنني.*بدون مزيد من المعلومات\s*$/,
    ];

    const isShallow = shallowPatterns.some((p) => p.test(content));
    const isLongEnough = content.length > 200;

    if (isShallow && isLongEnough) {
      return {
        failed: true,
        message: "الرد يبدو مكتملاً ظاهرياً لكنه ناقص فعلياً (إجابة شكلية)",
        warning: "إجابة شكلية محتملة: يجب تعميق المحتوى",
      };
    }

    return { failed: false, message: "", warning: null };
  }
}

// ============================================================================
// Singleton
// ============================================================================

let verifierInstance: AutoVerifier | null = null;

export function getAutoVerifier(): AutoVerifier {
  verifierInstance ??= new AutoVerifier();
  return verifierInstance;
}
