/**
 * صفحة تسجيل الدخول
 * (apps/web/src/app/(auth)/login)
 */

import { By, type Locator, type WebDriver } from "selenium-webdriver";
import { BasePage } from "./BasePage.js";

export class LoginPage extends BasePage {
  readonly path = "/login";
  readonly readinessLocator: Locator = By.css("input[type='email'], input[name='email'], form");

  constructor(driver: WebDriver) {
    super(driver, "LoginPage");
  }

  async fillEmail(value: string): Promise<void> {
    const el = await this.waitForVisible(
      By.css("input[type='email'], input[name='email'], input[id*='email']")
    );
    await el.clear();
    await el.sendKeys(value);
  }

  async fillPassword(value: string): Promise<void> {
    const el = await this.waitForVisible(
      By.css("input[type='password'], input[name='password']")
    );
    await el.clear();
    await el.sendKeys(value);
  }

  async submit(): Promise<void> {
    const submitBtn = await this.findOptional(
      By.css("button[type='submit'], button[data-testid='login-submit']")
    );
    if (submitBtn) {
      await submitBtn.click();
      return;
    }
    const fallback = await this.waitForVisible(BasePage.byText("تسجيل الدخول"));
    await fallback.click();
  }

  async hasRegisterLink(): Promise<boolean> {
    const link = await this.findOptional(
      By.xpath(
        "//a[contains(@href,'register') or contains(normalize-space(.),'تسجيل') or contains(normalize-space(.),'حساب')]"
      )
    );
    return link !== null;
  }
}
