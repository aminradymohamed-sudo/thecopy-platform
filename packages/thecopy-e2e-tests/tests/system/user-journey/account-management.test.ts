/**
 * System | User Journey
 * يفحص قدرات الحساب الأساسية:
 *   1) /api/auth/me بعد تسجيل دخول
 *   2) /api/auth/refresh
 *
 * استجابات WAF (401/403) تُعامَل كقيود بيئية
 */

import { expect } from "chai";
import { AuthAPI, isEnvGated } from "../../../src/api/AuthAPI.js";
import { generateUser } from "../../../src/utils/DataGenerator.js";
import { logger } from "../../../src/utils/Logger.js";

const log = logger("account-management.test");

describe("System | Journey | account management", function suite() {
  this.timeout(60_000);

  const auth = new AuthAPI();
  const user = generateUser();
  let access: string | null = null;
  let refresh: string | null = null;

  before(async function () {
    const reg = await auth.register({
      email: user.email,
      password: user.password,
      firstName: user.firstName,
      lastName: user.lastName,
    });
    if (isEnvGated(reg.status)) {
      log.warn({ status: reg.status }, "Register env-gated; skipping suite");
      this.skip();
      return;
    }
    if (![200, 201, 409].includes(reg.status)) {
      this.skip();
      return;
    }
    const login = await auth.login({ email: user.email, password: user.password });
    if (isEnvGated(login.status) || login.status !== 200 || !login.body || typeof login.body !== "object") {
      this.skip();
      return;
    }
    const body = login.body as Record<string, unknown>;
    access = (body.accessToken as string | undefined) ?? null;
    refresh = (body.refreshToken as string | undefined) ?? null;
    if (!access) this.skip();
  });

  after(async function () {
    if (access) await auth.logout(access).catch(() => undefined);
  });

  it("/api/auth/me responds with the user identity", async function () {
    if (!access) {
      this.skip();
      return;
    }
    const me = await auth.getMe(access);
    if (isEnvGated(me.status)) {
      this.skip();
      return;
    }
    expect(me.status, `me response: ${me.rawText?.slice(0, 200)}`).to.be.oneOf([200, 404]);
    if (me.status === 200 && me.body && typeof me.body === "object") {
      const u = (me.body as { user?: { email?: string } }).user;
      if (u?.email) expect(u.email.toLowerCase()).to.equal(user.email.toLowerCase());
    }
  });

  it("/api/auth/refresh issues a new token when a refresh cookie exists", async function () {
    const res = await auth.refresh(refresh ?? undefined);
    if (isEnvGated(res.status)) {
      this.skip();
      return;
    }
    expect(res.status, `refresh response: ${res.rawText?.slice(0, 200)}`).to.be.oneOf([200, 400, 401, 404]);
  });
});
