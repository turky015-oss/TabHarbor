import { payloadFromPaste } from "./clipboard-media";
import type { ClipPayload } from "./clipboard-model";
const target = document.getElementById("paste-target")!;
let reading = false,
  lastHash = "",
  lastError = "";
async function status(error: string) {
  if (error === lastError) return;
  lastError = error;
  await chrome.runtime.sendMessage({ type: "clip:status", error });
}
async function capture(payload: ClipPayload) {
  const hashBytes = await crypto.subtle.digest(
    "SHA-256",
    new TextEncoder().encode(payload.kind + ":" + payload.data),
  );
  const hash = Array.from(new Uint8Array(hashBytes)).join(",");
  if (hash === lastHash) return;
  const result = await chrome.runtime.sendMessage({
    type: "clip:add",
    payload,
    automatic: true,
  });
  if (result.ok) {
    lastHash = hash;
    lastError = "";
  } else await status(result.error || "clipReadFailed");
}
target.addEventListener("paste", (event) => {
  event.preventDefault();
  if (!event.clipboardData) return;
  reading = true;
  void payloadFromPaste(event.clipboardData)
    .then((p) => (p ? capture(p) : undefined))
    .catch((e) => status(e instanceof Error ? e.message : "clipReadFailed"))
    .finally(() => {
      reading = false;
      target.textContent = "";
    });
});
function poll() {
  if (reading) return;
  target.focus();
  if (!document.execCommand("paste")) void status("clipReadFailed");
}
poll();
setInterval(poll, 2000);
