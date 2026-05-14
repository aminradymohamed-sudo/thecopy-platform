/**
 * Guardian Runtime — Orchestrator
 *
 * @description
 * المحرك الرئيسي الذي يجمع كل المكونات الثمانية في مسار تنفيذي واحد.
 * يتبع التصميم الموصوف في الحارس.md:
 * classify → route → scope_expand → resolve_ambiguity → plan → execute → ledger → verify → repair → final
 */

import { getAssumptionEngine } from "./assumption-engine";
import { GUARDIAN_RUNTIME_CONFIG } from "./config";
import { createEvidenceLedger } from "./evidence-ledger";
import { getFinalizer } from "./finalizer";
import { getRepairLoop } from "./repair-loop";
import { getSpeedQualityRouter } from "./router";
import { getScopeController } from "./scope-controller";
import { getTaskClassifier } from "./task-classifier";
import { getAutoVerifier } from "./verifier";

import type {
  TaskContract,
  TaskClassification,
  GuardianRuntimeResult,
  GuardianDraft,
  ExecutionTraceEntry,
  FinalAnswer,
  Verdict,
} from "./types";

// ============================================================================
// واجهة المدخلات
// ============================================================================

export interface GuardianRuntimeInput {
  userRequest: string;
  originalInput?: string;
  context?: {
    userId?: string;
    conversationHistory?: string[];
    permissions?: Partial<typeof GUARDIAN_RUNTIME_CONFIG.permissions>;
  };
}

// ============================================================================
// المحرك الرئيسي
// ============================================================================

export class GuardianRuntime {
  private classifier = getTaskClassifier();
  private scopeController = getScopeController();
  private assumptionEngine = getAssumptionEngine();
  private router = getSpeedQualityRouter();
  private verifier = getAutoVerifier();
  private repairLoop = getRepairLoop();
  private finalizer = getFinalizer();

  /**
   * ينفذ مسار Guardian Runtime الكامل
   */
  async execute(
    input: GuardianRuntimeInput,
    executor: (contract: TaskContract) => Promise<GuardianDraft>,
  ): Promise<GuardianRuntimeResult> {
    const startTime = Date.now();
    const trace: ExecutionTraceEntry[] = [];

    const addTrace = (
      phase: string,
      status: ExecutionTraceEntry["status"],
      details: Record<string, unknown> | undefined = undefined,
    ) => {
      trace.push({ phase, status, timestamp: Date.now(), details });
    };

    try {
      // 1. classify
      addTrace("classify", "started");
      const classification = this.classifier.classify(input.userRequest);
      addTrace("classify", "completed", {
        taskType: classification.taskType,
        riskLevel: classification.riskLevel,
      });

      // 2. route
      addTrace("route", "started");
      const routeDecision = this.router.route(classification);
      addTrace("route", "completed", {
        mode: routeDecision.mode,
        verifier: routeDecision.verifier,
      });

      // 3. scope_expand
      addTrace("scope_expand", "started");
      const scopeExpansion = this.scopeController.expandScope(
        input.userRequest,
      );
      addTrace("scope_expand", "completed", {
        expansionApplied: scopeExpansion.expansionApplied,
      });

      // 4. resolve_ambiguity
      addTrace("resolve_ambiguity", "started");
      const ambiguityResult = this.assumptionEngine.resolveAmbiguity(
        input.userRequest,
        classification,
      );
      addTrace("resolve_ambiguity", "completed", {
        assumptionsCount: ambiguityResult.assumptions.length,
        shouldAskUser: ambiguityResult.shouldAskUser,
      });

      // إذا كان الفعل غير قابل للعكس → نوقف ونطلب تأكيد
      if (ambiguityResult.shouldAskUser) {
        addTrace("resolve_ambiguity", "failed", {
          reason: ambiguityResult.askUserReason,
        });
        return this.buildRefusalResult(
          input.userRequest,
          ambiguityResult.askUserReason ??
            "فعل غير قابل للعكس يتطلب تأكيداً صريحاً",
          startTime,
          trace,
          classification,
        );
      }

      // 5. build contract
      addTrace("build_contract", "started");
      const contract: TaskContract = {
        userRequest: input.userRequest,
        originalInput: input.originalInput ?? input.userRequest,
        classification,
        speedMode: routeDecision.mode,
        ambiguityPolicy: ambiguityResult.shouldAskUser
          ? "ask_user"
          : "broad_reasonable_assumption",
        scopeExpansion,
        assumptions: ambiguityResult.assumptions,
        maxRepairLoops: routeDecision.maxRepairLoops,
        verifierStrength: routeDecision.verifier,
        permissions: {
          ...GUARDIAN_RUNTIME_CONFIG.permissions,
          ...input.context?.permissions,
        },
        timestamp: Date.now(),
      };
      addTrace("build_contract", "completed", { mode: contract.speedMode });

      // 6. plan (داخلي — نسجل فقط)
      addTrace("plan", "completed", { plan: "تنفيذ مباشر حسب المسار المختار" });

      // 7. execute (يُمرر من الخارج)
      addTrace("execute", "started");
      // const policyProxy = createToolPolicyProxy(contract.permissions); // مستقبلاً للتوسيع
      const evidenceLedger = createEvidenceLedger();

      // تسجيل الافتراضات في الـ ledger
      for (const assumption of contract.assumptions) {
        evidenceLedger.addClaim(
          assumption.assumption,
          "TaskContract",
          "model_output",
          "medium",
        );
      }

      let draft = await executor(contract);
      addTrace("execute", "completed", { contentLength: draft.content.length });

      // 8. evidence/test ledger
      addTrace("ledger", "completed", {
        claimsCount: evidenceLedger.getClaims().length,
        testLogsCount: evidenceLedger.getTestLogs().length,
      });

      // 9. verify
      addTrace("verify", "started");
      let verdict = this.verifier.verify(draft, contract, evidenceLedger);
      const initialVerdict = verdict;
      addTrace("verify", "completed", {
        passed: verdict.passed,
        failures: verdict.failures.length,
      });

      // 10. repair (if needed)
      let repairCount = 0;
      if (!verdict.passed && contract.maxRepairLoops > 0) {
        addTrace("repair", "started");
        const repairResult = await this.repairLoop.executeRepair(
          draft,
          verdict,
          contract,
          async () => {
            // في التنفيذ الفعلي، يجب إعادة التنفيذ مع التعليمات
            // هنا نطبق الإصلاحات النصية المباشرة
            const repairInstructions =
              this.repairLoop.generateRepairInstructions(verdict.failures);
            return this.repairLoop.applyRepair(draft, repairInstructions);
          },
        );

        draft = repairResult.repairedDraft;
        repairCount = repairResult.repairCount;

        // إعادة التحقق بعد الإصلاح
        if (repairCount > 0) {
          const repairedVerdict = this.verifier.verify(
            draft,
            contract,
            evidenceLedger,
          );
          verdict = mergeRepairVerdicts(initialVerdict, repairedVerdict);
        }

        addTrace("repair", "completed", {
          repairCount,
          finalPassed: verdict.passed,
        });
      }

      // 11. final
      addTrace("final", "started");
      const answer = this.finalizer.finalize(
        draft,
        verdict,
        contract,
        evidenceLedger,
      );
      addTrace("final", "completed");

      const durationMs = Date.now() - startTime;

      return {
        answer,
        contract,
        ledger: evidenceLedger.toLedgerObject(),
        verdict,
        repairCount,
        executionTrace: trace,
        durationMs,
      };
    } catch (error) {
      addTrace("execute", "failed", {
        error: error instanceof Error ? error.message : String(error),
      });

      return this.buildErrorResult(
        input.userRequest,
        error instanceof Error ? error.message : "خطأ غير معروف",
        startTime,
        trace,
      );
    }
  }

  // ============================================================================
  // نتائج مساعدة
  // ============================================================================

  private buildRefusalResult(
    userRequest: string,
    reason: string,
    startTime: number,
    trace: ExecutionTraceEntry[],
    classification?: TaskClassification,
  ): GuardianRuntimeResult {
    const contract = this.buildMinimalContract(userRequest, classification);
    const answer: FinalAnswer = {
      content: `تم رفض الطلب تلقائياً: ${reason}`,
      sources: undefined,
      confidenceLimits: ["الفعل المطلوب يتطلب تأكيداً صريحاً من المستخدم."],
      assumptions: undefined,
      internalDetailsExposed: false,
    };

    return {
      answer,
      contract,
      ledger: { claims: [], testLogs: [], sourcesChecked: [] },
      verdict: {
        passed: false,
        failures: [
          {
            check: "unauthorized_action",
            severity: "critical",
            message: reason,
          },
        ],
        warnings: ["الطلب يتطلب تدخلاً يدوياً"],
        checksRun: ["unauthorized_action"],
        timestamp: Date.now(),
      },
      repairCount: 0,
      executionTrace: trace,
      durationMs: Date.now() - startTime,
    };
  }

  private buildErrorResult(
    userRequest: string,
    errorMessage: string,
    startTime: number,
    trace: ExecutionTraceEntry[],
  ): GuardianRuntimeResult {
    const contract = this.buildMinimalContract(userRequest);
    const answer: FinalAnswer = {
      content: `عذراً، حدث خطأ أثناء معالجة الطلب: ${errorMessage}`,
      sources: undefined,
      confidenceLimits: ["منخفضة: حدث خطأ تقني أثناء المعالجة."],
      assumptions: undefined,
      internalDetailsExposed: false,
    };

    return {
      answer,
      contract,
      ledger: { claims: [], testLogs: [], sourcesChecked: [] },
      verdict: {
        passed: false,
        failures: [
          {
            check: "premature_completion",
            severity: "critical",
            message: errorMessage,
          },
        ],
        warnings: ["خطأ في التنفيذ"],
        checksRun: [],
        timestamp: Date.now(),
      },
      repairCount: 0,
      executionTrace: trace,
      durationMs: Date.now() - startTime,
    };
  }

  private buildMinimalContract(
    userRequest: string,
    classification?: TaskClassification,
  ): TaskContract {
    return {
      userRequest,
      originalInput: userRequest,
      classification: classification ?? {
        taskType: "unknown",
        riskLevel: "low",
        needsWeb: false,
        needsSources: false,
        needsTests: false,
        needsSandbox: false,
        examplesAreExclusive: true,
        ambiguityDetected: false,
        userIntentSummary: "unknown",
      },
      speedMode: "balanced",
      ambiguityPolicy: "broad_reasonable_assumption",
      scopeExpansion: null,
      assumptions: [],
      maxRepairLoops: 1,
      verifierStrength: "medium",
      permissions: GUARDIAN_RUNTIME_CONFIG.permissions,
      timestamp: Date.now(),
    };
  }
}

function mergeRepairVerdicts(original: Verdict, repaired: Verdict): Verdict {
  const failures = [...original.failures];

  for (const failure of repaired.failures) {
    if (
      !failures.some(
        (existing) =>
          existing.check === failure.check &&
          existing.message === failure.message,
      )
    ) {
      failures.push(failure);
    }
  }

  return {
    passed: failures.length === 0,
    failures,
    warnings: [...new Set([...original.warnings, ...repaired.warnings])],
    checksRun: [...new Set([...original.checksRun, ...repaired.checksRun])],
    timestamp: repaired.timestamp,
  };
}

// ============================================================================
// Singleton
// ============================================================================

let runtimeInstance: GuardianRuntime | null = null;

export function getGuardianRuntime(): GuardianRuntime {
  runtimeInstance ??= new GuardianRuntime();
  return runtimeInstance;
}
