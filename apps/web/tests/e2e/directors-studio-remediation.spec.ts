import { expect, test, type Page } from "@playwright/test";

const DIRECTORS_STUDIO_PATH = "/directors-studio";
const PROJECT_READY_TIMEOUT_MS = 15_000;
const SENSITIVE_STORAGE_PATTERN =
  /(password|secret|private[_-]?key|credit|access[_-]?token|auth[_-]?token|session[_-]?token|jwt|bearer)/i;

interface ButtonSnapshot {
  index: number;
  testId: string | null;
  text: string;
  name: string;
}

async function visibleButtonsWithoutNames(
  page: Page
): Promise<ButtonSnapshot[]> {
  return page.evaluate(() =>
    Array.from(document.querySelectorAll<HTMLButtonElement>("button"))
      .filter((element) => {
        const style = getComputedStyle(element);
        const rect = element.getBoundingClientRect();
        return (
          style.display !== "none" &&
          style.visibility !== "hidden" &&
          rect.width > 0 &&
          rect.height > 0
        );
      })
      .map((htmlButton, index) => {
        const normalize = (value: string | null | undefined) =>
          (value ?? "").replace(/\s+/g, " ").trim();
        const labelledBy = htmlButton.getAttribute("aria-labelledby");
        const labelledByText = labelledBy
          ? labelledBy
              .split(/\s+/)
              .map((id) => normalize(document.getElementById(id)?.innerText))
              .filter(Boolean)
              .join(" ")
          : "";
        const labelText = htmlButton.labels
          ? Array.from(htmlButton.labels)
              .map((label) => normalize(label.innerText))
              .filter(Boolean)
              .join(" ")
          : "";

        return {
          index,
          testId: htmlButton.getAttribute("data-testid"),
          text: normalize(htmlButton.innerText),
          name:
            normalize(htmlButton.getAttribute("aria-label")) ||
            labelledByText ||
            normalize(htmlButton.getAttribute("title")) ||
            labelText ||
            normalize(htmlButton.innerText),
        };
      })
      .filter((button) => !button.name)
  );
}

async function openDemoProject(page: Page): Promise<void> {
  await page.goto(DIRECTORS_STUDIO_PATH, { waitUntil: "domcontentloaded" });
  await expect(page.getByTestId("button-open-demo-project")).toBeVisible();
  await page.getByTestId("button-open-demo-project").click();
  await expect(page.getByTestId("card-scene-1")).toBeVisible({
    timeout: PROJECT_READY_TIMEOUT_MS,
  });
}

test.describe("directors studio remediation coverage", () => {
  test("loads the primary entry point within the usability budget", async ({
    page,
  }) => {
    const startedAt = performance.now();
    await page.goto(DIRECTORS_STUDIO_PATH, { waitUntil: "domcontentloaded" });
    await expect(page.getByTestId("button-open-demo-project")).toBeEnabled({
      timeout: PROJECT_READY_TIMEOUT_MS,
    });

    expect(performance.now() - startedAt).toBeLessThan(3000);
  });

  test("names every visible icon button in empty, demo, and characters states", async ({
    page,
  }) => {
    await page.goto(DIRECTORS_STUDIO_PATH, { waitUntil: "domcontentloaded" });
    await expect(page.getByTestId("button-open-demo-project")).toBeVisible();
    expect(await visibleButtonsWithoutNames(page)).toEqual([]);

    await page.getByTestId("button-open-demo-project").click();
    await expect(page.getByTestId("card-scene-1")).toBeVisible({
      timeout: PROJECT_READY_TIMEOUT_MS,
    });
    expect(await visibleButtonsWithoutNames(page)).toEqual([]);

    await page.getByTestId("tab-characters").click();
    await expect(page.getByTestId("characters-tab-content")).toBeVisible();
    expect(await visibleButtonsWithoutNames(page)).toEqual([]);
  });

  test("keeps the page inside the narrow viewport width", async ({ page }) => {
    await page.setViewportSize({ width: 768, height: 1024 });
    await openDemoProject(page);

    const overflow = await page.evaluate(() => ({
      scrollWidth: document.documentElement.scrollWidth,
      innerWidth: window.innerWidth,
    }));

    expect(overflow.scrollWidth).toBeLessThanOrEqual(overflow.innerWidth + 5);
  });

  test("opens the characters tab within the interaction budget", async ({
    page,
  }) => {
    await openDemoProject(page);

    const responseMs = await page.evaluate(async () => {
      const start = performance.now();
      const tab = document.querySelector<HTMLElement>(
        "[data-testid='tab-characters']"
      );
      tab?.click();
      await new Promise<void>((resolve, reject) => {
        const timeout = window.setTimeout(
          () => reject(new Error("characters tab content did not appear")),
          1500
        );
        const tick = () => {
          const content = document.querySelector(
            "[data-testid='characters-tab-content']"
          );
          if (content) {
            window.clearTimeout(timeout);
            resolve();
            return;
          }
          requestAnimationFrame(tick);
        };
        tick();
      });
      return performance.now() - start;
    });

    expect(responseMs).toBeLessThan(500);
  });

  test("does not accumulate page objects after repeated reloads", async ({
    page,
  }) => {
    test.setTimeout(120_000);
    await openDemoProject(page);

    const client = await page.context().newCDPSession(page);
    await client.send("Performance.enable");
    await client.send("HeapProfiler.enable");
    await client.send("HeapProfiler.collectGarbage");
    const before = await client.send("Performance.getMetrics");

    for (let i = 0; i < 20; i += 1) {
      await page.reload({ waitUntil: "domcontentloaded" });
      await expect(page.getByTestId("card-scene-1")).toBeVisible({
        timeout: PROJECT_READY_TIMEOUT_MS,
      });
    }

    await client.send("HeapProfiler.collectGarbage");
    const after = await client.send("Performance.getMetrics");
    const metric = (metrics: typeof before.metrics, name: string) =>
      metrics.find((item) => item.name === name)?.value ?? 0;

    const usedBefore = metric(before.metrics, "JSHeapUsedSize");
    const usedAfter = metric(after.metrics, "JSHeapUsedSize");
    const documentsBefore = metric(before.metrics, "Documents");
    const documentsAfter = metric(after.metrics, "Documents");
    const detachedBefore = metric(before.metrics, "DetachedScriptStates");
    const detachedAfter = metric(after.metrics, "DetachedScriptStates");

    expect(usedAfter).toBeLessThan(usedBefore * 2 + 12_000_000);
    expect(documentsAfter - documentsBefore).toBeLessThanOrEqual(3);
    expect(detachedAfter - detachedBefore).toBeLessThanOrEqual(5);
  });

  test("does not store session or auth secrets in browser storage", async ({
    page,
  }) => {
    await openDemoProject(page);

    const suspiciousEntries = await page.evaluate((patternSource) => {
      const sensitivePattern = new RegExp(patternSource, "i");
      const collectStorageEntries = (
        storage: Storage,
        area: "localStorage" | "sessionStorage"
      ): {
        area: "localStorage" | "sessionStorage";
        key: string;
        value: string;
      }[] =>
        Array.from({ length: storage.length }, (_, index) => {
          const key = storage.key(index) ?? "";
          return {
            area,
            key,
            value: key ? (storage.getItem(key) ?? "") : "",
          };
        });
      const entries = [
        ...collectStorageEntries(window.localStorage, "localStorage"),
        ...collectStorageEntries(window.sessionStorage, "sessionStorage"),
      ];

      return entries
        .filter(
          (entry) =>
            sensitivePattern.test(entry.key) ||
            sensitivePattern.test(entry.value)
        )
        .map(({ area, key }) => ({ area, key }));
    }, SENSITIVE_STORAGE_PATTERN.source);

    expect(suspiciousEntries).toEqual([]);
  });
});
