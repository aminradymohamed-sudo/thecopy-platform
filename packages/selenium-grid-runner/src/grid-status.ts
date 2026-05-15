/**
 * أداة فحص سريعة لحالة شبكة سيلينيوم
 * تتصل بالـ Hub، تطبع جاهزيتها، وعدد العقد، والفتحات المتاحة
 */

import { setTimeout as delay } from "node:timers/promises";

const HUB = process.env.SELENIUM_HUB_URL ?? "http://localhost:4444";

interface GridSlot {
  id: { hostId: string; id: string };
  stereotype: { browserName?: string; "se:vncEnabled"?: boolean };
  session?: unknown;
}

interface GridNode {
  id: string;
  uri: string;
  osInfo: { arch: string; name: string; version: string };
  availability: string;
  slots: GridSlot[];
}

interface GridStatusResponse {
  value: {
    ready: boolean;
    message: string;
    nodes: GridNode[];
  };
}

async function fetchStatus(): Promise<GridStatusResponse> {
  const res = await fetch(`${HUB}/status`);
  if (!res.ok) {
    throw new Error(`HTTP ${res.status} ${res.statusText}`);
  }
  return (await res.json()) as GridStatusResponse;
}

async function main(): Promise<void> {
  let lastErr: unknown = null;
  for (let attempt = 1; attempt <= 30; attempt++) {
    try {
      const status = await fetchStatus();
      const v = status.value;
      console.log(`Hub      : ${HUB}`);
      console.log(`Ready    : ${v.ready}`);
      console.log(`Message  : ${v.message}`);
      console.log(`Nodes    : ${v.nodes.length}`);
      for (const node of v.nodes) {
        const browsers = new Set<string>();
        for (const slot of node.slots) {
          const b = slot.stereotype.browserName ?? "unknown";
          browsers.add(b);
        }
        console.log(
          `  - ${node.uri} | ${node.osInfo.name} ${node.osInfo.arch} | slots=${node.slots.length} | browsers=${[...browsers].join(",")} | ${node.availability}`
        );
      }
      if (v.ready) {
        process.exit(0);
      }
      lastErr = new Error(v.message);
    } catch (err) {
      lastErr = err;
    }
    await delay(2000);
  }
  console.error(`Grid not ready after retries. Last error: ${String(lastErr)}`);
  process.exit(1);
}

main().catch((err: unknown) => {
  console.error(err);
  process.exit(1);
});
