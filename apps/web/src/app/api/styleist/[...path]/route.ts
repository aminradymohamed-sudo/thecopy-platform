import { NextRequest, NextResponse } from "next/server";

import {
  buildProxyErrorResponse,
  proxyToBackend,
} from "@/lib/server/backend-proxy";
import { withNoStoreResponseInit } from "@/lib/server/no-store";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function getTargetPath(path: string[]): string {
  return `/api/styleist/${path.join("/")}`;
}

function isOptionalSceneCostumeRead(
  request: NextRequest,
  path: string[]
): boolean {
  return (
    request.method === "GET" &&
    path.length === 1 &&
    path[0] === "scene-costumes"
  );
}

async function respond(
  request: NextRequest,
  path: string[]
): Promise<NextResponse> {
  try {
    return await proxyToBackend(request, getTargetPath(path));
  } catch (error) {
    if (isOptionalSceneCostumeRead(request, path)) {
      return NextResponse.json(
        {
          success: true,
          data: [],
          source: "styleist-local-fallback",
        },
        withNoStoreResponseInit()
      );
    }

    return buildProxyErrorResponse(error, "تعذر الاتصال بخدمة StyleIST");
  }
}

export async function GET(
  request: NextRequest,
  context: { params: Promise<{ path: string[] }> }
) {
  const { path } = await context.params;
  return respond(request, path);
}

export async function POST(
  request: NextRequest,
  context: { params: Promise<{ path: string[] }> }
) {
  const { path } = await context.params;
  return respond(request, path);
}

export async function PUT(
  request: NextRequest,
  context: { params: Promise<{ path: string[] }> }
) {
  const { path } = await context.params;
  return respond(request, path);
}

export async function DELETE(
  request: NextRequest,
  context: { params: Promise<{ path: string[] }> }
) {
  const { path } = await context.params;
  return respond(request, path);
}
