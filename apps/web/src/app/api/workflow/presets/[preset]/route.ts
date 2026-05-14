import { NextRequest, NextResponse } from "next/server";

import {
  buildProxyErrorResponse,
  getBackendBaseUrl,
  proxyToBackend,
} from "@/lib/server/backend-proxy";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

interface WorkflowPresetRouteContext {
  params: Promise<{ preset: string }>;
}

export async function GET(
  request: NextRequest,
  { params }: WorkflowPresetRouteContext
) {
  try {
    const { preset } = await params;
    return await proxyToBackend(request, `/api/workflow/presets/${preset}`);
  } catch (error) {
    return buildProxyErrorResponse(error, "تعذر جلب تفاصيل قالب الورك فلو");
  }
}

export async function HEAD(
  _request: NextRequest,
  { params }: WorkflowPresetRouteContext
) {
  const { preset } = await params;

  return NextResponse.json({
    service: "Workflow Preset Detail",
    preset,
    status: "proxied to backend",
    backend: getBackendBaseUrl(),
  });
}
