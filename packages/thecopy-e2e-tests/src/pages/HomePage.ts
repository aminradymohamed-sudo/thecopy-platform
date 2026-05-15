/**
 * الصفحة الرئيسية للتطبيق
 * (apps/web/src/app/(main) | الجذر بعد المصادقة)
 */

import { By, type Locator, type WebDriver } from "selenium-webdriver";
import { BasePage } from "./BasePage.js";

export class HomePage extends BasePage {
  readonly path = "/";
  readonly readinessLocator: Locator = By.css("body");

  constructor(driver: WebDriver) {
    super(driver, "HomePage");
  }

  async hasNavigationLandmark(): Promise<boolean> {
    const nav = await this.findOptional(By.css("nav, [role='navigation'], header"));
    return nav !== null;
  }

  async hasMainLandmark(): Promise<boolean> {
    const main = await this.findOptional(By.css("main, [role='main'], #__next, body > div"));
    return main !== null;
  }
}
