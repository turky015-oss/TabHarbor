import { test, expect, chromium } from "@playwright/test";
import fs from "node:fs/promises";
import path from "node:path";
import os from "node:os";
const extension = path.resolve("dist");
test("interactive previews, filters, quick save, keyboard, undo and popup search", async () => {
  const profile = await fs.mkdtemp(
    path.join(os.tmpdir(), "tabharbor-interactive-"),
  );
  const context = await chromium.launchPersistentContext(profile, {
    channel: process.env.TABHARBOR_BROWSER || "chromium",
    headless: true,
    reducedMotion: "reduce",
    args: [
      `--disable-extensions-except=${extension}`,
      `--load-extension=${extension}`,
    ],
  });
  try {
    await context.route("https://*.example.test/**", (route) =>
      route.fulfill({ body: "<title>Interaction test</title>" }),
    );
    const worker =
      context.serviceWorkers()[0] ||
      (await context.waitForEvent("serviceworker"));
    const id = new URL(worker.url()).host;
    const original = await context.newPage();
    await original.goto("https://work.example.test/");
    const page = await context.newPage();
    const errors: string[] = [];
    page.on("pageerror", (error) => errors.push(error.message));
    await page.goto(`chrome-extension://${id}/dashboard.html`);
    await page.evaluate(async () => {
      const { state } = await chrome.runtime.sendMessage({ type: "state" });
      await chrome.runtime.sendMessage({
        type: "settings",
        settings: { ...state.settings, language: "en", autoBackup: false },
      });
      const make = (
        name: string,
        favorite: boolean,
        automatic: boolean,
        urls: string[],
      ) => ({
        id: name || "auto",
        name,
        favorite,
        automatic,
        createdAt: Date.now(),
        tabs: urls.map((url, index) => ({
          url,
          title: index === 0 ? "First page" : "Second page",
          window: 0,
          index,
          pinned: false,
        })),
      });
      await chrome.runtime.sendMessage({
        type: "import",
        text: JSON.stringify({
          schemaVersion: 1,
          sessions: [
            make("Work notes", false, false, [
              "https://first.example.test/",
              "https://second.example.test/",
            ]),
            make("Research", true, false, ["https://research.example.test/"]),
            make("", false, true, ["https://backup.example.test/"]),
          ],
        }),
      });
    });
    await page.reload();
    await expect(
      page.getByRole("heading", { name: "Overview", exact: true }),
    ).toBeVisible();
    const work = page.locator(".session-card").filter({
      has: page.getByRole("heading", { name: "Work notes", exact: true }),
    });
    await work.getByRole("button", { name: "Work notes", exact: true }).click();
    await expect(
      work.getByRole("button", { name: "Work notes", exact: true }),
    ).toHaveAttribute("aria-expanded", "true");
    await expect(work.locator(".expanded-tab")).toHaveCount(2);
    await work
      .getByRole("button", {
        name: "Restore this tab: First page",
        exact: true,
      })
      .click();
    await expect(page.getByRole("status")).toContainText("Tabs restored");
    await work
      .getByRole("button", {
        name: "Restore this tab: Second page",
        exact: true,
      })
      .click();
    await expect
      .poll(
        () =>
          context.pages().filter((p) => p.url().includes("example.test"))
            .length,
      )
      .toBe(3);
    const filters = page.getByRole("group", { name: "Filter sessions" });
    await filters
      .getByRole("button", { name: "Favorites", exact: true })
      .click();
    await expect(page.locator(".session-card")).toHaveCount(1);
    await expect(
      page.getByRole("heading", { name: "Research", exact: true }),
    ).toBeVisible();
    await filters
      .getByRole("button", { name: "All sessions", exact: true })
      .click();
    await page.getByRole("button", { name: "List view", exact: true }).click();
    await expect(page.locator(".cards")).toHaveClass(/list-view/);
    await page.keyboard.press("/");
    const search = page.getByRole("textbox", {
      name: "Search names, titles, or URLs",
    });
    await expect(search).toBeFocused();
    await search.fill("Research");
    await expect(page.locator(".session-card")).toHaveCount(1);
    await search.press("Escape");
    await expect(search).toHaveValue("");
    await page.keyboard.press("n");
    await expect(page.getByRole("dialog")).toBeVisible();
    await page
      .getByRole("textbox", { name: "Session name" })
      .fill("Saved with Enter");
    await page.getByRole("textbox", { name: "Session name" }).press("Enter");
    await expect(page.getByRole("dialog")).toHaveCount(0);
    await expect(
      page.getByRole("heading", { name: "Saved with Enter", exact: true }),
    ).toBeVisible();
    const before = await page.locator(".session-card").count();
    await page
      .getByRole("button", { name: "Quick save without naming", exact: true })
      .click();
    await expect(page.locator(".session-card")).toHaveCount(before + 1);
    await expect(page.locator(".just-saved")).toHaveCount(1);
    const saved = page.locator(".session-card").filter({
      has: page.getByRole("heading", {
        name: "Saved with Enter",
        exact: true,
      }),
    });
    await saved.getByRole("button", { name: "Delete", exact: true }).click();
    await page.getByRole("button", { name: "Confirm", exact: true }).click();
    await expect(
      page.getByRole("heading", { name: "Saved with Enter", exact: true }),
    ).toHaveCount(0);
    await page
      .getByRole("status")
      .getByRole("button", { name: "Undo deletion", exact: true })
      .click();
    await expect(
      page.getByRole("heading", { name: "Saved with Enter", exact: true }),
    ).toBeVisible();
    const popup = await context.newPage();
    await popup.setViewportSize({ width: 420, height: 600 });
    await popup.goto(`chrome-extension://${id}/popup.html`);
    await popup
      .getByRole("button", {
        name: "Search names, titles, or URLs",
        exact: true,
      })
      .click();
    await popup
      .getByRole("textbox", { name: "Search names, titles, or URLs" })
      .fill("Research");
    await expect(popup.locator(".session-card")).toHaveCount(1);
    await expect(
      popup.getByRole("heading", { name: "Research", exact: true }),
    ).toBeVisible();
    await expect(
      popup.getByRole("button", { name: "Open dashboard", exact: false }),
    ).toBeInViewport();
    await popup
      .getByRole("textbox", { name: "Search names, titles, or URLs" })
      .fill("nothing-matches-this");
    await expect(
      popup.getByRole("heading", { name: "No matching sessions", exact: true }),
    ).toBeVisible();
    await expect(
      popup.getByRole("button", { name: "Open dashboard", exact: false }),
    ).toBeInViewport();
    await popup
      .getByRole("button", { name: "Clear search", exact: true })
      .click();
    await expect(popup.locator(".session-card")).toHaveCount(before + 1);
    await expect.poll(() => errors).toEqual([]);
  } finally {
    await context.close();
    await fs.rm(profile, { recursive: true, force: true });
  }
});
