/**
 * A small domain DSL over Page Objects.
 * Test bodies can speak in user/business actions instead of locators.
 */

import { By, type WebDriver } from "selenium-webdriver";

import { AuthAPI, isEnvGated, type AuthSuccess } from "../api/AuthAPI.js";
import { BasePage, HomePage, LoginPage, RegisterPage, StudioPage } from "../pages/index.js";
import type { PlatformStudio } from "../pages/index.js";
import type { SyntheticUser } from "../utils/DataGenerator.js";

export interface RegistrationOutcome {
  status: number;
  envGated: boolean;
  rawText: string | null;
}

export interface LoginOutcome {
  status: number;
  envGated: boolean;
  accessToken: string | null;
  rawText: string | null;
}

export class TheCopyExperience {
  private readonly driver: WebDriver;
  private readonly auth: AuthAPI;

  constructor(driver: WebDriver) {
    this.driver = driver;
    this.auth = new AuthAPI();
  }

  async openHome(): Promise<HomePage> {
    const home = new HomePage(this.driver);
    await home.navigate();
    return home;
  }

  async openLogin(): Promise<LoginPage> {
    const login = new LoginPage(this.driver);
    await login.navigate();
    return login;
  }

  async openRegister(): Promise<RegisterPage> {
    const register = new RegisterPage(this.driver);
    await register.navigate();
    return register;
  }

  async openStudio(studio: PlatformStudio): Promise<StudioPage> {
    const page = new StudioPage(this.driver, studio.slug);
    await page.navigate();
    return page;
  }

  async registerUser(user: SyntheticUser): Promise<RegistrationOutcome> {
    const response = await this.auth.register({
      email: user.email,
      password: user.password,
      firstName: user.firstName,
      lastName: user.lastName,
    });
    return {
      status: response.status,
      envGated: isEnvGated(response.status),
      rawText: response.rawText,
    };
  }

  async loginThroughUi(user: SyntheticUser): Promise<HomePage> {
    const login = await this.openLogin();
    await login.fillEmail(user.email);
    await login.fillPassword(user.password);
    await login.submit();
    const home = new HomePage(this.driver);
    await home.waitUntilReady();
    return home;
  }

  async loginThroughApi(user: SyntheticUser): Promise<LoginOutcome> {
    const response = await this.auth.login({
      email: user.email,
      password: user.password,
    });
    const body = response.body as AuthSuccess | null;
    return {
      status: response.status,
      envGated: isEnvGated(response.status),
      accessToken: body?.accessToken ?? null,
      rawText: response.rawText,
    };
  }

  async logoutViaApi(accessToken: string | null): Promise<number | null> {
    if (!accessToken) return null;
    const response = await this.auth.logout(accessToken);
    return response.status;
  }

  async pageExposesUserNavigation(): Promise<boolean> {
    const link = await this.driver.findElements(
      By.css(
        "nav a[href], nav button, header a[href], header button, [role='navigation'] a[href], [role='navigation'] button, a[href]"
      )
    );
    return link.length > 0;
  }

  static testId(value: string) {
    return BasePage.byTestId(value);
  }
}
