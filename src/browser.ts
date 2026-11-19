import { safeUrl, type SavedTab } from "./model";
export async function capture(windowId?: number): Promise<SavedTab[]> {
  const windows = await chrome.windows.getAll({
    populate: true,
    windowTypes: ["normal"],
  });
  return windows
    .filter(
      (w) => !w.incognito && (windowId === undefined || w.id === windowId),
    )
    .flatMap((w, wi) =>
      (w.tabs ?? [])
        .filter((t) => !t.incognito && safeUrl(t.url))
        .sort((a, b) => a.index - b.index)
        .map((t) => ({
          url: t.url!,
          title: (t.title ?? t.url!).slice(0, 2000),
          pinned: !!t.pinned,
          window: wi,
          index: t.index,
        })),
    );
}
export async function restoreTabs(
  tabs: SavedTab[],
  mode: "new" | "current",
  windowId?: number,
): Promise<{ count: number; failed: number }> {
  let count = 0,
    failed = 0;
  const groups = new Map<number, SavedTab[]>();
  for (const t of tabs) {
    if (!safeUrl(t.url)) {
      failed++;
      continue;
    }
    groups.set(t.window, [...(groups.get(t.window) ?? []), t]);
  }
  if (mode === "current") {
    const w = await chrome.windows.get(
      windowId ?? chrome.windows.WINDOW_ID_CURRENT,
    );
    if (w.incognito || w.type !== "normal") throw Error("window");
    windowId = w.id;
  }
  for (const group of groups.values()) {
    let target = windowId;
    let placeholder: number | undefined;
    try {
      if (mode === "new") {
        const w = await chrome.windows.create({
          url: "about:blank",
          type: "normal",
        });
        if (!w?.id) throw Error("window");
        target = w.id;
        placeholder = w.tabs?.[0]?.id;
      }
      for (const tab of [...group].sort(
        (a, b) => Number(b.pinned) - Number(a.pinned) || a.index - b.index,
      )) {
        try {
          await chrome.tabs.create({
            windowId: target,
            url: tab.url,
            pinned: tab.pinned,
            active: false,
          });
          count++;
        } catch {
          failed++;
        }
      }
      if (placeholder !== undefined && count > 0)
        await chrome.tabs.remove(placeholder).catch(() => {});
    } catch {
      failed += group.length;
    }
  }
  return { count, failed };
}
