/**
 * عميل لفحص صحة الخدمة الخلفية
 */

import { ApiHelper, type ApiResponse } from "../utils/ApiHelper.js";
import { getEnvironment } from "../../config/index.js";

export type HealthStatus = "healthy" | "degraded" | "unhealthy";

export interface HealthCheckEntry {
  status: HealthStatus;
  required?: boolean;
  responseTime?: number;
  message?: string;
  details?: Record<string, unknown>;
}

export interface HealthResponse {
  status: HealthStatus;
  timestamp: string;
  version: string;
  uptime: number;
  checks: Record<string, HealthCheckEntry>;
}

export interface LivenessResponse {
  status: "alive" | "dead";
  timestamp: string;
  uptime: number;
}

export class HealthCheckAPI {
  private readonly api: ApiHelper;

  constructor() {
    this.api = new ApiHelper();
  }

  async getHealth(): Promise<ApiResponse<HealthResponse>> {
    const env = getEnvironment();
    return this.api.request<HealthResponse>(env.backend.healthEndpoint);
  }

  async getLiveness(): Promise<ApiResponse<LivenessResponse>> {
    const env = getEnvironment();
    return this.api.request<LivenessResponse>(env.backend.livenessEndpoint);
  }
}
