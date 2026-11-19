export const MAX_CLIP_BYTES = 8 * 1024 * 1024;
export const MAX_HISTORY_BYTES = 64 * 1024 * 1024;
export interface ClipPayload {
  kind: "text" | "image";
  data: string;
  thumbnail?: string;
}
export interface ClipRecord extends ClipPayload {
  id: string;
  hash: string;
  bytes: number;
  createdAt: number;
  pinned: boolean;
}
export interface ClipSummary {
  id: string;
  kind: "text" | "image";
  preview: string;
  thumbnail?: string;
  bytes: number;
  createdAt: number;
  pinned: boolean;
}
export interface ClipConfig {
  enabled: boolean;
  retention: number;
  lastError?: string;
  lastCapture?: number;
}
export const clipDefaults = (): ClipConfig => ({
  enabled: false,
  retention: 50,
});
export type ClipCommand =
  | { type: "clip:list" }
  | { type: "clip:add"; payload: ClipPayload; automatic?: boolean }
  | { type: "clip:pin" | "clip:delete" | "clip:get"; id: string }
  | { type: "clip:clear" }
  | { type: "clip:config"; enabled: boolean; retention: number }
  | { type: "clip:status"; error: string };
export interface ClipReply {
  ok: boolean;
  error?: string;
  entries?: ClipSummary[];
  config?: ClipConfig;
  record?: ClipRecord;
}
export function validateClip(value: ClipPayload): number {
  if (
    !value ||
    !["text", "image"].includes(value.kind) ||
    typeof value.data !== "string" ||
    !value.data.length
  )
    throw Error("clipInvalid");
  if (value.data.length > MAX_CLIP_BYTES * 1.5) throw Error("clipTooLarge");
  if (
    value.kind === "image" &&
    !/^data:image\/png;base64,[A-Za-z0-9+/]+={0,2}$/.test(value.data)
  )
    throw Error("clipInvalid");
  if (
    value.thumbnail !== undefined &&
    (typeof value.thumbnail !== "string" ||
      value.thumbnail.length > 200000 ||
      !/^data:image\/png;base64,[A-Za-z0-9+/]+={0,2}$/.test(value.thumbnail))
  )
    throw Error("clipInvalid");
  if (value.kind === "image") {
    const header = atob(value.data.split(",")[1].slice(0, 48));
    if (
      !header.startsWith("\x89PNG\r\n\x1a\n") ||
      header.slice(12, 16) !== "IHDR"
    )
      throw Error("clipInvalid");
    const size = (offset: number) =>
      Array.from(header.slice(offset, offset + 4)).reduce(
        (n, c) => n * 256 + c.charCodeAt(0),
        0,
      );
    const width = size(16),
      height = size(20);
    if (!width || !height || width * height > 32_000_000)
      throw Error("clipTooLarge");
  }
  const bytes =
    value.kind === "text"
      ? new TextEncoder().encode(value.data).length
      : Math.floor((value.data.split(",")[1].length * 3) / 4);
  if (bytes > MAX_CLIP_BYTES || (value.kind === "text" && bytes > 1024 * 1024))
    throw Error("clipTooLarge");
  return value.kind === "image"
    ? value.data.length + (value.thumbnail?.length ?? 0)
    : bytes;
}
export function chooseEvictions(
  records: ClipRecord[],
  limit: number,
): string[] {
  let count = 0,
    bytes = 0;
  const remove: string[] = [];
  for (const r of [...records].sort(
    (a, b) => Number(b.pinned) - Number(a.pinned) || b.createdAt - a.createdAt,
  )) {
    if (r.pinned) {
      bytes += r.bytes;
      continue;
    }
    count++;
    bytes += r.bytes;
    if (count > limit || bytes > MAX_HISTORY_BYTES) {
      remove.push(r.id);
      bytes -= r.bytes;
    }
  }
  if (
    records.filter((r) => r.pinned).reduce((n, r) => n + r.bytes, 0) >
    MAX_HISTORY_BYTES
  )
    throw Error("clipFull");
  return remove;
}
export function asSummary(r: ClipRecord): ClipSummary {
  return {
    id: r.id,
    kind: r.kind,
    preview: r.kind === "text" ? r.data.slice(0, 1000) : "",
    thumbnail: r.thumbnail,
    bytes: r.bytes,
    createdAt: r.createdAt,
    pinned: r.pinned,
  };
}
