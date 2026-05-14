import { beforeEach, describe, expect, it, vi } from "vitest";

interface MockEnv {
  GEMINI_API_KEY: string | undefined;
  GOOGLE_GENAI_API_KEY: string | undefined;
}

type MockGenAiMethod = ReturnType<
  typeof vi.fn<(apiKey: string, payload: unknown) => Promise<unknown>>
>;

const { mockEnv, mockGenerateContent, mockGenerateImages, mockEditImage } =
  vi.hoisted<{
    mockEnv: MockEnv;
    mockGenerateContent: ReturnType<
      typeof vi.fn<
        (apiKey: string, payload: unknown) => Promise<{ text: string }>
      >
    >;
    mockGenerateImages: MockGenAiMethod;
    mockEditImage: MockGenAiMethod;
  }>(() => ({
    mockEnv: {
      GEMINI_API_KEY: "valid-gemini-key",
      GOOGLE_GENAI_API_KEY: "expired-google-key",
    },
    mockGenerateContent:
      vi.fn<(apiKey: string, payload: unknown) => Promise<{ text: string }>>(),
    mockGenerateImages:
      vi.fn<(apiKey: string, payload: unknown) => Promise<unknown>>(),
    mockEditImage:
      vi.fn<(apiKey: string, payload: unknown) => Promise<unknown>>(),
  }));

vi.mock("@google/genai", () => ({
  GoogleGenAI: vi.fn(function mockGoogleGenAI({ apiKey }: { apiKey: string }) {
    return {
      models: {
        generateContent: (payload: unknown): unknown =>
          mockGenerateContent(apiKey, payload),
        generateImages: (payload: unknown): unknown =>
          mockGenerateImages(apiKey, payload),
        editImage: (payload: unknown): unknown =>
          mockEditImage(apiKey, payload),
      },
    };
  }),
}));

vi.mock("@/config/env", () => ({
  env: mockEnv,
}));

import { PlatformGenAIService } from "./platform-genai.service";

function objectContainingMatcher(value: Record<string, unknown>): unknown {
  return expect.objectContaining(value);
}

describe("PlatformGenAIService", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockEnv.GEMINI_API_KEY = "valid-gemini-key";
    mockEnv.GOOGLE_GENAI_API_KEY = "expired-google-key";
  });

  it("prefers GEMINI_API_KEY when both aliases are present", async () => {
    mockGenerateContent.mockImplementation((apiKey: string) => {
      if (apiKey !== "valid-gemini-key") {
        throw new Error("API key expired");
      }

      return Promise.resolve({ text: "OK" });
    });

    const service = new PlatformGenAIService();

    const status = await service.probeHealth({ force: true });

    expect(status).toMatchObject({
      status: "healthy",
      details: objectContainingMatcher({
        credentialsConfigured: true,
      }),
    });
    expect(mockGenerateContent).toHaveBeenCalledWith(
      "valid-gemini-key",
      expect.objectContaining({
        model: "gemini-2.5-flash",
      }),
    );
  });

  it("returns shared details when no AI credentials are configured", async () => {
    mockEnv.GEMINI_API_KEY = undefined;
    mockEnv.GOOGLE_GENAI_API_KEY = undefined;

    const service = new PlatformGenAIService();

    const status = await service.probeHealth({ force: true });

    expect(status).toMatchObject({
      status: "unhealthy",
      triState: "not-configured",
      error: "GEMINI_API_KEY or GOOGLE_GENAI_API_KEY is not configured.",
      details: {
        provider: "google-genai",
        credentialsConfigured: false,
      },
    });
    expect(mockGenerateContent).not.toHaveBeenCalled();
  });

  it("keeps the shared details payload when configured probes fail", async () => {
    mockGenerateContent.mockRejectedValue(new Error("API key expired"));

    const service = new PlatformGenAIService();

    const status = await service.probeHealth({ force: true });

    expect(status).toMatchObject({
      status: "unhealthy",
      triState: "configured-failing",
      error:
        "GOOGLE_GENAI_API_KEY is configured but expired. Renew the key before using AI-backed routes.",
      details: {
        provider: "google-genai",
        credentialsConfigured: true,
      },
    });
  });

  it("generates text through the direct provider client", async () => {
    mockGenerateContent.mockResolvedValue({ text: "رد مباشر" });

    const service = new PlatformGenAIService();
    const result = await service.generateText("اكتب سطرًا", {
      temperature: 0.2,
      maxOutputTokens: 64,
    });

    expect(result).toBe("رد مباشر");
    expect(mockGenerateContent).toHaveBeenCalledWith(
      "valid-gemini-key",
      expect.objectContaining({
        contents: "اكتب سطرًا",
        config: expect.objectContaining({
          temperature: 0.2,
          maxOutputTokens: 64,
        }),
      }),
    );
  });

  it("generates JSON through the direct provider client", async () => {
    mockGenerateContent.mockResolvedValue({ text: '{"ok":true}' });

    const service = new PlatformGenAIService();
    const result = await service.generateJson<{ ok: boolean }>("أعد كائنًا", {
      temperature: 0.1,
      maxOutputTokens: 32,
    });

    expect(result).toEqual({ ok: true });
    expect(mockGenerateContent).toHaveBeenCalledWith(
      "valid-gemini-key",
      expect.objectContaining({
        contents: "أعد كائنًا",
        config: expect.objectContaining({
          responseMimeType: "application/json",
          temperature: 0.1,
          maxOutputTokens: 32,
        }),
      }),
    );
  });
});
