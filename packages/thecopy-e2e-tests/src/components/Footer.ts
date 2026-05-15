/**
 * مكوّن التذييل
 */

import { By, type Locator, type WebDriver } from "selenium-webdriver";

export class Footer {
  private readonly driver: WebDriver;
  private readonly root: Locator = By.css("footer, [role='contentinfo']");

  constructor(driver: WebDriver) {
    this.driver = driver;
  }

  async exists(): Promise<boolean> {
    try {
      await this.driver.findElement(this.root);
      return true;
    } catch {
      return false;
    }
  }
}
