/**
 * مكوّن الترويسة
 */

import { By, type Locator, type WebDriver, type WebElement } from "selenium-webdriver";
import { logger, type ScopedLogger } from "../utils/Logger.js";

export class Header {
  private readonly driver: WebDriver;
  private readonly log: ScopedLogger;
  private readonly root: Locator = By.css("header, [role='banner'], nav[aria-label='primary']");

  constructor(driver: WebDriver) {
    this.driver = driver;
    this.log = logger("Header");
  }

  async exists(): Promise<boolean> {
    try {
      await this.driver.findElement(this.root);
      return true;
    } catch {
      return false;
    }
  }

  async findLink(textOrHrefHint: string): Promise<WebElement | null> {
    try {
      const xpath = `//header//a[contains(@href, '${textOrHrefHint}') or contains(normalize-space(.), '${textOrHrefHint}')]`;
      return await this.driver.findElement(By.xpath(xpath));
    } catch {
      this.log.debug({ hint: textOrHrefHint }, "Header link not found");
      return null;
    }
  }
}
