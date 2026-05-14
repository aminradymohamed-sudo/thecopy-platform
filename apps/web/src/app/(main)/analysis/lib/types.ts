/**
 * Shared types for the analysis surface. The shapes mirror the backend's
 * `analysisStream.registry.ts` so events and snapshots can flow end-to-end
 * without translation.
 */

export type StationId = 1 | 2 | 3 | 4 | 5 | 6 | 7;

export type StationStatus =
  | "idle"
  | "queued"
  | "running"
  | "completed"
  | "failed";

export type PipelineStatus =
  | "idle"
  | "running"
  | "completed"
  | "failed"
  | "cancelled";

export interface StationState {
  id: StationId;
  name: string;
  status: StationStatus;
  progress: number;
  startedAt: string | null;
  completedAt: string | null;
  output: unknown;
  error: string | null;
  confidence: number | null;
}

export interface PipelineWarning {
  id: string;
  stationId: StationId | null;
  message: string;
  severity: "info" | "warn" | "error";
  at: string;
}

export interface AnalysisSnapshot {
  analysisId: string;
  projectId: string | null;
  projectName: string;
  status: PipelineStatus;
  startedAt: string;
  completedAt: string | null;
  textLength: number;
  stations: StationState[];
  warnings: PipelineWarning[];
  finalReport: string | null;
  metadata: Record<string, unknown>;
}

export type StreamEvent =
  | {
      type: "pipeline.started";
      analysisId: string;
      projectName: string;
      capabilities: { exports: string[] };
    }
  | { type: "pipeline.warning"; warning: PipelineWarning }
  | {
      type: "pipeline.completed";
      status: "completed" | "failed";
      durationMs: number;
    }
  | {
      type: "station.started";
      stationId: StationId;
      name: string;
      at: string;
    }
  | { type: "station.progress"; stationId: StationId; progress: number }
  | { type: "station.token"; stationId: StationId; token: string }
  | {
      type: "station.completed";
      stationId: StationId;
      output: unknown;
      confidence: number | null;
      durationMs: number;
    }
  | { type: "station.error"; stationId: StationId; message: string };

export const STATION_IDS: readonly StationId[] = [1, 2, 3, 4, 5, 6, 7] as const;

export const STATION_NAMES: Record<StationId, string> = {
  1: "التحليل العميق للشخصيات",
  2: "التحليل المتقدم للحوار",
  3: "التحليل البصري والسينمائي",
  4: "تحليل الموضوعات والرسائل",
  5: "التحليل الثقافي والتاريخي",
  6: "تحليل قابلية الإنتاج",
  7: "تحليل الجمهور والتقرير النهائي",
};

export const STATION_DESCRIPTIONS: Record<StationId, string> = {
  1: "يفحص الدوافع، الأقواس النفسية، العلاقات، ونقاط التحول الدرامية.",
  2: "يراجع طبيعة الحوار، الإيقاع، النبرة، والوظيفة السردية لكل تبادل.",
  3: "يترجم النص إلى إشارات بصرية وسينمائية قابلة للفهم والإنتاج.",
  4: "يستخرج الموضوعات المركزية والرسائل والتوترات الفكرية داخل النص.",
  5: "يربط النص بسياقه الثقافي والتاريخي ويكشف الافتراضات الحساسة.",
  6: "يقيس قابلية التنفيذ الإنتاجي والتحديات العملية والتكلفة النسبية.",
  7: "يلخص أثر النص على الجمهور ويجمع النتائج في تقرير نهائي قابل للتصدير.",
};

export interface AnalysisRelationship {
  source: string;
  target: string;
  kind: string;
  weight: number;
}
