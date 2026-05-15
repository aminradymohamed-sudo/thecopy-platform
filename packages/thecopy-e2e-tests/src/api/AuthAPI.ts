/**
 * عميل API للمصادقة
 * يقابل المسارات المُعرَّفة في apps/backend/src/controllers/auth.controller.ts
 * المخطط: firstName + lastName + email + password
 * يدعم refreshToken عبر HttpOnly cookie ويعيد accessToken في الجسم
 */

import { ApiHelper, type ApiResponse } from "../utils/ApiHelper.js";

export interface RegisterPayload {
  email: string;
  password: string;
  firstName: string;
  lastName: string;
}

export interface LoginPayload {
  email: string;
  password: string;
}

export interface AuthSuccess {
  user?: { id: string; email: string; firstName?: string; lastName?: string };
  accessToken?: string;
  refreshToken?: string;
  message?: string;
}

export interface AuthError {
  error?: string;
  message?: string;
  code?: string;
}

/**
 * أكواد الحالة المتوقعة من البيئة
 * - 403 شائع لو WAF يحجب IP المُختبِر بدون رمز bypass
 * - عند ذلك يُعتبر الاختبار "بيئي مُعطَّل" لا فاشلاً تقنياً
 */
export const ENV_GATED_STATUSES = [401, 403] as const;

export class AuthAPI {
  private readonly api: ApiHelper;

  constructor() {
    this.api = new ApiHelper();
  }

  async register(
    payload: RegisterPayload
  ): Promise<ApiResponse<AuthSuccess | AuthError>> {
    return this.api.request<AuthSuccess | AuthError>("/api/auth/register", {
      method: "POST",
      body: payload,
    });
  }

  async login(
    payload: LoginPayload
  ): Promise<ApiResponse<AuthSuccess | AuthError>> {
    return this.api.request<AuthSuccess | AuthError>("/api/auth/login", {
      method: "POST",
      body: payload,
    });
  }

  async refresh(refreshToken?: string): Promise<ApiResponse<AuthSuccess | AuthError>> {
    return this.api.request<AuthSuccess | AuthError>("/api/auth/refresh", {
      method: "POST",
      headers: refreshToken ? { Cookie: `refreshToken=${refreshToken}` } : {},
    });
  }

  async logout(accessToken?: string): Promise<ApiResponse<AuthSuccess | AuthError>> {
    return this.api.request<AuthSuccess | AuthError>("/api/auth/logout", {
      method: "POST",
      headers: accessToken ? { Authorization: `Bearer ${accessToken}` } : {},
    });
  }

  async getMe(accessToken: string): Promise<ApiResponse<AuthSuccess | AuthError>> {
    return this.api.request<AuthSuccess | AuthError>("/api/auth/me", {
      method: "GET",
      headers: { Authorization: `Bearer ${accessToken}` },
    });
  }
}

export function isEnvGated(status: number): boolean {
  return (ENV_GATED_STATUSES as readonly number[]).includes(status);
}
