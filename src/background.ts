import { clipboardDispatch, syncClipboardMonitor } from "./clipboard-service";
import type { ClipCommand } from "./clipboard-model";
import { dispatch } from "./engine";
import type { Command } from "./model";
const pending = "tabharbor-pending",
  periodic = "tabharbor-periodic";
async function schedule() {
  await chrome.alarms.create(pending, { delayInMinutes: 0.5 });
}
async function initialize() {
  await chrome.storage.local.setAccessLevel({
    accessLevel: "TRUSTED_CONTEXTS",
  });
  await chrome.alarms.create(periodic, { periodInMinutes: 5 });
  await schedule();
  await syncClipboardMonitor();
}
chrome.runtime.onInstalled.addListener(() => {
  void initialize();
});
chrome.runtime.onStartup.addListener(() => {
  void initialize();
});
chrome.tabs.onCreated.addListener(() => {
  void schedule();
});
chrome.tabs.onRemoved.addListener(() => {
  void schedule();
});
chrome.tabs.onMoved.addListener(() => {
  void schedule();
});
chrome.tabs.onAttached.addListener(() => {
  void schedule();
});
chrome.tabs.onDetached.addListener(() => {
  void schedule();
});
chrome.tabs.onUpdated.addListener((_id, change) => {
  if (
    change.url !== undefined ||
    change.pinned !== undefined ||
    change.title !== undefined
  )
    void schedule();
});
chrome.windows.onRemoved.addListener(() => {
  void schedule();
});
chrome.alarms.onAlarm.addListener((alarm) => {
  if (alarm.name === periodic) void syncClipboardMonitor().catch(() => {});
  if ([pending, periodic].includes(alarm.name))
    void dispatch({ type: "snapshot" }).then((r) => {
      if (!r.ok) console.error("TabHarbor backup:", r.error);
    });
});
chrome.runtime.onMessage.addListener(
  (command: Command | ClipCommand, sender, respond) => {
    if (sender.id !== chrome.runtime.id) return false;
    if (command.type?.startsWith("clip:"))
      void clipboardDispatch(command as ClipCommand).then(respond);
    else void dispatch(command as Command).then(respond);
    return true;
  },
);

chrome.permissions.onRemoved.addListener(() => {
  void syncClipboardMonitor().catch(() => {});
});
