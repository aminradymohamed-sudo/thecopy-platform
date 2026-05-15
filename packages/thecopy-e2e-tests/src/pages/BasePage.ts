/**
 * صفحة قاعدية لكل Page Object
 * تجمع: ربط driver، انتظار العناصر، التنقّل، فحص العنوان والرابط
 */

import { By, until, type Locator, type WebDriver, type WebElement } from "selenium-webdriver";
import { getEnvironment, type EnvironmentConfig } from "../../config/index.js";
import { logger, type ScopedLogger } from "../utils/Logger.js";

export interface NavigateOptions {
  expectStatus?: "loaded" | "interactive" | "complete";
  setBypassCookie?: boolean;
}

export abstract class BasePage {
  protected readonly driver: WebDriver;
  protected readonly env: EnvironmentConfig;
  protected readonly log: ScopedLogger;
  abstract readonly path: string;
  abstract readonly readinessLocator: Locator;

  constructor(driver: WebDriver, scope: string) {
    this.driver = driver;
    this.env = getEnvironment();
    this.log = logger(scope);
  }

  get url(): string {
    return `${this.env.frontend.baseUrl.replace(/\/$/, "")}${this.path}`;
  }

  async navigate(options: NavigateOptions = {}): Promise<void> {
    const setCookie = options.setBypassCookie ?? true;
    let target = this.url;
    if (setCookie && this.env.frontend.vercelBypassSecret) {
      const sep = target.includes("?") ? "&" : "?";
      target = `${target}${sep}x-vercel-protection-bypass=${this.env.frontend.vercelBypassSecret}&x-vercel-set-bypass-cookie=true`;
    }
    this.log.info({ url: target }, "Navigate");
    await this.driver.get(target);
    await this.waitUntilReady();
  }

  async waitUntilReady(): Promise<void> {
    await this.driver.wait(until.elementLocated(this.readinessLocator), this.env.timeouts.elementWaitMs);
    const el = await this.driver.findElement(this.readinessLocator);
    await this.driver.wait(until.elementIsVisible(el), this.env.timeouts.elementWaitMs);
  }

  async getTitle(): Promise<string> {
    return this.driver.getTitle();
  }

  async getCurrentUrl(): Promise<string> {
    return this.driver.getCurrentUrl();
  }

  async findOptional(locator: Locator): Promise<WebElement | null> {
    try {
      const el = await this.driver.findElement(locator);
      return el;
    } catch {
      return null;
    }
  }

  async waitForVisible(locator: Locator, ms?: number): Promise<WebElement> {
    const timeout = ms ?? this.env.timeouts.elementWaitMs;
    const located = await this.driver.wait(until.elementLocated(locator), timeout);
    return this.driver.wait(until.elementIsVisible(located), timeout);
  }

  async safeText(locator: Locator): Promise<string> {
    const el = await this.findOptional(locator);
    if (!el) return "";
    return (await el.getText()).trim();
  }

  async pageHasArabicContent(): Promise<boolean> {
    const html = await this.driver.executeScript("return document.documentElement.innerHTML;");
    if (typeof html !== "string") return false;
    return /[؀-ۿ]/.test(html);
  }

  async readinessState(): Promise<string> {
    const state = (await this.driver.executeScript("return document.readyState;")) as string;
    return state ?? "unknown";
  }

  static byTestId(value: string): Locator {
    return By.css(`[data-testid="${value}"]`);
  }

  static byText(text: string): Locator {
    return By.xpath(`//*[contains(normalize-space(.), ${BasePage.escapeXpath(text)})]`);
  }

  static escapeXpath(value: string): string {
    if (!value.includes("'")) return `'${value}'`;
    if (!value.includes('"')) return `"${value}"`;
    const parts = value.split("'");
    return `concat('${parts.join(`', "'", '`)}')`;
  }
}
