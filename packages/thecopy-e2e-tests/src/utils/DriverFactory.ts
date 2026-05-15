/**
 * مصنع WebDriver
 * يبني جلسة بعيدة على Hub للمتصفح المطلوب
 * يطبّق timeouts، حجم النافذة، وبيانات وصفية se:name
 */

import { Builder, Browser, type WebDriver } from "selenium-webdriver";
import { Options as ChromeOptions } from "selenium-webdriver/chrome.js";
import { Options as FirefoxOptions } from "selenium-webdriver/firefox.js";
import { Options as EdgeOptions } from "selenium-webdriver/edge.js";

import {
  browserProfiles,
  getEnvironment,
  getGrid,
  type EnvironmentConfig,
  type GridConfig,
} from "../../config/index.js";
import type { BrowserId } from "../../config/types.js";
import { logger } from "./Logger.js";

const log = logger("DriverFactory");

export interface DriverHandle {
  driver: WebDriver;
  browser: BrowserId;
  sessionId: string;
  vncUrl: string;
}

export interface BuildOptions {
  testName: string;
  videoEnabled?: boolean;
}

export class DriverFactory {
  private readonly env: EnvironmentConfig;
  private readonly grid: GridConfig;

  constructor() {
    this.env = getEnvironment();
    this.grid = getGrid();
  }

  async build(browser: BrowserId, options: BuildOptions): Promise<DriverHandle> {
    const profile = browserProfiles[browser];
    const sessionLabel = `${options.testName} | ${profile.label}`;
    log.info({ browser, hub: this.grid.hubUrl }, "Building driver");

    let builder = new Builder().usingServer(this.grid.hubUrl);

    if (browser === "chromium") {
      const opts = new ChromeOptions();
      opts.addArguments(...profile.extraArguments);
      opts.set("acceptInsecureCerts", profile.acceptInsecureCerts);
      opts.set("se:name", sessionLabel);
      opts.set("se:recordVideo", options.videoEnabled ?? this.grid.videoEnabled);
      opts.setLoggingPrefs({ browser: "ALL" });
      builder = builder.forBrowser(Browser.CHROME).setChromeOptions(opts);
    } else if (browser === "firefox") {
      const opts = new FirefoxOptions();
      opts.addArguments(...profile.extraArguments);
      opts.set("acceptInsecureCerts", profile.acceptInsecureCerts);
      opts.set("se:name", sessionLabel);
      opts.set("se:recordVideo", options.videoEnabled ?? this.grid.videoEnabled);
      builder = builder.forBrowser(Browser.FIREFOX).setFirefoxOptions(opts);
    } else {
      const opts = new EdgeOptions();
      opts.addArguments(...profile.extraArguments);
      opts.set("acceptInsecureCerts", profile.acceptInsecureCerts);
      opts.set("se:name", sessionLabel);
      opts.set("se:recordVideo", options.videoEnabled ?? this.grid.videoEnabled);
      builder = builder.forBrowser(Browser.EDGE).setEdgeOptions(opts);
    }

    const driver = await builder.build();
    await driver.manage().setTimeouts({
      implicit: 0,
      pageLoad: this.env.timeouts.pageLoadMs,
      script: this.env.timeouts.apiRequestMs,
    });
    await driver.manage().window().setRect({
      width: profile.windowWidth,
      height: profile.windowHeight,
      x: 0,
      y: 0,
    });

    const sessionId = (await driver.getSession()).getId();
    log.info({ browser, sessionId }, "Driver session ready");

    return {
      driver,
      browser,
      sessionId,
      vncUrl: this.grid.vncUrls[browser],
    };
  }

  async destroy(handle: DriverHandle | null): Promise<void> {
    if (!handle) return;
    try {
      await handle.driver.quit();
      log.info({ sessionId: handle.sessionId }, "Driver quit");
    } catch (err) {
      log.warn({ err: serializeErr(err) }, "Driver quit failed");
    }
  }
}

function serializeErr(err: unknown): { name: string; message: string } {
  if (err instanceof Error) return { name: err.name, message: err.message };
  return { name: "Unknown", message: String(err) };
}
