/**
 * أداة فحص حالة الشبكة
 * تنتظر حتى تصبح Ready ثم تطبع تقريراً موجزاً
 */

import { setTimeout as delay } from "node:timers/promises";
import { getGrid } from "../../config/index.js";

interface GridSlot {
  stereotype: { browserName?: string };
}
interface GridNode {
  uri: string;
  osInfo: { name: string; arch: string };
  availability: string;
  slots: GridSlot[];
}
interface GridStatusResponse {
  value: { ready: boolean; message: string; nodes: GridNode[] };
}

async function fetchStatus(hub: string): Promise<GridStatusResponse> {
  const res = await fetch(`${hub}/status`);
  if (!res.ok) throw new Error(`HTTP ${res.status} ${res.statusText}`);
  return (await res.json()) as GridStatusResponse;
}

async function main(): Promise<void> {
  const hub = getGrid().hubUrl;
  let lastErr: unknown = null;
  for (let attempt = 1; attempt <= 30; attempt++) {
    try {
      const status = await fetchStatus(hub);
      const v = status.value;
      console.log(`Hub      : ${hub}`);
      console.log(`Ready    : ${v.ready}`);
      console.log(`Message  : ${v.message}`);
      console.log(`Nodes    : ${v.nodes.length}`);
      for (const node of v.nodes) {
        const browsers = new Set<string>();
        for (const s of node.slots) {
          browsers.add(s.stereotype.browserName ?? "unknown");
        }
        console.log(
          `  - ${node.uri} | ${node.osInfo.name} ${node.osInfo.arch} | slots=${node.slots.length} | browsers=${[...browsers].join(",")} | ${node.availability}`
        );
      }
      if (v.ready) process.exit(0);
      lastErr = new Error(v.message);
    } catch (err) {
      lastErr = err;
    }
    await delay(2000);
  }
  console.error(`Grid not ready. Last error: ${String(lastErr)}`);
  process.exit(1);
}

main().catch((err: unknown) => {
  console.error(err);
  process.exit(1);
});
