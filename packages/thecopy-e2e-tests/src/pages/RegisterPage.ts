/**
 * صفحة إنشاء حساب جديد
 * (apps/web/src/app/(auth)/register)
 */

import { By, type Locator, type WebDriver } from "selenium-webdriver";
import { BasePage } from "./BasePage.js";

export class RegisterPage extends BasePage {
  readonly path = "/register";
  readonly readinessLocator: Locator = By.css("input[type='email'], input[name='email'], form");

  constructor(driver: WebDriver) {
    super(driver, "RegisterPage");
  }

  async fillEmail(value: string): Promise<void> {
    const el = await this.waitForVisible(By.css("input[type='email'], input[name='email']"));
    await el.clear();
    await el.sendKeys(value);
  }

  async fillPassword(value: string): Promise<void> {
    const el = await this.waitForVisible(By.css("input[type='password'], input[name='password']"));
    await el.clear();
    await el.sendKeys(value);
  }

  async fillDisplayName(value: string): Promise<void> {
    const el = await this.findOptional(
      By.css(
        "input[name='displayName'], input[name='name'], input[id*='display'], input[placeholder*='الاسم']"
      )
    );
    if (el) {
      await el.clear();
      await el.sendKeys(value);
    }
  }

  async submit(): Promise<void> {
    const submitBtn = await this.findOptional(By.css("button[type='submit']"));
    if (submitBtn) {
      await submitBtn.click();
      return;
    }
    const fallback = await this.waitForVisible(BasePage.byText("إنشاء حساب"));
    await fallback.click();
  }
}
