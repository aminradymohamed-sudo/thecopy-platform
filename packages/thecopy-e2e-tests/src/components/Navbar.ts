/**
 * مكوّن شريط التنقّل الجانبي أو الرئيسي
 */

import { By, type Locator, type WebDriver } from "selenium-webdriver";

export class Navbar {
  private readonly driver: WebDriver;
  private readonly root: Locator = By.css(
    "nav, [role='navigation'], [data-testid='navbar'], [data-testid='sidebar']"
  );

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

  async countLinks(): Promise<number> {
    const links = await this.driver.findElements(By.css("nav a, [role='navigation'] a"));
    return links.length;
  }
}
