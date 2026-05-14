import type {
  PromptAnalysis,
  PromptTemplate,
} from "@the-copy/prompt-engineering/types";

export interface PromptHistoryEntry {
  prompt: string;
  timestamp: Date;
  score: number;
}

export interface PersistedPromptHistoryEntry {
  prompt: string;
  timestamp: string;
  score: number;
}

export interface PromptEngineeringSnapshot {
  prompt: string;
  analysis: PromptAnalysis | null;
  activeTab: string;
  selectedTemplate: PromptTemplate | null;
  templateVariables: Record<string, string>;
  promptHistory: PersistedPromptHistoryEntry[];
  comparePrompt1: string;
  comparePrompt2: string;
  comparisonResult: unknown;
  labInput: string;
  labResult: PromptStudioLabResult | null;
  suggestions: string[];
}

export interface PromptStudioLabResult {
  input: string;
  analysis: PromptAnalysis;
  suggestions: string[];
  ranAt: string;
}
