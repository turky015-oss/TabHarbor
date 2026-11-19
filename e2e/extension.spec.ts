import { test, expect, chromium } from "@playwright/test";
import path from "node:path";
import fs from "node:fs/promises";
import os from "node:os";
const extension = path.resolve("dist");
test("real extension save, restore, localization and restart persistence", async () => {
  const profile = await fs.mkdtemp(path.join(os.tmpdir(), "tabharbor-e2e-"));
  const options = {
    channel: process.env.TABHARBOR_BROWSER || "chromium",
    headless: process.env.HEADED !== "1",
    args: [
      `--disable-extensions-except=${extension}`,
      `--load-extension=${extension}`,
    ],
  };
  let context = await chromium.launchPersistentContext(profile, options);
  try {
    let worker =
      context.serviceWorkers()[0] ||
      (await context.waitForEvent("serviceworker"));
    const id = new URL(worker.url()).host;
    const tab = await context.newPage();
    await tab.route("https://example.com/**", (r) =>
      r.fulfill({ body: "<title>Harbor integration</title>" }),
    );
    await tab.goto("https://example.com/");
    await tab.evaluate(() => (document.title = "Harbor integration"));
    await worker.evaluate(async () => {
      const tabs = await chrome.tabs.query({ url: "https://example.com/*" });
      await chrome.tabs.update(tabs[0].id!, { pinned: true });
    });
    const dashboard = await context.newPage();
    await dashboard.goto(`chrome-extension://${id}/dashboard.html`);
    await expect(
      dashboard.getByRole("heading", { name: "Overview", exact: true }),
    ).toBeVisible();
    await dashboard
      .getByRole("button", { name: "Save current window", exact: false })
      .first()
      .click();
    await dashboard
      .getByRole("textbox", { name: "Session name" })
      .fill("Integration session");
    await dashboard.getByRole("button", { name: "Save", exact: true }).click();
    await expect(
      dashboard.getByRole("heading", {
        name: "Integration session",
        exact: true,
      }),
    ).toBeVisible();
    await dashboard
      .getByRole("button", { name: "Restore", exact: true })
      .first()
      .click();
    await expect(dashboard.getByRole("status")).toContainText("Tabs restored");
    await expect
      .poll(
        () =>
          context
            .pages()
            .filter((p) => p.url().startsWith("https://example.com")).length,
      )
      .toBe(2);
    await expect
      .poll(
        () =>
          dashboard.evaluate(async () => {
            const r = await chrome.runtime.sendMessage({ type: "state" });
            return r.state.sessions.filter(
              (s: { automatic: boolean }) => s.automatic,
            ).length;
          }),
        { timeout: 45000 },
      )
      .toBeGreaterThan(0);
    const popup = await context.newPage();
    await popup.goto(`chrome-extension://${id}/popup.html`);
    await expect(
      popup.getByRole("button", { name: "Open dashboard", exact: false }),
    ).toBeVisible();
    await popup.close();
    await dashboard.evaluate(() => window.scrollTo(0, 0));
    await dashboard.screenshot({
      path: `test-results/${process.env.TABHARBOR_BROWSER || "chromium"}-dashboard.png`,
      fullPage: true,
    });
    const exported = dashboard.waitForEvent("download");
    await dashboard
      .getByRole("button", { name: "Import / Export", exact: false })
      .first()
      .click();
    await dashboard
      .getByRole("button", { name: "Export sessions", exact: true })
      .click();
    const download = await exported;
    expect(download.suggestedFilename()).toMatch(/tabharbor.*json/);
    const exportedPath = await download.path();
    await dashboard.locator("input[type=file]").setInputFiles(exportedPath!);
    await expect(dashboard.getByRole("status")).toContainText(
      "Sessions imported",
    );
    await dashboard
      .getByRole("button", { name: "Settings", exact: true })
      .first()
      .click();
    await dashboard.getByLabel("Language").selectOption("ar");
    await expect(dashboard.locator("html")).toHaveAttribute("dir", "rtl");
    await dashboard.getByLabel("المظهر").selectOption("dark");
    await dashboard.screenshot({
      path: `test-results/${process.env.TABHARBOR_BROWSER || "chromium"}-arabic-dark.png`,
      fullPage: true,
    });
    await dashboard.getByLabel("اللغة").selectOption("en");
    await expect(dashboard.locator("html")).toHaveAttribute("dir", "ltr");
    await context.close();
    context = await chromium.launchPersistentContext(profile, options);
    const reopened = await context.newPage();
    await reopened.goto(`chrome-extension://${id}/dashboard.html`);
    await expect(
      reopened
        .getByRole("heading", { name: "Integration session", exact: true })
        .first(),
    ).toBeVisible();
  } finally {
    await context.close();
    await fs.rm(profile, { recursive: true, force: true });
  }
});
