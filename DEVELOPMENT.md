# TabHarbor 1.1.0

Your Tabs. Safe in One Place. A local-only Manifest V3 extension for Chrome and Edge, with English and Arabic interfaces.

## Updating an existing installation

The `release/chrome` and `release/edge` folders now contain the 1.1.0 interface and optional clipboard history. If your browser already loads one of these folders, open its Extensions page and click Reload on TabHarbor. Do not uninstall; your saved sessions and preferences are retained. If you extracted a ZIP elsewhere, copy the new build files into that same folder, then reload.

## Install

1. Extract `release/tabharbor-chrome-1.1.0.zip` or `release/tabharbor-edge-1.1.0.zip` into a permanent folder. Alternatively use the supplied `release/chrome` or `release/edge` directory.
2. Open `chrome://extensions` in Chrome or `edge://extensions` in Edge.
3. Enable **Developer mode**, choose **Load unpacked**, and select the extracted folder containing `manifest.json`.
4. Pin TabHarbor to the toolbar, then open its popup. **Open dashboard** opens the full application. The browser's extension Options command also opens Settings.

Chrome/Edge 120+ required. These are unpacked and store-upload packages, not signed installers. Store publication requires your developer account and review.

## Development

Node 24+ and npm are recommended. From this directory:

```sh
npm ci
npm run dev
npm run build
npm test
npx playwright install chromium
npm run test:e2e
```

The dev server supports styling work; browser APIs require the built extension loaded in a browser. After changing source, rebuild and reload the extension. `npm run build` checks strict TypeScript, builds with Vite/Tailwind, and prepares matching Chrome and Edge directories and ZIP files. Packaging uses the system `zip` command (macOS/Linux; on Windows use WSL). The lockfile pins exact dependency versions.

Run Edge integration with `TABHARBOR_BROWSER=msedge HEADED=1 npm run test:e2e`. Some branded browser releases disable command-line extension loading; use the manual procedure below if necessary. Tests always use a fresh temporary profile, never your personal browser profile.

## Features and behavior

- Save supported tabs from the current normal window or all normal windows. Original tabs stay open.
- New-window restoration preserves original window grouping and relative tab order. Pinned tabs precede unpinned tabs, as required by the browser. Current-window restoration appends unpinned tabs; the browser places pinned tabs in its pinned section.
- Manual sessions, automatic snapshots, favorites, rename, search, sorting, individual/selected restoration, delete confirmation, and persistent one-step undo.
- Event-driven snapshots: a durable alarm is rescheduled for 30 seconds after tab changes. A five-minute alarm provides recovery during continuous activity and across worker suspension. No always-running timer is required. Startup recreates alarms. Snapshots compare URL, title, pin, window group, and order before saving. Empty states do not replace the last useful backup.
- Default retention is 20 non-favorite automatic snapshots, configurable from 1–100. Manual and favorite sessions are protected. A retention-setting change applies cleanup immediately.
- Restore attempts for the same session and target tab selection have a five-second cooldown. Different individual tabs can be restored consecutively. Partial failures report both counts; saved sessions remain intact. Deliberately restoring later can create duplicates.
- JSON schema 1 exports sessions only, without preferences or undo history. Imports validate every entry before writing, create new IDs, and merge without overwriting. Maximum import: 20 MB, 2,000 sessions, 50,000 tabs. Future schema versions are rejected without changing existing data; add explicit migrations when introducing a new schema.
- Arabic RTL, English LTR, browser language detection, and light/dark/system appearance. URL strings retain LTR readability.

## Interactive controls

- Click a session name to expand its pages. Use a page's arrow to restore it individually or **Select tabs** for multi-select restoration.
- The lightning button saves the current window immediately with a date/time name. The regular save button still lets you choose a name.
- Filter by all sessions, manual sessions, backups or favorites. Toggle grid/list view without changing saved data.
- Open search in the popup using its search button. On the dashboard or popup, `/` focuses search, `N` opens the save dialog, Enter confirms a session name, and Escape clears search/closes a disclosure. Typing in an input does not trigger letter shortcuts.
- Click dashboard metric cards to navigate to the corresponding collection. The keyboard button shows available shortcuts.
- Actions show busy feedback; recent saves are highlighted briefly and successful notifications dismiss automatically. Deletion feedback includes Undo. Motion respects the operating system's reduced-motion setting.

## Clipboard history (1.1.0)

Open **Clipboard / الحافظة** from the sidebar or the popup's clipboard button. Paste into this page, type text and choose Save text, upload a PNG/JPEG/WebP image, or use Save current clipboard. Preview, copy again, pin, search, download, delete and clear saved items. Clipboard data is stored locally in a separate IndexedDB database, without using the tab-session storage quota. Session JSON exports do not include clipboard data; use the per-item download action to keep an external copy.

Automatic history is **off by default**. Enabling it requests optional `clipboardRead` and `offscreen` permissions. An offscreen document polls approximately every two seconds while the browser is running; a sleeping service worker is woken only for changed content or an error/status change. Startup and the existing recovery alarm recreate the document if needed. Pause closes the monitor. Permissions can also be revoked in the browser's extension settings. Copy again requests optional `clipboardWrite` permission; manual typing, pasting and image uploads work without clipboard-read permission.

This is the **device's clipboard**: automatic history may capture text and images copied from other applications, password managers or private windows. It cannot reliably infer the source or exclude sensitive copies. The enable control explains this scope; pause it before copying sensitive data. History is not encrypted and is accessible to someone with access to the browser profile. No data is sent externally.

The monitor cannot recover an item replaced before capture or before enabling the feature. It cannot capture while the browser is closed and can miss very rapid changes between polls. Text is limited to 1 MB; images to 8 MB and 32 megapixels before storage. Images are decoded and normalized to PNG; thumbnails are generated locally. The 64 MB retention budget accounts for serialized image/thumbnail payloads. Default retention is 50 recent unpinned items (10–200 configurable); pinned items survive automatic cleanup but remain subject to the aggregate capacity. Oversized items fail without replacing older records. If pins fill capacity, delete/unpin items first. Deletion and clearing require confirmation and are permanent.

### Clipboard manual release checks

1. Load the production build, open Clipboard and confirm recording starts disabled. Save typed text and an uploaded image without granting clipboard read.
2. Enable automatic history and verify the browser shows the optional clipboard permission prompt. Deny it: manual paste/upload must still work. Allow it on a second attempt.
3. Copy ordinary test text in another app or tab; wait at least 2 seconds; copy something else. Confirm both appear. Repeat with an image. Do not use secrets for this check.
4. Pause, copy a new unique test string, wait 3 seconds and confirm it is absent. Copy a saved text/image again and paste into another application to verify its content.
5. Pin an item, lower retention, add enough items to trigger cleanup and confirm pins survive. Delete one item and clear all with confirmation.
6. Leave automatic history enabled, restart the browser, copy a new test string and verify capture resumes. Revoke read/offscreen permission in browser settings; recording must stop.
7. Verify English/Arabic, dark appearance, preview dialog keyboard/Escape behavior, and exported tab-session JSON excluding clipboard items.

## Architecture

`src/background.ts` registers worker events and message handling. `engine.ts` serializes all writes and restore requests in that worker; UI pages never write storage directly. `browser.ts` captures and restores normal windows. `storage.ts` handles durable local state and quota failure. `model.ts` defines types, URL policy, retention and import/export schema. `i18n.ts` contains both complete translation dictionaries. `main.tsx` shares popup, dashboard and settings components. `tests/` contains unit tests; `e2e/` loads the real unpacked extension in an isolated persistent browser profile.

A single state value is committed through `chrome.storage.local`; failed commits leave the prior value intact. Local storage has the browser's normal quota (no unlimited-storage permission). Export regularly, especially with large collections. Cross-page mutations are queued in one worker; the UI reports storage failures. A browser or OS crash during an API operation cannot provide a transactional guarantee for tab creation. Automatic snapshot errors appear in the extension worker console.

## Permissions

| Permission | Purpose                                                       |
| ---------- | ------------------------------------------------------------- |
| `tabs`     | Read tab URL/title/order/pin data and save or restore tabs.   |
| `storage`  | Persist sessions/preferences and short restore cooldowns.     |
| `alarms`   | Wake the service worker for debounced snapshots and recovery. |

No host permissions, content scripts, cookies, analytics, remote fonts, remote favicons, or external services. Clipboard permissions are optional and requested only through the relevant feature controls. Preview tiles are derived locally from domain initials. Only HTTP(S) URLs without embedded username/password are saved. Internal browser pages, file URLs and incognito windows are excluded. HTTP(S) URLs can still contain sensitive query tokens; export warnings explain this.

## Manual release checks (both browsers)

1. Load the correct unpacked build; verify icon and no extension errors.
2. Open two normal windows with several HTTP(S) tabs. Pin one; move tabs. Open an incognito window separately.
3. Save current window and all windows with custom names. Confirm counts, ordered details, timestamps and exclusion of private/internal tabs. Original tabs must remain open.
4. Restart the browser and confirm sessions persist. Restore all in new windows, then one selected tab, then current-window mode. Confirm pins, grouping and order. Rapid double-restore should show a cooldown message. Delete nothing on restore.
5. Wait 35 seconds after a tab change; verify a new automatic backup. No further change should not create another identical snapshot. Set retention to 2; make three separated changes and verify only the newest two non-favorites remain. Favorite a backup and save a manual session; both must survive cleanup. Turn backups off and verify changes add none.
6. Rename, favorite, search by title/URL, sort, inspect details, delete with confirmation, and undo. Open popup and dashboard together and save from both to check persistence.
7. Export JSON, import it, and verify copies with new IDs. Try malformed JSON, an unsupported schema and a `javascript:` URL: each must reject the entire import. Repeat export/import with automatic snapshots.
8. Set Arabic: verify RTL, translated feedback and readable URLs. Set English: verify LTR. Test light, dark and system themes, narrow layout, keyboard focus, Escape and dialog focus trapping.
9. Check failure feedback with unavailable storage or a full quota in a disposable profile. Confirm prior sessions remain. Inspect the worker console for automatic backup errors.
10. Review `VALIDATION.md` for checks actually completed in this environment. Do not infer store acceptance from local builds/tests.

See `PRIVACY.md`, `STORE-LISTING.md`, and `CHANGELOG.md` for distribution material.
