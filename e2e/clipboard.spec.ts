import { test, expect, chromium } from "@playwright/test";
import fs from "node:fs/promises";
import path from "node:path";
import os from "node:os";
test("real clipboard text/image history, offscreen capture, pause and restart", async () => {
  const base = await fs.mkdtemp(path.join(os.tmpdir(), "tabharbor-clipboard-")),
    fixture = path.join(base, "extension"),
    profile = path.join(base, "profile");
  await fs.cp(path.resolve("dist"), fixture, { recursive: true });
  // Pregrant optional extension permissions in this isolated fixture. The production
  // package retains opt-in runtime permissions; native permission prompts need manual QA.
  const manifest = JSON.parse(
    await fs.readFile(path.join(fixture, "manifest.json"), "utf8"),
  );
  manifest.permissions.push(...manifest.optional_permissions);
  delete manifest.optional_permissions;
  await fs.writeFile(
    path.join(fixture, "manifest.json"),
    JSON.stringify(manifest),
  );
  const options = {
    channel: process.env.TABHARBOR_BROWSER || "chromium",
    headless: true,
    args: [
      `--disable-extensions-except=${fixture}`,
      `--load-extension=${fixture}`,
    ],
  };
  let context = await chromium.launchPersistentContext(profile, options);
  let original: { type: string; data: string }[] = [];
  let page;
  try {
    const worker =
      context.serviceWorkers()[0] ||
      (await context.waitForEvent("serviceworker"));
    const id = new URL(worker.url()).host;
    page = await context.newPage();
    await page.goto(`chrome-extension://${id}/dashboard.html#clipboard`);
    await page.bringToFront();
    original = await page.evaluate(async () => {
      const saved: { type: string; data: string }[] = [];
      try {
        for (const item of await navigator.clipboard.read())
          for (const type of item.types) {
            if (!["text/plain", "image/png", "text/html"].includes(type))
              continue;
            const bytes = new Uint8Array(
              await (await item.getType(type)).arrayBuffer(),
            );
            let data = "";
            for (const byte of bytes) data += String.fromCharCode(byte);
            saved.push({ type, data: btoa(data) });
          }
      } catch {}
      return saved;
    });
    await expect(
      page.getByRole("heading", { name: "Keep what you copy.", exact: true }),
    ).toBeVisible();
    await expect(
      page.getByRole("button", {
        name: "Enable automatic history",
        exact: true,
      }),
    ).toBeVisible();
    await page
      .getByRole("textbox", { name: "Text", exact: true })
      .fill("Manual clipboard note");
    await page.getByRole("button", { name: "Save text", exact: true }).click();
    await expect(page.locator(".clip-card")).toHaveCount(1);
    await page
      .locator("input[type=file]")
      .setInputFiles(path.resolve("public/icons/icon128.png"));
    await expect(page.locator(".clip-card")).toHaveCount(2);
    await page
      .getByRole("textbox", { name: "Text", exact: true })
      .fill("Manual clipboard note");
    await page.getByRole("button", { name: "Save text", exact: true }).click();
    await expect(page.locator(".clip-card")).toHaveCount(2);
    await page.evaluate(() =>
      navigator.clipboard.writeText("Automatic copied text"),
    );
    await page
      .getByRole("button", { name: "Enable automatic history", exact: true })
      .click();
    await expect(
      page.getByText("Automatic capture active", { exact: true }),
    ).toBeVisible();
    await expect(
      page.locator(".clip-card").filter({ hasText: "Automatic copied text" }),
    ).toHaveCount(1, { timeout: 15000 });
    await page.evaluate(async () => {
      const canvas = document.createElement("canvas");
      canvas.width = 12;
      canvas.height = 12;
      canvas.getContext("2d")!.fillRect(0, 0, 12, 12);
      const blob = await new Promise<Blob>((resolve) =>
        canvas.toBlob((b) => resolve(b!), "image/png"),
      );
      await navigator.clipboard.write([
        new ClipboardItem({ "image/png": blob }),
      ]);
    });
    await expect(page.locator(".clip-card")).toHaveCount(4, { timeout: 15000 });
    await page
      .getByRole("button", { name: "Pause automatic history", exact: true })
      .click();
    await page.evaluate(() =>
      navigator.clipboard.writeText("Not retained while paused"),
    );
    await page.waitForTimeout(2600);
    await expect(
      page
        .locator(".clip-card")
        .filter({ hasText: "Not retained while paused" }),
    ).toHaveCount(0);
    const note = page
      .locator(".clip-card")
      .filter({ hasText: "Manual clipboard note" });
    await note.getByRole("button", { name: "Copy again", exact: true }).click();
    await expect
      .poll(() => page.evaluate(() => navigator.clipboard.readText()))
      .toBe("Manual clipboard note");
    await page
      .locator(".filter-chips")
      .getByRole("button", { name: "Images", exact: true })
      .click();
    await expect(page.locator(".clip-card")).toHaveCount(2);
    await page
      .locator(".clip-card")
      .first()
      .getByRole("button", { name: "Copy again", exact: true })
      .click();
    await expect(
      page
        .locator(".clip-card")
        .first()
        .getByRole("button", { name: "Copied", exact: true }),
    ).toBeVisible();
    expect(
      await page.evaluate(async () => {
        for (const item of await navigator.clipboard.read())
          if (item.types.includes("image/png"))
            return (await item.getType("image/png")).size;
        return 0;
      }),
    ).toBeGreaterThan(0);
    await page
      .locator(".filter-chips")
      .getByRole("button", { name: "All", exact: true })
      .click();
    await page.evaluate(() => window.scrollTo(0, 0));
    await page.screenshot({
      path: `test-results/${process.env.TABHARBOR_BROWSER || "chromium"}-clipboard.png`,
      fullPage: true,
    });
    await page.evaluate(async () => {
      const r = await chrome.runtime.sendMessage({ type: "state" });
      await chrome.runtime.sendMessage({
        type: "settings",
        settings: { ...r.state.settings, language: "ar" },
      });
    });
    await expect(
      page.getByRole("heading", { name: "احتفظ بما تنسخه.", exact: true }),
    ).toBeVisible();
    await page.evaluate(() => window.scrollTo(0, 0));
    await page.screenshot({
      path: `test-results/${process.env.TABHARBOR_BROWSER || "chromium"}-clipboard-ar.png`,
      fullPage: true,
    });
    await page.evaluate(async () => {
      const r = await chrome.runtime.sendMessage({ type: "state" });
      await chrome.runtime.sendMessage({
        type: "settings",
        settings: { ...r.state.settings, language: "en" },
      });
    });
    await page
      .getByRole("button", { name: "Enable automatic history", exact: true })
      .click();
    await context.close();
    context = await chromium.launchPersistentContext(profile, options);
    page = await context.newPage();
    await page.goto(`chrome-extension://${id}/dashboard.html#clipboard`);
    await expect(page.locator(".clip-card")).toHaveCount(4);
    await expect(
      page.getByRole("button", {
        name: "Pause automatic history",
        exact: true,
      }),
    ).toBeVisible();
    await page.bringToFront();
    await page.evaluate(() =>
      navigator.clipboard.writeText("Captured after browser restart"),
    );
    await expect(
      page
        .locator(".clip-card")
        .filter({ hasText: "Captured after browser restart" }),
    ).toHaveCount(1, { timeout: 15000 });
    await page
      .getByRole("button", { name: "Pause automatic history", exact: true })
      .click();
    await page
      .getByRole("button", { name: "Clear history", exact: true })
      .click();
    await expect(page.getByRole("alertdialog")).toBeVisible();
    await page.getByRole("button", { name: "Cancel", exact: true }).click();
    await expect(page.locator(".clip-card")).toHaveCount(5);
    await page
      .getByRole("button", { name: "Clear history", exact: true })
      .click();
    await page.getByRole("button", { name: "Confirm", exact: true }).click();
    await expect(page.locator(".clip-card")).toHaveCount(0);
  } finally {
    if (page && !page.isClosed()) {
      await page.bringToFront();
      await page
        .evaluate(() =>
          chrome.runtime.sendMessage({
            type: "clip:config",
            enabled: false,
            retention: 50,
          }),
        )
        .catch(() => {});
      await page
        .evaluate(async (values) => {
          try {
            if (values.length) {
              const types: Record<string, Blob> = {};
              for (const v of values)
                types[v.type] = new Blob(
                  [Uint8Array.from(atob(v.data), (c) => c.charCodeAt(0))],
                  { type: v.type },
                );
              await navigator.clipboard.write([new ClipboardItem(types)]);
            } else await navigator.clipboard.writeText("");
          } catch {}
        }, original)
        .catch(() => {});
    }
    await context.close();
    await fs.rm(base, { recursive: true, force: true });
  }
});
