import {
  asSummary,
  chooseEvictions,
  clipDefaults,
  validateClip,
  type ClipCommand,
  type ClipConfig,
  type ClipRecord,
  type ClipReply,
} from "./clipboard-model";
import { getClips, commitClips } from "./clipboard-db";
const permissions: chrome.runtime.ManifestPermission[] = [
  "clipboardRead",
  "offscreen",
];
let queue: Promise<unknown> = Promise.resolve();
export function clipboardDispatch(c: ClipCommand): Promise<ClipReply> {
  const result = queue
    .then(() => execute(c))
    .catch((e: unknown) => ({
      ok: false,
      error: e instanceof Error ? e.message : "clipStorage",
    }));
  queue = result;
  return result;
}
export async function clipConfig(): Promise<ClipConfig> {
  const result = await chrome.storage.local.get("clipboardConfig");
  return {
    ...clipDefaults(),
    ...(result.clipboardConfig as Partial<ClipConfig> | undefined),
  };
}
async function hasPermission() {
  return chrome.permissions.contains({ permissions });
}
let monitorQueue: Promise<unknown> = Promise.resolve();
export function syncClipboardMonitor(): Promise<void> {
  const next = monitorQueue.then(syncMonitor);
  monitorQueue = next.catch(() => {});
  return next;
}
async function syncMonitor(): Promise<void> {
  let cfg = await clipConfig();
  const permitted = await hasPermission();
  if (cfg.enabled && !permitted) {
    cfg = { ...cfg, enabled: false, lastError: "clipPermission" };
    await chrome.storage.local.set({ clipboardConfig: cfg });
  }
  const contexts = await chrome.runtime.getContexts({
    contextTypes: [chrome.runtime.ContextType.OFFSCREEN_DOCUMENT],
    documentUrls: [chrome.runtime.getURL("clipboard-offscreen.html")],
  });
  if (cfg.enabled && permitted) {
    if (!contexts.length)
      await chrome.offscreen.createDocument({
        url: "clipboard-offscreen.html",
        reasons: [chrome.offscreen.Reason.CLIPBOARD],
        justification:
          "Keep the local clipboard history the user explicitly enabled, including text and images.",
      });
  } else if (contexts.length) await chrome.offscreen.closeDocument();
}
async function execute(c: ClipCommand): Promise<ClipReply> {
  let cfg = await clipConfig();
  if (c.type === "clip:status") {
    if (cfg.lastError !== c.error) {
      cfg.lastError = c.error;
      await chrome.storage.local.set({ clipboardConfig: cfg });
    }
    return { ok: true };
  }
  if (c.type === "clip:config") {
    if (!Number.isInteger(c.retention) || c.retention < 10 || c.retention > 200)
      throw Error("clipInvalid");
    if (c.enabled && !(await hasPermission())) throw Error("clipPermission");
    cfg = {
      ...cfg,
      enabled: c.enabled,
      retention: c.retention,
      lastError: undefined,
    };
    await chrome.storage.local.set({ clipboardConfig: cfg });
    try {
      await syncClipboardMonitor();
    } catch {
      cfg = { ...cfg, enabled: false, lastError: "clipReadFailed" };
      await chrome.storage.local.set({ clipboardConfig: cfg });
      throw Error("clipReadFailed");
    }
    cfg = await clipConfig();
    const all = await getClips();
    await commitClips([], chooseEvictions(all, cfg.retention));
  } else if (c.type === "clip:add") {
    if (c.automatic && (!cfg.enabled || !(await hasPermission())))
      return { ok: true };
    const bytes = validateClip(c.payload);
    const raw = new TextEncoder().encode(c.payload.kind + ":" + c.payload.data),
      digest = await crypto.subtle.digest("SHA-256", raw);
    const hash = Array.from(new Uint8Array(digest), (b) =>
      b.toString(16).padStart(2, "0"),
    ).join("");
    const all = await getClips(),
      same = all.find((r) => r.hash === hash);
    const record: ClipRecord = {
      ...c.payload,
      id: same?.id ?? crypto.randomUUID(),
      hash,
      bytes,
      createdAt: Date.now(),
      pinned: same?.pinned ?? false,
    };
    const next = [record, ...all.filter((r) => r.id !== record.id)],
      remove = chooseEvictions(next, cfg.retention);
    if (remove.includes(record.id)) throw Error("clipFull");
    await commitClips([record], remove);
    cfg = { ...cfg, lastCapture: Date.now(), lastError: undefined };
    await chrome.storage.local.set({ clipboardConfig: cfg });
  } else if (c.type === "clip:clear") {
    await commitClips([], [], true);
  } else if (
    c.type === "clip:pin" ||
    c.type === "clip:delete" ||
    c.type === "clip:get"
  ) {
    const all = await getClips(),
      record = all.find((r) => r.id === c.id);
    if (!record) throw Error("missing");
    if (c.type === "clip:get") return { ok: true, record };
    if (c.type === "clip:delete") await commitClips([], [c.id]);
    else {
      record.pinned = !record.pinned;
      const next = all.map((r) => (r.id === record.id ? record : r)),
        remove = chooseEvictions(next, cfg.retention);
      await commitClips(remove.includes(record.id) ? [] : [record], remove);
    }
  }
  if (c.type !== "clip:list")
    await chrome.storage.local.set({ clipboardRevision: crypto.randomUUID() });
  const entries = (await getClips())
    .sort(
      (a, b) =>
        Number(b.pinned) - Number(a.pinned) || b.createdAt - a.createdAt,
    )
    .map(asSummary);
  return { ok: true, entries, config: cfg };
}
