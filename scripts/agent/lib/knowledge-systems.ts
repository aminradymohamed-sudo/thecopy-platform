// Knowledge Systems - Barrel Export
// Re-exports all public APIs from the modular structure
// @deprecated This file is kept for backward compatibility.
// Prefer importing from './knowledge-systems/' directly.

export type {
  KnowledgeSystemCategory,
  KnowledgeGovernancePolicy,
  KnowledgeComponentKind,
  KnowledgeComponent,
  KnowledgeSystem,
  KnowledgeInventory,
  KnowledgeSystemDefinition,
  DiscoveryCandidate,
} from "./knowledge-systems/types";

export {
  KNOWLEDGE_DISCOVERY_EXCLUDED_FILE_PATTERNS,
  KNOWLEDGE_SYSTEM_DEFINITIONS,
} from "./knowledge-systems/definitions";

export {
  uniqueSorted,
  normalizeProviderSignal,
  normalizeVectorStoreSignal,
  collectKeywordMatches,
  hasMeaningfulDiscoverySignal,
  isExcludedKnowledgeDirectory,
  hasAllowedKnowledgeExtension,
  isExcludedKnowledgeFile,
  collectPackageScriptSignals,
  detectKnowledgeCandidate,
  walkKnowledgeRoot,
  collectKnowledgeDiscoveryCandidates,
  isGovernedLocalKnowledgeDoc,
  collectInvalidLocalKnowledgeDocs,
} from "./knowledge-systems/utils";

export { collectKnowledgeInventory } from "./knowledge-systems/inventory";

