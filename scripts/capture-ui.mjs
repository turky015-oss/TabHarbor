import { chromium, expect } from "@playwright/test";
import { mkdtemp, mkdir, rm } from "node:fs/promises";
import path from "node:path";
import os from "node:os";
const extension = path.resolve("dist"),
  destination = process.argv[2] || "docs/ui-after";
await mkdir(destination, { recursive: true });
const profile = await mkdtemp(path.join(os.tmpdir(), "tabharbor-design-"));
const context = await chromium.launchPersistentContext(profile, {
  channel: "chromium",
  headless: true,
  viewport: { width: 1440, height: 1000 },
  reducedMotion: "reduce",
  args: [
    `--disable-extensions-except=${extension}`,
    `--load-extension=${extension}`,
  ],
});
try {
  const worker =
    context.serviceWorkers()[0] ||
    (await context.waitForEvent("serviceworker"));
  const id = new URL(worker.url()).host;
  const page = await context.newPage();
  await page.goto(`chrome-extension://${id}/dashboard.html`);
  await page.evaluate(async () => {
    const r = await chrome.runtime.sendMessage({ type: "state" });
    await chrome.runtime.sendMessage({
      type: "settings",
      settings: { ...r.state.settings, language: "ar", theme: "light" },
    });
    const examples = [
      [
        "أبحاث مشروع التخرج",
        ["scholar.google.com", "notion.so", "docs.google.com"],
        true,
        false,
      ],
      [
        "تصميم وإلهام",
        ["figma.com", "dribbble.com", "behance.net"],
        false,
        false,
      ],
      [
        "مساحة العمل اليومية",
        ["github.com", "linear.app", "calendar.google.com", "mail.google.com"],
        false,
        false,
      ],
      ["", ["developer.chrome.com", "vite.dev"], false, true],
    ];
    await chrome.runtime.sendMessage({
      type: "import",
      text: JSON.stringify({
        schemaVersion: 1,
        sessions: examples.map(([name, domains, favorite, automatic], i) => ({
          id: String(i),
          name,
          favorite,
          automatic,
          createdAt: Date.now() - i * 3600000,
          tabs: domains.map((d, j) => ({
            url: `https://${d}/`,
            title: d,
            pinned: j === 0,
            window: 0,
            index: j,
          })),
        })),
      }),
    });
  });
  await page.reload();
  await page.getByRole("heading", { name: "نظرة عامة", exact: true }).waitFor();
  await page.screenshot({
    path: `${destination}/dashboard-ar.png`,
    fullPage: true,
    animations: "disabled",
  });
  await page.locator(".session-title-button").first().click();
  await page.screenshot({
    path: `${destination}/preview-ar.png`,
    fullPage: true,
    animations: "disabled",
  });
  await page.getByRole("button", { name: "عرض القائمة", exact: true }).click();
  await page.screenshot({
    path: `${destination}/list-ar.png`,
    fullPage: true,
    animations: "disabled",
  });
  await page.getByRole("button", { name: "عرض البطاقات", exact: true }).click();
  await page.locator(".session-title-button").first().click();
  const popup = await context.newPage();
  await popup.setViewportSize({ width: 420, height: 600 });
  await popup.goto(`chrome-extension://${id}/popup.html`);
  await popup
    .getByRole("button", { name: "فتح لوحة التحكم", exact: false })
    .waitFor();
  await expect(
    popup.getByRole("button", { name: "فتح لوحة التحكم", exact: false }),
  ).toBeInViewport();
  const overflow = await popup.evaluate(
    () => document.documentElement.scrollWidth > innerWidth,
  );
  if (overflow) throw Error("Popup horizontal overflow");
  await popup.locator(".session-card").last().scrollIntoViewIfNeeded();
  await expect(
    popup.getByRole("button", { name: "فتح لوحة التحكم", exact: false }),
  ).toBeInViewport();
  await popup.locator(".cards").evaluate((el) => (el.scrollTop = 0));
  await popup.screenshot({
    path: `${destination}/popup-ar.png`,
    animations: "disabled",
  });
  await popup.locator(".session-title-button").first().click();
  await popup.screenshot({
    path: `${destination}/popup-preview-ar.png`,
    animations: "disabled",
  });
  await popup.locator(".session-title-button").first().click();
  await page
    .getByRole("button", { name: "الإعدادات", exact: true })
    .first()
    .click();
  await page.getByLabel("المظهر").selectOption("dark");
  await page.screenshot({
    path: `${destination}/settings-ar-dark.png`,
    fullPage: true,
    animations: "disabled",
  });
  await popup.screenshot({
    path: `${destination}/popup-ar-dark.png`,
    animations: "disabled",
  });
  await page.getByLabel("اللغة").selectOption("en");
  await page.getByRole("button", { name: "Overview", exact: true }).click();
  await page.screenshot({
    path: `${destination}/dashboard-en-dark.png`,
    fullPage: true,
    animations: "disabled",
  });
  await page
    .getByRole("button", { name: "Settings", exact: true })
    .first()
    .click();
  await page.getByLabel("Appearance").selectOption("light");
  await page.getByRole("button", { name: "Overview", exact: true }).click();
  await page.setViewportSize({ width: 580, height: 900 });
  await page.screenshot({
    path: `${destination}/dashboard-en-mobile.png`,
    fullPage: true,
    animations: "disabled",
  });
  if (
    await page.evaluate(() => document.documentElement.scrollWidth > innerWidth)
  )
    throw Error("Narrow dashboard horizontal overflow");
  await page
    .getByRole("textbox", { name: "Search names, titles, or URLs" })
    .fill("no-matching-session");
  await expect(
    page.getByRole("heading", {
      name: "No matching sessions",
    }),
  ).toBeVisible();
  await page.screenshot({
    path: `${destination}/empty-search-en.png`,
    fullPage: true,
    animations: "disabled",
  });
  console.log(
    "Captured Arabic/English, popup, dark, narrow and empty states; popup footer and horizontal-overflow checks passed.",
  );
} finally {
  await context.close();
  await rm(profile, { recursive: true, force: true });
}
