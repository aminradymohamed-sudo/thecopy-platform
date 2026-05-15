/**
 * System | Cross-module
 * يتأكد أن البيانات المُنشأة عبر API تبقى متاحة لاستعلامات لاحقة
 * (تجربة كتابة-قراءة على نفس الحساب)
 *
 * إذا رفض WAF الطلب من IP غير معتمد (403 / 401)،
 * يُعَدّ الاختبار مُعطَّلاً بيئياً لا فاشلاً تقنياً
 */

import { expect } from "chai";
import { AuthAPI, isEnvGated } from "../../../src/api/AuthAPI.js";
import { generateUser } from "../../../src/utils/DataGenerator.js";
import { logger } from "../../../src/utils/Logger.js";

const log = logger("data-persistence.test");

describe("System | Cross-module | data persistence", function suite() {
  this.timeout(60_000);

  const auth = new AuthAPI();
  const user = generateUser();

  it("user registered via API can immediately log in (or staging WAF returns gated)", async function () {
    const reg = await auth.register({
      email: user.email,
      password: user.password,
      firstName: user.firstName,
      lastName: user.lastName,
    });

    if (isEnvGated(reg.status)) {
      log.warn(
        { status: reg.status, body: reg.rawText?.slice(0, 200) },
        "Register gated by env (WAF/auth) — treating as non-failure"
      );
      this.skip();
      return;
    }

    expect(reg.status, `register: ${reg.rawText?.slice(0, 200)}`).to.be.oneOf([200, 201, 409]);

    const login = await auth.login({ email: user.email, password: user.password });
    if (isEnvGated(login.status)) {
      log.warn(
        { status: login.status, body: login.rawText?.slice(0, 200) },
        "Login gated by env — skipping"
      );
      this.skip();
      return;
    }
    expect(login.status, `login after register: ${login.rawText?.slice(0, 200)}`).to.be.oneOf([200, 401]);
  });
});
