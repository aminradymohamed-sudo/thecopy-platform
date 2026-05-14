import { openPersistentMemoryRuntime } from "./lib/persistent-memory/runtime";

async function main(): Promise<void> {
  const runtime = await openPersistentMemoryRuntime();
  try {
    console.log(
      JSON.stringify(
        {
          status: runtime.status,
          reason: runtime.reason,
          jobTypes: ["embedding"],
          durablePayloadPolicy: "ids-only",
          queueSourceOfTruth: false,
        },
        null,
        2,
      ),
    );
  } finally {
    await runtime.close();
  }
}

main().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : String(error));
  process.exit(1);
});
