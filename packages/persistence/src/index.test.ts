import { afterEach, beforeEach, describe, expect, it } from "vitest";

import {
  bootstrapPersistenceLayer,
  createAppStorage,
  type PersistedEnvelope,
} from "./index";

class MemoryStorage implements Storage {
  private readonly store = new Map<string, string>();

  public get length(): number {
    return this.store.size;
  }

  public clear(): void {
    this.store.clear();
  }

  public getItem(key: string): string | null {
    return this.store.get(key) ?? null;
  }

  public key(index: number): string | null {
    return Array.from(this.store.keys())[index] ?? null;
  }

  public removeItem(key: string): void {
    this.store.delete(key);
  }

  public setItem(key: string, value: string): void {
    this.store.set(key, value);
  }
}

beforeEach(() => {
  Object.defineProperty(globalThis, "window", {
    value: {
      localStorage: new MemoryStorage(),
      sessionStorage: new MemoryStorage(),
    },
    configurable: true,
    writable: true,
  });
});

afterEach(() => {
  delete (globalThis as { window?: unknown }).window;
});

describe("createAppStorage", () => {
  it("stores draft envelopes under the governed application namespace", () => {
    const storage = createAppStorage({ appId: "editor", schemaVersion: 2 });

    expect(storage.saveDraft("project-1", { title: "draft" })).toBe(true);

    const loaded = storage.loadDraft<{ title: string }>("project-1");
    expect(loaded).toMatchObject({
      appId: "editor",
      projectId: "project-1",
      schemaVersion: 2,
      data: { title: "draft" },
    } satisfies Partial<PersistedEnvelope<{ title: string }>>);
    expect(typeof loaded?.savedAt).toBe("string");
    expect(storage.listKeys()).toEqual([
      "the-copy.editor.v2.project-1.draft",
    ]);
  });

  it("rejects sensitive namespaces before writing client storage", () => {
    const storage = createAppStorage({ appId: "jwt", schemaVersion: 1 });

    expect(() => storage.saveDraft("project-1", { title: "draft" })).toThrow(
      /sensitive pattern/,
    );
    expect(window.localStorage.length).toBe(0);
  });
});

describe("bootstrapPersistenceLayer", () => {
  it("clears client tokens while leaving application drafts intact", () => {
    window.localStorage.setItem("access_token", "secret");
    window.localStorage.setItem("the-copy.editor.v1.project-1.draft", "draft");

    const report = bootstrapPersistenceLayer();

    expect(report.cleanedTokens).toBe(1);
    expect(window.localStorage.getItem("access_token")).toBeNull();
    expect(window.localStorage.getItem("the-copy.editor.v1.project-1.draft")).toBe(
      "draft",
    );
  });
});
