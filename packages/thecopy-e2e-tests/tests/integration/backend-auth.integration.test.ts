/**
 * Integration: auth API endpoints work together as one module boundary.
 */

import { expect } from "chai";

import { AuthAPI, isEnvGated } from "../../src/api/AuthAPI.js";
import { generateUser } from "../../src/utils/DataGenerator.js";
import { logger } from "../../src/utils/Logger.js";

const log = logger("backend-auth.integration.test");

describe("Integration | Backend auth contract", function suite() {
  this.timeout(90_000);

  const auth = new AuthAPI();
  const user = generateUser();
  let accessToken: string | null = null;

  after(async function teardown() {
    if (accessToken) await auth.logout(accessToken).catch(() => undefined);
  });

  it("register, login, me, and logout compose into a single auth flow", async function () {
    const registration = await auth.register({
      email: user.email,
      password: user.password,
      firstName: user.firstName,
      lastName: user.lastName,
    });

    if (isEnvGated(registration.status)) {
      log.warn({ status: registration.status }, "Registration env-gated");
      this.skip();
      return;
    }
    expect(registration.status, `register: ${registration.rawText?.slice(0, 200)}`).to.be.oneOf([
      200,
      201,
      409,
    ]);

    const login = await auth.login({ email: user.email, password: user.password });
    if (isEnvGated(login.status)) {
      log.warn({ status: login.status }, "Login env-gated");
      this.skip();
      return;
    }
    expect(login.status, `login: ${login.rawText?.slice(0, 200)}`).to.equal(200);
    const token =
      login.body && typeof login.body === "object" && "accessToken" in login.body
        ? (login.body as { accessToken?: string }).accessToken
        : undefined;
    expect(token, "access token").to.be.a("string").and.have.length.greaterThan(10);
    accessToken = token ?? null;

    const me = await auth.getMe(accessToken!);
    if (isEnvGated(me.status)) {
      this.skip();
      return;
    }
    expect(me.status, `me: ${me.rawText?.slice(0, 200)}`).to.be.oneOf([200, 404]);

    const logout = await auth.logout(accessToken!);
    expect(logout.status, `logout: ${logout.rawText?.slice(0, 200)}`).to.be.oneOf([
      200,
      204,
      401,
    ]);
    accessToken = null;
  });
});
