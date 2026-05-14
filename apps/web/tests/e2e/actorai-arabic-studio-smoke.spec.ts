import { expect, test } from "@playwright/test";

test("actorai arabic base route opens the interactive studio", async ({
  page,
}) => {
  await page.goto("/actorai-arabic", { waitUntil: "domcontentloaded" });

  await expect(
    page.getByRole("heading", {
      level: 1,
      name: "استوديو الممثل العربي",
    })
  ).toBeVisible({ timeout: 60_000 });

  await expect(page.getByLabel("النص أو المشهد")).toBeVisible({
    timeout: 60_000,
  });

  await page.getByRole("button", { name: "حلل الأداء" }).click();

  await expect(page.getByText("أدخل مشهدًا عربيًا أولًا")).toBeVisible();

  const storageState = await page.evaluate(() => ({
    legacy: window.localStorage.getItem("actorai-arabic.app-state"),
    replayLocal: window.localStorage.getItem("sentryReplaySession"),
    replaySession: window.sessionStorage.getItem("sentryReplaySession"),
  }));

  expect(storageState).toEqual({
    legacy: null,
    replayLocal: null,
    replaySession: null,
  });
});
