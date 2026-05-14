/**
 * Guardian Runtime — Evidence Ledger
 *
 * @description
 * يسجل كل ادعاء مع مصدره ويمنع كلمات التحقق بدون دليل.
 * يخزن في الذاكرة مع إمكانية التوسع لاحقاً.
 */

import { ANTI_EVASION_RULES } from "./config";

import type {
  EvidenceClaim,
  EvidenceLedger as EvidenceLedgerType,
  TestLog,
} from "./types";

// ============================================================================
// سجل الأدلة
// ============================================================================

export class EvidenceLedger {
  private claims: EvidenceClaim[] = [];
  private testLogs: TestLog[] = [];
  private sourcesChecked = new Set<string>();

  // ============================================================================
  // إدارة الادعاءات
  // ============================================================================

  addClaim(
    claim: string,
    source: string | undefined = undefined,
    sourceType: EvidenceClaim["sourceType"] = "model_output",
    confidence: EvidenceClaim["confidence"] = "unverified",
  ): EvidenceClaim {
    const entry: EvidenceClaim = {
      id: this.generateId("claim"),
      claim: claim.trim(),
      source,
      sourceType,
      confidence,
      timestamp: Date.now(),
      validated: false,
    };

    this.claims.push(entry);
    if (source) {
      this.sourcesChecked.add(source);
    }

    return entry;
  }

  getClaims(): EvidenceClaim[] {
    return [...this.claims];
  }

  getClaimsByConfidence(
    confidence: EvidenceClaim["confidence"],
  ): EvidenceClaim[] {
    return this.claims.filter((c) => c.confidence === confidence);
  }

  // ============================================================================
  // إدارة سجلات الاختبار
  // ============================================================================

  addTestLog(
    testName: string,
    executed: boolean,
    passed: boolean | null,
    output: string,
  ): TestLog {
    const log: TestLog = {
      id: this.generateId("test"),
      testName,
      executed,
      passed,
      output: output.trim(),
      timestamp: Date.now(),
    };

    this.testLogs.push(log);
    return log;
  }

  getTestLogs(): TestLog[] {
    return [...this.testLogs];
  }

  hasTestEvidence(): boolean {
    return this.testLogs.some((t) => t.executed);
  }

  // ============================================================================
  // فحص الأدلة
  // ============================================================================

  /**
   * يتحقق ما إذا كان الادعاء يحتوي على كلمات محظورة بدون دليل
   */
  checkForbiddenClaims(text: string): {
    violations: string[];
    hasEvidence: boolean;
  } {
    const forbiddenTerms =
      ANTI_EVASION_RULES.verificationClaims.forbiddenWithoutEvidence;
    const violations: string[] = [];

    for (const term of forbiddenTerms) {
      if (text.toLowerCase().includes(term.toLowerCase())) {
        violations.push(term);
      }
    }

    const hasEvidence =
      this.hasTestEvidence() || this.claims.some((c) => c.validated);

    return { violations, hasEvidence };
  }

  /**
   * يتحقق من وجود مصادر للادعاءات
   */
  validateSources(): {
    aligned: EvidenceClaim[];
    unaligned: EvidenceClaim[];
  } {
    const aligned: EvidenceClaim[] = [];
    const unaligned: EvidenceClaim[] = [];

    for (const claim of this.claims) {
      if (claim.source && claim.source.trim().length > 0) {
        claim.validated = true;
        aligned.push(claim);
      } else {
        unaligned.push(claim);
      }
    }

    return { aligned, unaligned };
  }

  /**
   * يكشف "غسل المصدر" (source laundering)
   * المصدر الثانوي يُقدم كأولي، أو الادعاء أقوى من الدليل
   */
  detectSourceLaundering(): {
    suspected: EvidenceClaim[];
    reason: string;
  } {
    const suspected: EvidenceClaim[] = [];

    for (const claim of this.claims) {
      // إذا كان المصدر ثانوي لكن الادعاء قوي
      if (claim.sourceType === "secondary" && claim.confidence === "high") {
        suspected.push(claim);
      }
      // إذا كان المصدر غير موجود لكن الثقة عالية
      if (!claim.source && claim.confidence === "high") {
        suspected.push(claim);
      }
    }

    return {
      suspected,
      reason:
        suspected.length > 0
          ? "تم اكتشاف ادعاءات ذات ثقة عالية بدون مصادر أولية كافية"
          : "لا يوجد غسل مصادر مشتبه به",
    };
  }

  // ============================================================================
  // التصدير
  // ============================================================================

  toLedgerObject(): EvidenceLedgerType {
    return {
      claims: [...this.claims],
      testLogs: [...this.testLogs],
      sourcesChecked: Array.from(this.sourcesChecked),
    };
  }

  clear(): void {
    this.claims = [];
    this.testLogs = [];
    this.sourcesChecked.clear();
  }

  // ============================================================================
  // مساعد
  // ============================================================================

  private generateId(prefix: string): string {
    return `${prefix}_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
  }
}

// ============================================================================
// Factory
// ============================================================================

export function createEvidenceLedger(): EvidenceLedger {
  return new EvidenceLedger();
}
