import { readFileSync } from "node:fs";
import { describe, it, expect } from "vitest";
import {
  validateClip,
  chooseEvictions,
  clipDefaults,
  MAX_HISTORY_BYTES,
  type ClipRecord,
} from "../src/clipboard-model";
const item = (
  id: string,
  createdAt: number,
  pinned = false,
  bytes = 100,
): ClipRecord => ({
  id,
  kind: "text",
  data: id,
  hash: id,
  bytes,
  createdAt,
  pinned,
});
describe("clipboard history", () => {
  it("defaults automatic monitoring off", () =>
    expect(clipDefaults().enabled).toBe(false));
  it("accepts unicode text and counts UTF-8 bytes", () =>
    expect(validateClip({ kind: "text", data: "مرحبا" })).toBe(10));
  it.each(["text/html", "javascript", "file"])(
    "rejects unsupported %s payloads",
    (kind) =>
      expect(() => validateClip({ kind, data: "test" } as never)).toThrow(),
  );
  it("rejects empty items", () =>
    expect(() => validateClip({ kind: "text", data: "" })).toThrow());
  it("rejects SVG and external images", () => {
    for (const data of [
      "data:image/svg+xml;base64,PHN2Zz4=",
      "https://example.com/image.png",
    ])
      expect(() => validateClip({ kind: "image", data })).toThrow();
  });
  it("rejects oversized text", () =>
    expect(() =>
      validateClip({ kind: "text", data: "x".repeat(1024 * 1024 + 1) }),
    ).toThrow("clipTooLarge"));
  it("keeps latest unpinned items and protects pins", () =>
    expect(
      chooseEvictions(
        [
          item("old", 1),
          item("middle", 2),
          item("new", 3),
          item("pinned", 0, true),
        ],
        2,
      ),
    ).toEqual(["old"]));
  it("enforces aggregate capacity", () =>
    expect(
      chooseEvictions(
        [
          item("new", 2, false, 40 * 1024 * 1024),
          item("old", 1, false, 40 * 1024 * 1024),
        ],
        50,
      ),
    ).toEqual(["old"]));
  it("reports pinned-capacity overflow", () =>
    expect(() =>
      chooseEvictions([item("pinned", 1, true, MAX_HISTORY_BYTES + 1)], 50),
    ).toThrow("clipFull"));
});

it("accepts real PNG data and rejects fake PNG data", () => {
  expect(
    validateClip({
      kind: "image",
      data:
        "data:image/png;base64," +
        readFileSync("public/icons/icon128.png").toString("base64"),
    }),
  ).toBeGreaterThan(0);
  expect(() =>
    validateClip({ kind: "image", data: "data:image/png;base64,aGVsbG8=" }),
  ).toThrow("clipInvalid");
});
