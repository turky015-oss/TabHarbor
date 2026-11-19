import { capture, restoreTabs } from "./browser";
import { read, write } from "./storage";
import {
  fingerprint,
  parseBackup,
  retain,
  type Command,
  type Reply,
  type Session,
} from "./model";
let queue: Promise<unknown> = Promise.resolve();
export function dispatch(command: Command): Promise<Reply> {
  const next = queue
    .then(() => execute(command))
    .catch((e: unknown) => ({
      ok: false,
      error: e instanceof Error ? e.message : "unknown",
    }));
  queue = next;
  return next;
}
async function execute(c: Command): Promise<Reply> {
  const s = await read();
  let count: number | undefined;
  if (c.type === "state") return { ok: true, state: s };
  if (c.type === "save" || c.type === "snapshot") {
    if (c.type === "snapshot" && !s.settings.autoBackup)
      return { ok: true, state: s };
    const tabs = await capture(
      c.type === "save" && c.scope === "current" ? c.windowId : undefined,
    );
    if (!tabs.length)
      return c.type === "save"
        ? { ok: false, error: "empty" }
        : { ok: true, state: s };
    const fp = fingerprint(tabs);
    if (c.type === "snapshot" && fp === s.fingerprint)
      return { ok: true, state: s };
    const session: Session = {
      id: crypto.randomUUID(),
      name: c.type === "save" ? c.name.trim().slice(0, 200) || "Session" : "",
      createdAt: Date.now(),
      favorite: false,
      automatic: c.type === "snapshot",
      tabs,
    };
    s.sessions.unshift(session);
    if (c.type === "snapshot") {
      s.fingerprint = fp;
      s.sessions = retain(s.sessions, s.settings.retention);
    }
  } else if (c.type === "settings") {
    const v = c.settings;
    if (
      !["ar", "en"].includes(v.language) ||
      !["dark", "light", "system"].includes(v.theme) ||
      !["new", "current"].includes(v.restore) ||
      typeof v.autoBackup !== "boolean" ||
      !Number.isInteger(v.retention) ||
      v.retention < 1 ||
      v.retention > 100
    )
      throw Error("invalid");
    s.settings = v;
    s.sessions = retain(s.sessions, v.retention);
  } else if (c.type === "import") {
    const imported = parseBackup(c.text);
    s.sessions.push(...imported);
    count = imported.length;
  } else if (c.type === "undo") {
    if (s.trash) {
      s.sessions.unshift(s.trash);
      s.trash = null;
    }
  } else {
    const session = s.sessions.find((x) => x.id === c.id);
    if (!session) throw Error("missing");
    if (c.type === "rename") {
      if (!c.name.trim()) throw Error("invalid");
      session.name = c.name.trim().slice(0, 200);
    }
    if (c.type === "favorite") session.favorite = !session.favorite;
    if (c.type === "delete") {
      s.trash = session;
      s.sessions = s.sessions.filter((x) => x.id !== c.id);
    }
    if (c.type === "restore") {
      const requested = c.indices ? new Set(c.indices) : null;
      const indices = session.tabs
        .map((_, i) => i)
        .filter((i) => !requested || requested.has(i));
      if (!indices.length) throw Error("empty");
      const key =
        "restore:" +
        c.id +
        ":" +
        (indices.length === session.tabs.length ? "all" : indices.join(","));
      const last = (await chrome.storage.session.get(key))[key] as
        number | undefined;
      if (last && Date.now() - last < 5000) throw Error("duplicate");
      await chrome.storage.session.set({ [key]: Date.now() });
      const selected = indices.map((i) => session.tabs[i]);
      return {
        ok: true,
        ...(await restoreTabs(selected, s.settings.restore, c.windowId)),
        state: s,
      };
    }
  }
  await write(s);
  return { ok: true, state: s, count };
}
