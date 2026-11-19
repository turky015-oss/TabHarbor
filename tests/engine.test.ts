import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  defaults,
  parseBackup,
  safeUrl,
  type Session,
  type State,
} from "../src/model";
import { dispatch } from "../src/engine";
let saved: State | undefined;
let fail = false;
let temporary: Record<string, unknown> = {};
const tab = (url = "https://example.com", index = 0, pinned = false) => ({
  url,
  title: url,
  index,
  pinned,
  id: index + 10,
  incognito: false,
});
let windows: unknown[] = [];
const local = {
  get: vi.fn(async () => ({
    tabharbor: saved ? structuredClone(saved) : undefined,
  })),
  set: vi.fn(async (v: { tabharbor: State }) => {
    if (fail) throw Error("quota");
    saved = structuredClone(v.tabharbor);
  }),
};
const create = vi.fn(async () => ({ id: 100 }));
const createWindow = vi.fn(async () => ({ id: 55, tabs: [{ id: 88 }] }));
beforeEach(() => {
  saved = undefined;
  fail = false;
  temporary = {};
  windows = [
    {
      id: 1,
      incognito: false,
      tabs: [tab("https://a.test", 0, true), tab("https://b.test", 1)],
    },
    { id: 2, incognito: true, tabs: [tab("https://secret.test")] },
    { id: 3, incognito: false, tabs: [tab("chrome://settings")] },
  ];
  vi.clearAllMocks();
  vi.stubGlobal("chrome", {
    storage: {
      local,
      session: {
        get: async (k: string) => ({ [k]: temporary[k] }),
        set: async (v: Record<string, unknown>) => Object.assign(temporary, v),
      },
    },
    windows: {
      getAll: async () => windows,
      create: createWindow,
      get: async () => ({ id: 1, type: "normal", incognito: false }),
    },
    tabs: { create, remove: vi.fn(async () => {}) },
  });
});
const save = () =>
  dispatch({ type: "save", scope: "all", name: "Research", windowId: 1 });
describe("session lifecycle", () => {
  it("saves supported tabs and excludes incognito and internal URLs", async () => {
    expect((await save()).ok).toBe(true);
    expect(saved?.sessions[0].tabs).toHaveLength(2);
    expect(saved?.sessions[0].name).toBe("Research");
  });
  it("captures only current window", async () => {
    windows.push({ id: 4, incognito: false, tabs: [tab()] });
    await dispatch({
      type: "save",
      scope: "current",
      windowId: 1,
      name: "Current",
    });
    expect(saved?.sessions[0].tabs).toHaveLength(2);
  });
  it("preserves order, pinned states and restores without deleting", async () => {
    await save();
    const id = saved!.sessions[0].id;
    const r = await dispatch({ type: "restore", id });
    expect(r.count).toBe(2);
    expect(
      create.mock.calls.map((c) => (c as unknown as [{ url: string }])[0].url),
    ).toEqual(["https://a.test", "https://b.test"]);
    expect(create).toHaveBeenNthCalledWith(
      1,
      expect.objectContaining({ pinned: true, windowId: 55 }),
    );
    expect(saved?.sessions).toHaveLength(1);
  });
  it("prevents rapid repeated restores", async () => {
    await save();
    const id = saved!.sessions[0].id;
    await dispatch({ type: "restore", id });
    expect((await dispatch({ type: "restore", id })).error).toBe("duplicate");
  });
  it("restores selected tabs", async () => {
    await save();
    const r = await dispatch({
      type: "restore",
      id: saved!.sessions[0].id,
      indices: [1],
    });
    expect(r.count).toBe(1);
    expect(create).toHaveBeenCalledWith(
      expect.objectContaining({ url: "https://b.test" }),
    );
  });
  it("allows different individual tabs while blocking repeated targets", async () => {
    await save();
    const id = saved!.sessions[0].id;
    expect((await dispatch({ type: "restore", id, indices: [0] })).count).toBe(
      1,
    );
    expect((await dispatch({ type: "restore", id, indices: [1] })).count).toBe(
      1,
    );
    expect(
      (await dispatch({ type: "restore", id, indices: [0, 0] })).error,
    ).toBe("duplicate");
  });
  it("canonicalizes full selections for duplicate prevention", async () => {
    await save();
    const id = saved!.sessions[0].id;
    await dispatch({ type: "restore", id });
    expect(
      (await dispatch({ type: "restore", id, indices: [1, 0, 1] })).error,
    ).toBe("duplicate");
  });
  it("reports partial restore failure", async () => {
    await save();
    create.mockRejectedValueOnce(Error("blocked"));
    const r = await dispatch({ type: "restore", id: saved!.sessions[0].id });
    expect(r).toMatchObject({ count: 1, failed: 1 });
  });
  it("renames, favorites, deletes and undoes", async () => {
    await save();
    const id = saved!.sessions[0].id;
    await dispatch({ type: "rename", id, name: "New" });
    await dispatch({ type: "favorite", id });
    expect(saved?.sessions[0]).toMatchObject({ name: "New", favorite: true });
    await dispatch({ type: "delete", id });
    expect(saved?.sessions).toHaveLength(0);
    await dispatch({ type: "undo", id: "" });
    expect(saved?.sessions[0].name).toBe("New");
  });
  it("serializes concurrent mutations", async () => {
    await Promise.all([save(), save(), save()]);
    expect(saved?.sessions).toHaveLength(3);
  });
  it("does not modify existing data after storage failure", async () => {
    await save();
    fail = true;
    expect((await save()).error).toBe("storage");
    expect(saved?.sessions).toHaveLength(1);
  });
  it("reads persisted state through a freshly loaded storage module", async () => {
    await save();
    vi.resetModules();
    const { read } = await import("../src/storage");
    expect((await read()).sessions[0].name).toBe("Research");
  });
  it("refuses unknown future schemas without rewriting", async () => {
    saved = { ...defaults(), schemaVersion: 2 } as unknown as State;
    expect((await save()).error).toBe("schema");
    expect(local.set).not.toHaveBeenCalled();
  });
});
describe("automatic snapshots", () => {
  it("deduplicates identical tab states", async () => {
    await dispatch({ type: "snapshot" });
    await dispatch({ type: "snapshot" });
    expect(saved?.sessions).toHaveLength(1);
  });
  it("keeps latest snapshots while protecting manual and favorite sessions", async () => {
    await save();
    saved!.settings.retention = 2;
    for (let i = 0; i < 4; i++) {
      windows = [{ id: 1, incognito: false, tabs: [tab(`https://${i}.test`)] }];
      await dispatch({ type: "snapshot" });
    }
    expect(saved!.sessions.filter((s) => s.automatic)).toHaveLength(2);
    expect(saved!.sessions.some((s) => s.name === "Research")).toBe(true);
  });
  it("does not back up when disabled", async () => {
    saved = defaults();
    saved.settings.autoBackup = false;
    await dispatch({ type: "snapshot" });
    expect(saved.sessions).toHaveLength(0);
  });
  it("retains previous snapshot when browser has no supported tabs", async () => {
    await dispatch({ type: "snapshot" });
    windows = [];
    await dispatch({ type: "snapshot" });
    expect(saved?.sessions).toHaveLength(1);
  });
});
describe("backup validation", () => {
  it("round trips exported JSON and remaps duplicate IDs", async () => {
    await save();
    const text = JSON.stringify({
      schemaVersion: 1,
      sessions: saved!.sessions,
    });
    const parsed = parseBackup(text);
    expect(parsed[0].tabs).toEqual(saved!.sessions[0].tabs);
    expect(parsed[0].id).not.toBe(saved!.sessions[0].id);
    await dispatch({ type: "import", text });
    expect(saved?.sessions).toHaveLength(2);
  });
  it.each([
    "{",
    "{}",
    '{"schemaVersion":2,"sessions":[]}',
    '{"schemaVersion":1,"sessions":[{}]}',
  ])("rejects invalid backup %s", (text) => {
    expect(() => parseBackup(text)).toThrow();
  });
  it.each([
    "javascript:alert(1)",
    "data:text/html,test",
    "file:///private/a",
    "https://user:password@example.com",
  ])("rejects unsafe URLs %s", (url) => {
    expect(safeUrl(url)).toBe(false);
  });
  it("round trips automatically named snapshots", async () => {
    await dispatch({ type: "snapshot" });
    const parsed = parseBackup(
      JSON.stringify({ schemaVersion: 1, sessions: saved!.sessions }),
    );
    expect(parsed[0].automatic).toBe(true);
  });
  it("rejects unsafe imports atomically", async () => {
    await save();
    const session = {
      ...saved!.sessions[0],
      tabs: [{ ...saved!.sessions[0].tabs[0], url: "javascript:alert(1)" }],
    } as Session;
    expect(
      (
        await dispatch({
          type: "import",
          text: JSON.stringify({ schemaVersion: 1, sessions: [session] }),
        })
      ).ok,
    ).toBe(false);
    expect(saved?.sessions).toHaveLength(1);
  });
});
