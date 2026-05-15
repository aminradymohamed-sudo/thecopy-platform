/**
 * مشغّل اختبار دخان متوازٍ متعدد المتصفحات
 * يفتح https://www.thecopy.app/ على Chromium و Firefox و Edge في نفس اللحظة
 * يلتقط صورة لكل جلسة، يقيس زمن التحميل، ويصدر تقرير JSON موحّد
 */

import { Builder, Browser, type WebDriver } from "selenium-webdriver";
import { Options as ChromeOptions } from "selenium-webdriver/chrome.js";
import { Options as FirefoxOptions } from "selenium-webdriver/firefox.js";
import { Options as EdgeOptions } from "selenium-webdriver/edge.js";
import { mkdir, writeFile } from "node:fs/promises";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { performance } from "node:perf_hooks";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const HUB_URL = process.env.SELENIUM_HUB_URL ?? "http://localhost:4444";
const TARGET_URL = process.env.TARGET_URL ?? "https://www.thecopy.app/";
const PAGE_LOAD_TIMEOUT_MS = Number(process.env.PAGE_LOAD_TIMEOUT_MS ?? 45_000);
const ARTIFACTS_ROOT = resolve(__dirname, "..", "artifacts");

type BrowserId = "chromium" | "firefox" | "edge";

interface BrowserSpec {
  id: BrowserId;
  label: string;
  browserName: string;
  buildDriver: () => Promise<WebDriver>;
}

interface BrowserResult {
  id: BrowserId;
  label: string;
  ok: boolean;
  startedAt: string;
  finishedAt: string;
  durationMs: number;
  pageLoadMs: number | null;
  finalUrl: string | null;
  title: string | null;
  documentReadyState: string | null;
  htmlBytes: number | null;
  performance: {
    navigationStart: number | null;
    domContentLoaded: number | null;
    loadEventEnd: number | null;
  } | null;
  screenshot: string | null;
  errors: string[];
  consoleErrors: string[];
  vncProbeUrl: string;
}

function chromiumSpec(): BrowserSpec {
  const opts = new ChromeOptions();
  opts.addArguments(
    "--no-sandbox",
    "--disable-dev-shm-usage",
    "--window-size=1920,1080",
    "--disable-gpu",
    "--lang=ar-EG"
  );
  opts.setLoggingPrefs({ browser: "ALL" });
  opts.set("se:name", "thecopy.app smoke | chromium");
  opts.set("se:recordVideo", true);
  return {
    id: "chromium",
    label: "Chromium",
    browserName: Browser.CHROME,
    buildDriver: () =>
      new Builder()
        .forBrowser(Browser.CHROME)
        .setChromeOptions(opts)
        .usingServer(HUB_URL)
        .build(),
  };
}

function firefoxSpec(): BrowserSpec {
  const opts = new FirefoxOptions();
  opts.addArguments("--width=1920", "--height=1080");
  opts.set("se:name", "thecopy.app smoke | firefox");
  opts.set("se:recordVideo", true);
  return {
    id: "firefox",
    label: "Firefox",
    browserName: Browser.FIREFOX,
    buildDriver: () =>
      new Builder()
        .forBrowser(Browser.FIREFOX)
        .setFirefoxOptions(opts)
        .usingServer(HUB_URL)
        .build(),
  };
}

function edgeSpec(): BrowserSpec {
  const opts = new EdgeOptions();
  opts.addArguments(
    "--no-sandbox",
    "--disable-dev-shm-usage",
    "--window-size=1920,1080",
    "--disable-gpu",
    "--lang=ar-EG"
  );
  opts.set("se:name", "thecopy.app smoke | edge");
  opts.set("se:recordVideo", true);
  return {
    id: "edge",
    label: "Edge",
    browserName: Browser.EDGE,
    buildDriver: () =>
      new Builder()
        .forBrowser(Browser.EDGE)
        .setEdgeOptions(opts)
        .usingServer(HUB_URL)
        .build(),
  };
}

async function ensureDir(path: string): Promise<void> {
  await mkdir(path, { recursive: true });
}

async function runOne(spec: BrowserSpec, runStamp: string): Promise<BrowserResult> {
  const startedAt = new Date().toISOString();
  const t0 = performance.now();
  const errors: string[] = [];
  const consoleErrors: string[] = [];
  let driver: WebDriver | null = null;
  let screenshotPath: string | null = null;
  let finalUrl: string | null = null;
  let title: string | null = null;
  let documentReadyState: string | null = null;
  let htmlBytes: number | null = null;
  let pageLoadMs: number | null = null;
  let perf: BrowserResult["performance"] = null;

  const vncMap: Record<BrowserId, string> = {
    chromium: "http://localhost:7900/?autoconnect=1&resize=remote",
    firefox: "http://localhost:7901/?autoconnect=1&resize=remote",
    edge: "http://localhost:7902/?autoconnect=1&resize=remote",
  };
  const vncProbeUrl = vncMap[spec.id];

  try {
    driver = await spec.buildDriver();
    await driver.manage().setTimeouts({
      implicit: 0,
      pageLoad: PAGE_LOAD_TIMEOUT_MS,
      script: 30_000,
    });

    const navStart = performance.now();
    await driver.get(TARGET_URL);
    pageLoadMs = Math.round(performance.now() - navStart);

    finalUrl = await driver.getCurrentUrl();
    title = await driver.getTitle();
    documentReadyState = (await driver.executeScript("return document.readyState;")) as string;
    const html = (await driver.executeScript(
      "return document.documentElement.outerHTML;"
    )) as string;
    htmlBytes = Buffer.byteLength(html, "utf8");

    const perfRaw = (await driver.executeScript(`
      const t = performance.timing || {};
      const nav = (performance.getEntriesByType('navigation')[0]) || null;
      return {
        navigationStart: t.navigationStart || (nav ? nav.startTime : null),
        domContentLoaded: t.domContentLoadedEventEnd || (nav ? nav.domContentLoadedEventEnd : null),
        loadEventEnd: t.loadEventEnd || (nav ? nav.loadEventEnd : null)
      };
    `)) as BrowserResult["performance"];
    perf = perfRaw;

    if (spec.id === "chromium") {
      try {
        const logs = await driver.manage().logs().get("browser");
        for (const entry of logs) {
          if (String(entry.level.name).toUpperCase() === "SEVERE") {
            consoleErrors.push(`${entry.level.name} ${entry.message}`);
          }
        }
      } catch {
        // logs may be unavailable on some drivers
      }
    }

    const shotsDir = resolve(ARTIFACTS_ROOT, "screenshots", runStamp);
    await ensureDir(shotsDir);
    const png = await driver.takeScreenshot();
    const filePath = resolve(shotsDir, `${spec.id}.png`);
    await writeFile(filePath, Buffer.from(png, "base64"));
    screenshotPath = filePath;
  } catch (err) {
    errors.push(err instanceof Error ? `${err.name}: ${err.message}` : String(err));
  } finally {
    if (driver) {
      try {
        await driver.quit();
      } catch (err) {
        errors.push(`quit failure: ${err instanceof Error ? err.message : String(err)}`);
      }
    }
  }

  const finishedAt = new Date().toISOString();
  return {
    id: spec.id,
    label: spec.label,
    ok: errors.length === 0,
    startedAt,
    finishedAt,
    durationMs: Math.round(performance.now() - t0),
    pageLoadMs,
    finalUrl,
    title,
    documentReadyState,
    htmlBytes,
    performance: perf,
    screenshot: screenshotPath,
    errors,
    consoleErrors,
    vncProbeUrl,
  };
}

async function main(): Promise<void> {
  const runStamp = new Date().toISOString().replace(/[:.]/g, "-");
  const reportsDir = resolve(ARTIFACTS_ROOT, "reports");
  await ensureDir(reportsDir);

  const specs: BrowserSpec[] = [chromiumSpec(), firefoxSpec(), edgeSpec()];
  console.log(`Hub        : ${HUB_URL}`);
  console.log(`Target     : ${TARGET_URL}`);
  console.log(`Run stamp  : ${runStamp}`);
  console.log(`Browsers   : ${specs.map((s) => s.label).join(", ")}`);
  console.log("Launching parallel sessions ...");

  const settled = await Promise.allSettled(specs.map((s) => runOne(s, runStamp)));
  const results: BrowserResult[] = settled.map((r, i) => {
    if (r.status === "fulfilled") return r.value;
    const spec = specs[i];
    return {
      id: spec.id,
      label: spec.label,
      ok: false,
      startedAt: new Date().toISOString(),
      finishedAt: new Date().toISOString(),
      durationMs: 0,
      pageLoadMs: null,
      finalUrl: null,
      title: null,
      documentReadyState: null,
      htmlBytes: null,
      performance: null,
      screenshot: null,
      errors: [r.reason instanceof Error ? r.reason.message : String(r.reason)],
      consoleErrors: [],
      vncProbeUrl: "",
    };
  });

  const summary = {
    runStamp,
    hubUrl: HUB_URL,
    targetUrl: TARGET_URL,
    totalBrowsers: results.length,
    passed: results.filter((r) => r.ok).length,
    failed: results.filter((r) => !r.ok).length,
    results,
  };

  const reportPath = resolve(reportsDir, `smoke-${runStamp}.json`);
  await writeFile(reportPath, JSON.stringify(summary, null, 2), "utf8");

  for (const r of results) {
    const flag = r.ok ? "PASS" : "FAIL";
    const load = r.pageLoadMs != null ? `${r.pageLoadMs}ms` : "n/a";
    console.log(
      `[${flag}] ${r.label.padEnd(10)} | load=${load.padEnd(8)} | title=${(r.title ?? "").slice(0, 60)}`
    );
    if (!r.ok) {
      for (const e of r.errors) console.log(`        err: ${e}`);
    }
    if (r.consoleErrors.length > 0) {
      console.log(`        severe console errors: ${r.consoleErrors.length}`);
    }
  }

  console.log(`Report     : ${reportPath}`);
  console.log(
    `Summary    : passed=${summary.passed}/${summary.totalBrowsers} failed=${summary.failed}`
  );

  process.exit(summary.failed === 0 ? 0 : 2);
}

main().catch((err: unknown) => {
  console.error("FATAL:", err);
  process.exit(1);
});
