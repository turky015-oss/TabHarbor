# TabHarbor 1.0.2 — interactive controls

- **Expand a session:** click its name or focus it and press Enter/Space. The disclosure lists its pages and provides a restore arrow for each one. The selection action opens the existing multi-select dialog.
- **Quick save:** the lightning button saves supported tabs in the current normal window with a date/time name. The regular button retains custom naming. Empty/unsupported windows report feedback without creating an empty session.
- **Find sessions:** open search from the popup toolbar, or press `/`. Dashboard filters switch between all sessions, manual sessions, automatic backups and favorites. Grid/list buttons change the presentation while preserving sessions.
- **Keyboard:** `N` opens the current-window save dialog; Enter confirms its name; Escape closes the dialog or clears/exits search. `/` focuses search. `?` toggles a help panel. Letter shortcuts are ignored while typing in text fields. The header keyboard button also opens the help panel.
- **Feedback:** actions expose a busy state, restore controls spin while pending, new saves receive a brief highlight, and success notifications dismiss after seven seconds. Error feedback remains until dismissed. Deleting a session still requires confirmation; its notification and collection header offer Undo.
- **Metrics:** click a dashboard count card to navigate to its corresponding collection.
- **Motion:** disclosure/notification entrance, button/card hover and save emphasis respect `prefers-reduced-motion`. No continuously animated decoration was added.

The five-second restoration cooldown is applied to the canonical target selection. Restoring another page from the same session is allowed immediately. Repeating the same page or full session rapidly is blocked. Session data and the storage schema remain compatible with earlier versions.

Update an installation loaded from the project's `release/chrome` or `release/edge` directory by pressing Reload on its browser Extensions page. For a ZIP extracted elsewhere, replace the files in that existing directory with the 1.0.2 build, then reload. Avoid uninstalling when retaining saved data.
