# Validation — 17 November 2026

Environment: macOS arm64, Node 24.22.1. All checks used disposable browser profiles; no personal browser profile was modified.

## Clipboard history update 1.1.0 — 19 November 2026

Strict production build and **42 unit tests** passed. Clipboard unit coverage checks safe type/PNG validation, Unicode/size accounting, retention, pins and aggregate capacity. A new real clipboard browser suite exercises manual text/image saving, deduplication, background offscreen text and image capture, pause, copy-again content, history persistence and automatic resumption after browser restart, Arabic UI and clear confirmation. The clipboard browser fixture pregrants the optional permissions in a copy of the build for headless automation; the shipped production manifest keeps those permissions optional. Native runtime permission prompts therefore still require the README manual check. The fixture is discarded afterward and original supported clipboard data is restored on cleanup; no personal browser profile is used.

Clipboard limitations and sensitive-data scope are documented in README and the updated privacy draft. No recovery of pre-existing lost clipboard data is claimed. Current screenshots are `docs/clipboard-chrome-ar.png` and `docs/clipboard-edge-ar.png`.

## Interactive update 1.0.2

Strict production build and **30 unit tests** passed. The extra unit coverage verifies that different individual tabs can restore in succession, repeated identical targets are blocked, and a full selection is equivalent to restoring the entire session for duplicate prevention. The browser suite now includes an additional real-extension test for disclosure previews, consecutive individual restoration, favorite filtering, list view, search focus with `/`, `N` and Enter save, quick save, deletion undo, popup search and clearing empty results. The full suite runs in Chrome for Testing and Microsoft Edge. Current visual captures, including open previews and list view, are in `docs/ui-interactive/`.

## Interface update 1.0.1

The refreshed popup, dashboard and settings passed the same 28 unit tests and unpacked-extension integration suite in Chrome for Testing and Microsoft Edge. Additional visual checks covered Arabic RTL, English LTR, dark appearance, a 580px-wide dashboard, an empty search result, and popup footer visibility while scrolling. See `DESIGN-UPDATE.md` for current screenshots, review findings and update instructions.

## Completed

- Strict TypeScript and production Vite/Tailwind build: passed.
- Vitest: **28 tests passed** in 2 files. Covers saving current/all windows, incognito/internal URL exclusion, order and pin preservation, restoration and partial failure counts, restore cooldown, selected restore, rename/favorite/delete/undo, concurrent mutations, storage quota errors, persisted-state reload, future-schema rejection, automatic snapshot deduplication/retention/disabled/empty-window behavior, JSON round trips including unnamed snapshots, unsafe URL and malformed backup rejection, and both document language directions.
- Real unpacked extension integration: passed in **Google Chrome for Testing 159.0.8154.6** and **Microsoft Edge 155.0.4283.45**, using Playwright persistent contexts. Each run loaded the Manifest V3 worker, saved a real HTTPS tab through the dashboard, restored a real tab in a new window, waited for a scheduled automatic snapshot, opened the real popup, downloaded and reimported a JSON backup, switched Arabic RTL / English LTR and dark appearance, closed/relaunched the browser profile, and verified the saved session survived.
- Dependency install audit after updating Vitest: **0 vulnerabilities** reported. Development dependencies are excluded from extension ZIPs.
- Chrome and Edge ZIP contents: manifest, popup/dashboard HTML, bundled JavaScript/CSS, official logo-derived 16/32/48/128 PNG icons. No source tests, build tools, node_modules, or original full-size artwork in the install packages.
- Dashboard and Arabic dark settings screenshots captured from actual browser runs in `docs/`; visually reviewed for layout and language direction.

## Boundaries and release work

Chrome verification used Chrome for Testing, not the user's installed Chrome Stable. Edge verification used the locally installed Edge application. Tests exercised headless desktop browser contexts; the real toolbar button and store installation flow need manual verification. Unit simulations cover quota failures, concurrent writes and partial API failures; browser integration does not deliberately exhaust a real profile's storage. No store publication, signature, approval, crash/power-loss guarantee, screen-reader audit, or exhaustive browser/OS matrix is claimed.

Before publishing, complete the publisher identity/contact and public privacy-policy URL, supply release screenshots in each store's requested sizes, run the README manual release checks on the target stable browser versions, and complete store data-use declarations. A successful local build/test does not establish marketplace approval.
