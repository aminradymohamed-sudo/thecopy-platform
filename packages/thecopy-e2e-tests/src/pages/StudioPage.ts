/**
 * صفحة مولّدة لأي استوديو إبداعي داخل المنصة
 * تستخدم لتغطية المسارات: editor, breakdown, brain-storm-ai, art-director,
 * cinematography-studio, directors-studio, arabic-creative-writing-studio,
 * arabic-prompt-engineering-studio, actorai-arabic, analysis,
 * BREAKAPP, BUDGET, development, styleIST, ui
 */

import { By, type Locator, type WebDriver } from "selenium-webdriver";
import { setTimeout as delay } from "node:timers/promises";
import { BasePage } from "./BasePage.js";

export interface StudioContentSignal {
  htmlBytes: number;
  hasInteractive: boolean;
  hasMeaningfulContent: boolean;
  visibleTextLength: number;
  reactRoot: boolean;
}

export class StudioPage extends BasePage {
  readonly path: string;
  readonly readinessLocator: Locator = By.css("main, [role='main'], body");

  constructor(driver: WebDriver, slug: string) {
    super(driver, `StudioPage(${slug})`);
    this.path = `/${slug}`;
  }

  async hasInteractiveSurface(): Promise<boolean> {
    const surface = await this.findOptional(
      By.css(
        "textarea, [contenteditable='true'], input[type='text'], input:not([type]), input[type='search'], canvas, [role='textbox'], button, [role='button'], select, a[href]"
      )
    );
    return surface !== null;
  }

  async readContentSignal(): Promise<StudioContentSignal> {
    await delay(800); // مهلة قصيرة لإتمام الـ hydration بعد load
    const html = (await this.driver.executeScript(
      "return document.documentElement.outerHTML;"
    )) as string;
    const text = (await this.driver.executeScript(
      "return (document.body && document.body.innerText) ? document.body.innerText : '';"
    )) as string;
    const reactRoot =
      (await this.driver.executeScript(
        "return Boolean(document.querySelector('#__next, [data-reactroot], [data-nextjs-router]')) || /react|next/i.test(document.documentElement.outerHTML);"
      )) === true;
    const hasInteractive = await this.hasInteractiveSurface();
    const htmlBytes = Buffer.byteLength(html ?? "", "utf8");
    const visibleTextLength = text.trim().length;
    const hasMeaningfulContent =
      visibleTextLength > 30 || hasInteractive || htmlBytes > 5000;
    return {
      htmlBytes,
      hasInteractive,
      visibleTextLength,
      reactRoot,
      hasMeaningfulContent,
    };
  }
}
