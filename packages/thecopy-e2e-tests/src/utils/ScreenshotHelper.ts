/**
 * أداة لقطات الشاشة عند الفشل
 * تخزّن الصور تحت screenshots/<runStamp>/<browser>/<test>.png
 */

import { mkdir, writeFile } from "node:fs/promises";
import { resolve } from "node:path";
import type { WebDriver } from "selenium-webdriver";

import { logger } from "./Logger.js";

const log = logger("ScreenshotHelper");

const ROOT = resolve(process.cwd(), "screenshots");

export interface ScreenshotOptions {
  runStamp: string;
  browser: string;
  testTitle: string;
  reason: "failure" | "step" | "success";
}

function safeName(value: string): string {
  return value
    .replace(/[^a-zA-Z0-9-_؀-ۿ]/g, "_")
    .replace(/_+/g, "_")
    .slice(0, 80);
}

export async function captureScreenshot(
  driver: WebDriver,
  options: ScreenshotOptions
): Promise<string | null> {
  try {
    const dir = resolve(ROOT, options.runStamp, options.browser);
    await mkdir(dir, { recursive: true });
    const name = `${options.reason}__${safeName(options.testTitle)}.png`;
    const filePath = resolve(dir, name);
    const png = await driver.takeScreenshot();
    await writeFile(filePath, Buffer.from(png, "base64"));
    log.info({ filePath }, "Screenshot captured");
    return filePath;
  } catch (err) {
    log.warn(
      { err: err instanceof Error ? err.message : String(err) },
      "Screenshot failed"
    );
    return null;
  }
}
