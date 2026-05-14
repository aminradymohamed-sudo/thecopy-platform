import os from "node:os";
import path from "node:path";
import { mkdir, mkdtemp, rm, writeFile } from "node:fs/promises";

import { afterEach, describe, expect, test } from "vitest";

import {
  KNOWLEDGE_LOCAL_DOC_DISCLAIMER,
  KNOWLEDGE_LOCAL_DOC_REFERENCE_INTRO,
  KNOWLEDGE_LOCAL_DOC_REQUIRED_REFERENCES,
} from "./constants";
import { collectKnowledgeInventory } from "./knowledge-systems";

const ORIGINAL_CWD = process.cwd();
let currentTempRepo: string | null = null;

async function writeRepoFile(
  root: string,
  repoRelativePath: string,
  content: string,
): Promise<void> {
  const absolutePath = path.join(root, ...repoRelativePath.split("/"));
  await mkdir(path.dirname(absolutePath), { recursive: true });
  await writeFile(absolutePath, content, "utf8");
}

function buildGovernedLocalDoc(title: string): string {
  return `# ${title}

${KNOWLEDGE_LOCAL_DOC_DISCLAIMER}

${KNOWLEDGE_LOCAL_DOC_REFERENCE_INTRO}

\`\`\`text
${KNOWLEDGE_LOCAL_DOC_REQUIRED_REFERENCES.join("\n")}
\`\`\`
`;
}

async function createBaseKnowledgeRepo(validDocs: boolean): Promise<string> {
  const tempRepo = await mkdtemp(
    path.join(os.tmpdir(), "knowledge-inventory-"),
  );

  await writeRepoFile(
    tempRepo,
    ".repo-agent/RAG-OPERATING-CONTRACT.md",
    "# contract\n",
  );
  await writeRepoFile(
    tempRepo,
    "scripts/generate-workspace-embeddings.js",
    "const model = 'nvidia/llama-nemotron-embed-vl-1b-v2:free';\n" +
      "const provider = 'OpenRouter';\n" +
      "const apiKey = process.env.OPENROUTER_API_KEY;\n",
  );
  await writeRepoFile(
    tempRepo,
    "apps/web/package.json",
    JSON.stringify(
      {
        name: "@the-copy/web",
        scripts: {
          "editor:rag:index": "pnpm --dir ../backend run editor-rag:index",
          "editor:rag:ask": "pnpm --dir ../backend run editor-rag:ask --",
          "editor:rag:stats": "pnpm --dir ../backend run editor-rag:stats",
          "editor:rag:smoke": "pnpm --dir ../backend run editor-rag:smoke",
        },
      },
      null,
      2,
    ),
  );
  await writeRepoFile(
    tempRepo,
    "apps/backend/package.json",
    JSON.stringify(
      {
        name: "@the-copy/backend",
        scripts: {
          "editor-rag:index": "tsx src/modules/editor-rag/cli.ts index",
          "editor-rag:ask": "tsx src/modules/editor-rag/cli.ts ask",
          "editor-rag:stats": "tsx src/modules/editor-rag/cli.ts stats",
          "editor-rag:smoke": "tsx src/modules/editor-rag/cli.ts smoke",
        },
      },
      null,
      2,
    ),
  );
  await writeRepoFile(
    tempRepo,
    "apps/backend/src/modules/editor-rag/service.ts",
    "export const embedding = 'gemini-embedding-2';\n" +
      "export const generation = 'gemini-2.5-flash';\n" +
      "export const store = 'Weaviate:CodeChunks';\n" +
      "export const key = process.env.GEMINI_API_KEY || process.env.GOOGLE_GENAI_API_KEY;\n",
  );
  await writeRepoFile(
    tempRepo,
    "apps/backend/src/modules/editor-rag/routes.ts",
    "export const route = '/api/editor-rag/search';\n",
  );
  await writeRepoFile(
    tempRepo,
    "apps/backend/src/modules/editor-rag/cli.ts",
    "export const cli = 'editor-rag:index';\n",
  );
  await writeRepoFile(
    tempRepo,
    "apps/backend/src/memory/embeddings/generator.ts",
    "export const model = 'gemini-embedding-2';\n",
  );
  await writeRepoFile(
    tempRepo,
    "apps/backend/src/memory/indexer/weaviate-indexing.service.ts",
    "export const indexer = 'CodeChunks';\n",
  );
  await writeRepoFile(
    tempRepo,
    "apps/backend/src/memory/retrieval/context-builder.ts",
    "export const collection = 'CodeChunks';\n",
  );
  await writeRepoFile(
    tempRepo,
    "apps/backend/src/memory/retrieval/weaviate-retrieval.service.ts",
    "export const vector = 'Weaviate';\n",
  );
  await writeRepoFile(
    tempRepo,
    "apps/backend/src/memory/vector-store/client.ts",
    "export const client = 'weaviate';\n",
  );
  await writeRepoFile(
    tempRepo,
    "apps/web/src/app/(main)/editor/src/rag/README.md",
    validDocs
      ? buildGovernedLocalDoc("README")
      : "# README\nوثيقة محلية بلا ترويسة حاكمة.\n",
  );
  await writeRepoFile(
    tempRepo,
    "apps/web/src/app/(main)/editor/src/rag/rag-system.md",
    validDocs
      ? buildGovernedLocalDoc("RAG System")
      : "# RAG System\nوثيقة محلية بلا ترويسة حاكمة.\n",
  );

  return tempRepo;
}

afterEach(async () => {
  process.chdir(ORIGINAL_CWD);
  if (currentTempRepo) {
    await rm(currentTempRepo, { recursive: true, force: true });
    currentTempRepo = null;
  }
});

describe.sequential("collectKnowledgeInventory", () => {
  test("discovers governed systems and flags ungoverned knowledge candidates", async () => {
    currentTempRepo = await createBaseKnowledgeRepo(true);
    await writeRepoFile(
      currentTempRepo,
      "apps/unknown/src/rag/rogue-retrieval.ts",
      "export const rogue = 'qdrant retrieval';\n",
    );

    process.chdir(currentTempRepo);
    const inventory = await collectKnowledgeInventory();

    expect(inventory.systems.map((system) => system.id)).toContain(
      "workspace-embeddings",
    );
    expect(inventory.systems.map((system) => system.id)).toContain(
      "editor-code-rag",
    );
    expect(
      inventory.systems.find((system) => system.id === "workspace-embeddings")
        ?.embeddingsProviders,
    ).toEqual(["openrouter"]);
    expect(
      inventory.systems.find((system) => system.id === "editor-code-rag")
        ?.vectorStores,
    ).toEqual(["weaviate"]);
    expect(inventory.ungovernedFiles).toContain(
      "apps/unknown/src/rag/rogue-retrieval.ts",
    );
    expect(
      inventory.discoveryWarnings.some((warning) =>
        warning.includes("rogue-retrieval.ts"),
      ),
    ).toBe(true);
  });

  test("fails local knowledge docs without the governance header", async () => {
    currentTempRepo = await createBaseKnowledgeRepo(false);

    process.chdir(currentTempRepo);
    const inventory = await collectKnowledgeInventory();

    expect(inventory.ungovernedFiles).toContain(
      "apps/web/src/app/(main)/editor/src/rag/README.md",
    );
    expect(inventory.ungovernedFiles).toContain(
      "apps/web/src/app/(main)/editor/src/rag/rag-system.md",
    );
    expect(
      inventory.discoveryWarnings.some((warning) =>
        warning.includes("README.md"),
      ),
    ).toBe(true);
    expect(
      inventory.discoveryWarnings.some((warning) =>
        warning.includes("rag-system.md"),
      ),
    ).toBe(true);
  });

  test("accepts local knowledge docs with the governance header", async () => {
    currentTempRepo = await createBaseKnowledgeRepo(true);

    process.chdir(currentTempRepo);
    const inventory = await collectKnowledgeInventory();

    expect(inventory.ungovernedFiles).not.toContain(
      "apps/web/src/app/(main)/editor/src/rag/README.md",
    );
    expect(inventory.ungovernedFiles).not.toContain(
      "apps/web/src/app/(main)/editor/src/rag/rag-system.md",
    );
    expect(
      inventory.discoveryWarnings.some((warning) =>
        warning.includes("README.md"),
      ),
    ).toBe(false);
    expect(
      inventory.discoveryWarnings.some((warning) =>
        warning.includes("rag-system.md"),
      ),
    ).toBe(false);
  });

  test("governs drama analyst standard agent pattern retrieval utility", async () => {
    currentTempRepo = await createBaseKnowledgeRepo(true);
    await writeRepoFile(
      currentTempRepo,
      "apps/web/src/lib/drama-analyst/agents/shared/standardAgentPattern.rag.ts",
      "export const performRAG = 'lightweight retrieval';\n",
    );

    process.chdir(currentTempRepo);
    const inventory = await collectKnowledgeInventory();

    expect(inventory.ungovernedFiles).not.toContain(
      "apps/web/src/lib/drama-analyst/agents/shared/standardAgentPattern.rag.ts",
    );
    expect(
      inventory.systems.find((system) => system.id === "web-legacy-rag")
        ?.criticalFiles,
    ).toContain(
      "apps/web/src/lib/drama-analyst/agents/shared/standardAgentPattern.rag.ts",
    );
  });

  test("does not treat chunked lint scripts as retrieval systems", async () => {
    currentTempRepo = await createBaseKnowledgeRepo(true);
    await writeRepoFile(
      currentTempRepo,
      "apps/backend/package.json",
      JSON.stringify(
        {
          name: "@the-copy/backend",
          scripts: {
            lint: "node scripts/lint-chunked.mjs --max-warnings=1000",
            "lint:strict": "node scripts/lint-chunked.mjs --max-warnings=0",
          },
        },
        null,
        2,
      ),
    );
    await writeRepoFile(
      currentTempRepo,
      "apps/backend/scripts/lint-chunked.mjs",
      "console.log('lint chunks');\n",
    );

    process.chdir(currentTempRepo);
    const inventory = await collectKnowledgeInventory();

    expect(inventory.ungovernedFiles).not.toContain(
      "apps/backend/package.json",
    );
    expect(inventory.ungovernedFiles).not.toContain(
      "apps/backend/scripts/lint-chunked.mjs",
    );
  });

  test("does not treat chunked vitest runner scripts as retrieval systems", async () => {
    currentTempRepo = await createBaseKnowledgeRepo(true);
    await writeRepoFile(
      currentTempRepo,
      "apps/web/package.json",
      JSON.stringify(
        {
          name: "@the-copy/web",
          scripts: {
            test: "node scripts/run-vitest-chunks.mjs",
          },
        },
        null,
        2,
      ),
    );
    await writeRepoFile(
      currentTempRepo,
      "apps/web/scripts/run-vitest-chunks.mjs",
      "console.log('vitest chunks');\n",
    );

    process.chdir(currentTempRepo);
    const inventory = await collectKnowledgeInventory();

    expect(inventory.ungovernedFiles).not.toContain("apps/web/package.json");
    expect(inventory.ungovernedFiles).not.toContain(
      "apps/web/scripts/run-vitest-chunks.mjs",
    );
  });
});
