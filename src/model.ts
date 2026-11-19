export interface SavedTab {
  url: string;
  title: string;
  pinned: boolean;
  window: number;
  index: number;
}
export interface Session {
  id: string;
  name: string;
  createdAt: number;
  favorite: boolean;
  automatic: boolean;
  tabs: SavedTab[];
}
export interface Settings {
  language: "en" | "ar";
  theme: "light" | "dark" | "system";
  autoBackup: boolean;
  retention: number;
  restore: "new" | "current";
}
export interface State {
  schemaVersion: 1;
  sessions: Session[];
  settings: Settings;
  fingerprint: string;
  trash: Session | null;
}
export const defaults = (): State => ({
  schemaVersion: 1,
  sessions: [],
  settings: {
    language:
      typeof navigator !== "undefined" && navigator.language.startsWith("ar")
        ? "ar"
        : "en",
    theme: "system",
    autoBackup: true,
    retention: 20,
    restore: "new",
  },
  fingerprint: "",
  trash: null,
});
export function safeUrl(url: unknown): url is string {
  if (typeof url !== "string" || url.length > 16384) return false;
  try {
    const u = new URL(url);
    return (
      ["https:", "http:"].includes(u.protocol) && !u.username && !u.password
    );
  } catch {
    return false;
  }
}
export function fingerprint(tabs: SavedTab[]): string {
  return JSON.stringify(
    tabs.map((t) => [t.url, t.title, t.pinned, t.window, t.index]),
  );
}
export function retain(sessions: Session[], limit: number): Session[] {
  let n = 0;
  return [...sessions]
    .sort((a, b) => b.createdAt - a.createdAt)
    .filter((s) => !s.automatic || s.favorite || n++ < limit);
}
export function parseBackup(text: string): Session[] {
  if (text.length > 20_000_000) throw Error("invalid");
  const b = JSON.parse(text);
  if (
    !b ||
    b.schemaVersion !== 1 ||
    !Array.isArray(b.sessions) ||
    b.sessions.length > 2000
  )
    throw Error("invalid");
  let count = 0;
  return b.sessions.map((s: Session) => {
    if (
      !s ||
      typeof s.id !== "string" ||
      typeof s.name !== "string" ||
      (!s.name.trim() && !s.automatic) ||
      s.name.length > 200 ||
      !Number.isFinite(s.createdAt) ||
      s.createdAt < 0 ||
      s.createdAt > 8.64e15 ||
      typeof s.favorite !== "boolean" ||
      typeof s.automatic !== "boolean" ||
      !Array.isArray(s.tabs) ||
      !s.tabs.length
    )
      throw Error("invalid");
    return {
      id: crypto.randomUUID(),
      name: s.name,
      createdAt: s.createdAt,
      favorite: s.favorite,
      automatic: s.automatic,
      tabs: s.tabs.map((t) => {
        if (
          ++count > 50000 ||
          !t ||
          !safeUrl(t.url) ||
          typeof t.title !== "string" ||
          t.title.length > 2000 ||
          typeof t.pinned !== "boolean" ||
          !Number.isInteger(t.window) ||
          t.window < 0 ||
          !Number.isInteger(t.index) ||
          t.index < 0
        )
          throw Error("invalid");
        return {
          url: t.url,
          title: t.title,
          pinned: t.pinned,
          window: t.window,
          index: t.index,
        };
      }),
    };
  });
}
export type Command =
  | { type: "state" }
  | { type: "save"; scope: "current" | "all"; windowId: number; name: string }
  | { type: "rename"; id: string; name: string }
  | {
      type: "favorite" | "delete" | "restore" | "undo";
      id: string;
      indices?: number[];
      windowId?: number;
    }
  | { type: "settings"; settings: Settings }
  | { type: "import"; text: string }
  | { type: "snapshot" };
export interface Reply {
  ok: boolean;
  state?: State;
  error?: string;
  count?: number;
  failed?: number;
}
