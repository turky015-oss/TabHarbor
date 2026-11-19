import { expect, it, vi } from "vitest";
import { applyLocale, translate } from "../src/i18n";
it.each([
  ["ar", "rtl"],
  ["en", "ltr"],
] as const)("sets %s direction", (language, dir) => {
  const root = { lang: "", dir: "" };
  vi.stubGlobal("document", { documentElement: root });
  applyLocale(language);
  expect(root).toEqual({ lang: language, dir });
  expect(translate(language, "settings")).toBeTruthy();
});
