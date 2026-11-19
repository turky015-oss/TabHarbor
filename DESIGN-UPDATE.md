# TabHarbor 1.0.1 — interface update

The update improves the installed extension directly. It retains the official logo, local data model, existing saved sessions, permissions and browser-worker behavior.

## Screens reviewed

1. **Toolbar popup — improved.** The previous large cards obscured recent sessions and the dashboard action below the fold. The new popup uses short session rows, a distinct save action, visible backup status, and an independently scrolling list. The dashboard button stays visible even when the list is scrolled to its last item. Current actions still save and restore real tabs.
2. **Dashboard — improved.** The previous glyph icons and repeated card boxes gave every action similar emphasis. The new sidebar uses Lucide icons, current section highlighting and session counts. The main area gives primary actions, metrics, session previews, favorites, restoration, renaming and deletion distinct visual priority. The interface preserves right-to-left direction and readable URLs.
3. **Settings and alternate states — improved.** Light and dark tokens, clearer setting rows and a keyboard-accessible native checkbox styled as a toggle unify settings with the dashboard. Secondary text contrast was increased. Transient notifications clear when the interface language changes so old-language feedback does not remain on screen. English, narrow dashboard and empty-search states were captured too.

## Evidence

Fresh screenshots from the real unpacked extension, using an isolated profile and illustrative session data rather than private browsing history:

- `docs/ui-before/popup-ar.png` and `docs/ui-before/dashboard-ar.png`
- `docs/ui-after/popup-ar.png`, `popup-ar-dark.png`, and `dashboard-ar.png`
- `docs/ui-after/settings-ar-dark.png` and `dashboard-en-dark.png`
- `docs/ui-after/dashboard-en-mobile.png` and `empty-search-en.png`
- `docs/comparison-popup-ar.png` and `comparison-dashboard-ar.png` combine the actual before/after captures.

`node scripts/capture-ui.mjs docs/ui-after` reproduces the final visual checks using the built extension. It also checks that the popup dashboard action remains in the viewport after scrolling the session list, and that the popup and narrow dashboard do not overflow horizontally.

The review checks visible layout and automation-accessible controls. It does not establish full WCAG compliance or screen-reader coverage. No personal browser profile was changed.

## Apply the update

If installed from this project's `release/chrome` or `release/edge` directory, open the browser's Extensions page and click Reload on TabHarbor. An existing installation uses the same local storage and preferences. If installed from an extracted ZIP in another folder, replace that folder's build files with the 1.0.1 package before reloading; do not uninstall the extension.
