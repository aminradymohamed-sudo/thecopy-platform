/**
 * @description منطق تحميل بيانات التحليل المحفوظة من localStorage/sessionStorage.
 * دالة خالصة (لا hooks) — تقبل dispatch وبيانات الحالة الحالية كمعاملات.
 */

import { loadRemoteAppState } from "@/lib/app-state-client";

import type { SevenStationsAnalysis } from "../types";
import type {
  ActionType,
  AnalysisSnapshot,
} from "./creative-development-types";

type ToastFn = (options: {
  title?: string;
  description?: string;
  variant?: "default" | "destructive";
}) => void;

export interface DevelopmentDraft {
  textInput?: string;
  analysisReport?: string;
  specialRequirements?: string;
  additionalInfo?: string;
  ownerId?: string;
  ts?: number;
}

type AppStateClientModule = typeof import("@/lib/app-state-client");
type OptionalAppStateClientModule = Partial<
  Pick<AppStateClientModule, "persistRemoteAppState">
>;

export const DEVELOPMENT_DRAFT_KEY = "development_draft";
export const DEVELOPMENT_DRAFT_OWNER_KEY = "development_draft_owner";

const DEVELOPMENT_DRAFT_TTL_MS = 86_400_000;

function readDevelopmentDraftOwner(): string | null {
  try {
    const owner = sessionStorage.getItem(DEVELOPMENT_DRAFT_OWNER_KEY)?.trim();
    if (!owner) {
      return null;
    }
    return owner;
  } catch {
    return null;
  }
}

function isFreshDraft(draft: DevelopmentDraft): boolean {
  return Boolean(draft.ts && Date.now() - draft.ts < DEVELOPMENT_DRAFT_TTL_MS);
}

function belongsToCurrentOwner(
  draft: DevelopmentDraft,
  ownerId: string | null
): boolean {
  return !draft.ownerId || Boolean(ownerId && draft.ownerId === ownerId);
}

const restoreDraftFields = (
  dispatch: React.Dispatch<ActionType>,
  parsed: DevelopmentDraft
): void => {
  if (parsed.textInput) {
    dispatch({ type: "SET_TEXT_INPUT", payload: parsed.textInput });
  }
  if (parsed.analysisReport) {
    dispatch({
      type: "SET_ANALYSIS_REPORT",
      payload: parsed.analysisReport,
    });
  }
  if (parsed.specialRequirements) {
    dispatch({
      type: "SET_SPECIAL_REQUIREMENTS",
      payload: parsed.specialRequirements,
    });
  }
  if (parsed.additionalInfo) {
    dispatch({
      type: "SET_ADDITIONAL_INFO",
      payload: parsed.additionalInfo,
    });
  }
};

/**
 * تحميل بيانات التحليل المحفوظة من localStorage أو sessionStorage.
 * يتحقق أولاً من وجود تحليل المحطات السبع ثم من الجلسة ثم من الخادم البعيد.
 */
export function loadSavedAnalysisDataImpl(
  dispatch: React.Dispatch<ActionType>,
  currentTextInput: string,
  currentAnalysisReport: string,
  toast: ToastFn
): void {
  const draftOwnerId = readDevelopmentDraftOwner();

  // التحقق من بيانات المحطات السبع
  const sevenStationsData = localStorage.getItem("sevenStationsAnalysis");
  if (sevenStationsData) {
    try {
      const analysisData = JSON.parse(
        sevenStationsData
      ) as SevenStationsAnalysis;
      if (analysisData.finalReport && analysisData.originalText) {
        dispatch({ type: "LOAD_SEVEN_STATIONS", payload: analysisData });
        toast({
          title: "تم استيراد التقرير من نظام المحطات السبع",
          description: `مستوى الثقة: ${(analysisData.confidence * 100).toFixed(1)}%`,
        });
        localStorage.removeItem("sevenStationsAnalysis");
        return;
      }
    } catch (error) {
      console.warn("Failed to restore seven stations analysis", error);
    }
  }

  // التحقق من بيانات الجلسة
  const storedAnalysis = sessionStorage.getItem("stationAnalysisResults");
  const storedId = sessionStorage.getItem("analysisId");

  if (storedAnalysis && storedId) {
    try {
      const analysisData = JSON.parse(storedAnalysis) as {
        stationOutputs?: { station7?: unknown };
      };
      if (analysisData.stationOutputs?.station7) {
        dispatch({
          type: "LOAD_SESSION_ANALYSIS",
          payload: {
            report: JSON.stringify(
              analysisData.stationOutputs.station7,
              null,
              2
            ),
            id: storedId,
          },
        });
        return;
      }
    } catch (error) {
      console.warn("Failed to restore station session analysis", error);
    }
  }

  void Promise.resolve(loadRemoteAppState<AnalysisSnapshot>("analysis"))
    .then((snapshot) => {
      if (!snapshot) return;

      const report = snapshot.results?.["7"];
      if (report && snapshot.analysisId) {
        dispatch({
          type: "LOAD_SESSION_ANALYSIS",
          payload: {
            report: JSON.stringify(report, null, 2),
            id: snapshot.analysisId,
          },
        });
      }

      if (snapshot.text && !currentTextInput) {
        dispatch({ type: "SET_TEXT_INPUT", payload: snapshot.text });
      }
    })
    .catch(() => {
      /* empty */
    });

  if (draftOwnerId) {
    void Promise.resolve(loadRemoteAppState<DevelopmentDraft>("development"))
      .then((draft) => {
        if (
          !draft ||
          currentTextInput ||
          currentAnalysisReport ||
          !isFreshDraft(draft) ||
          draft.ownerId !== draftOwnerId
        ) {
          return;
        }

        restoreDraftFields(dispatch, draft);
        toast({
          title: "تم استعادة المسودة",
          description: "تم استعادة المدخلات من سياق المتصفح الحالي",
        });
      })
      .catch(() => {
        /* empty */
      });
  }

  // التحقق من النص الأصلي المحفوظ
  const storedText = sessionStorage.getItem("originalText");
  if (storedText && !currentTextInput) {
    dispatch({ type: "SET_TEXT_INPUT", payload: storedText });
  }

  // استعادة المسودة المحفوظة كملاذ أخير
  if (currentTextInput || currentAnalysisReport) {
    return;
  }

  try {
    const draft = sessionStorage.getItem(DEVELOPMENT_DRAFT_KEY);
    if (!draft) return;

    const parsed = JSON.parse(draft) as DevelopmentDraft;
    if (!isFreshDraft(parsed) || !belongsToCurrentOwner(parsed, draftOwnerId)) {
      return;
    }

    restoreDraftFields(dispatch, parsed);
    toast({
      title: "تم استعادة المسودة",
      description: "تم استعادة المدخلات من الجلسة السابقة",
    });
  } catch {
    // corrupt draft — ignore
  }
}

export function saveDevelopmentDraft(draft: DevelopmentDraft): void {
  const ownerId = readDevelopmentDraftOwner();
  const scopedDraft: DevelopmentDraft = ownerId ? { ...draft, ownerId } : draft;

  saveDevelopmentDraftToSession(scopedDraft);

  if (!ownerId) {
    return;
  }

  void import("@/lib/app-state-client")
    .then((client: OptionalAppStateClientModule) => {
      if (typeof client.persistRemoteAppState !== "function") {
        return undefined;
      }

      return client.persistRemoteAppState("development", scopedDraft);
    })
    .catch(() => {
      /* local session storage already captured the draft */
    });
}

export function saveDevelopmentDraftToSession(draft: DevelopmentDraft): void {
  const ownerId = readDevelopmentDraftOwner();
  const scopedDraft: DevelopmentDraft = ownerId ? { ...draft, ownerId } : draft;

  try {
    sessionStorage.setItem(DEVELOPMENT_DRAFT_KEY, JSON.stringify(scopedDraft));
  } catch {
    // quota exceeded — non-critical
  }
}

export function clearDevelopmentDraft(): void {
  const ownerId = readDevelopmentDraftOwner();
  try {
    sessionStorage.removeItem(DEVELOPMENT_DRAFT_KEY);
    sessionStorage.removeItem("originalText");
  } catch {
    // Storage may be blocked; state clearing still proceeds in memory.
  }

  if (!ownerId) {
    return;
  }

  void import("@/lib/app-state-client")
    .then((client: OptionalAppStateClientModule) => {
      if (typeof client.persistRemoteAppState !== "function") {
        return undefined;
      }

      return client.persistRemoteAppState("development", {
        ownerId,
        textInput: "",
        analysisReport: "",
        specialRequirements: "",
        additionalInfo: "",
        ts: Date.now(),
      } satisfies DevelopmentDraft);
    })
    .catch(() => {
      /* remote clearing is best-effort and scoped by explicit owner only */
    });
}
