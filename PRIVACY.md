# TabHarbor privacy policy — 1.1.0

Effective date: 19 November 2026.

Publisher: turky015-oss. Privacy questions: https://github.com/turky015-oss/TabHarbor/issues (do not include private clipboard contents or credentials in public issues).

TabHarbor stores normal browser tab URLs, titles, order, pinned state, session names, dates, favorites, snapshots and preferences locally in your browser profile. Private/incognito windows and unsupported internal URLs are excluded from tab sessions. No data is transmitted to the publisher or external services. There are no accounts, advertising, analytics, cookies or page-content inspection.

## Optional clipboard history

Clipboard history is disabled by default. You can manually save typed/pasted text and uploaded images. Reading the current clipboard requests optional `clipboardRead` permission. Enabling automatic history requests `clipboardRead` and `offscreen`; copying a saved item again requests `clipboardWrite`. You can pause history in the app or revoke permissions in browser settings. Tab/session features do not require these optional permissions.

Automatic history reads the device clipboard approximately every two seconds while the browser is running. Copied data may originate in other apps, private browsing or password managers. The extension cannot reliably identify or filter sensitive content; it may store passwords, access tokens or other private text if copied while monitoring is enabled. Enable history only when this is appropriate and pause it before sensitive copies. The app explains this before activation.

Text and images are stored unencrypted in a separate local IndexedDB database, with configurable retention and bounded storage. Pinning protects an item from automatic retention cleanup. Deleting a clipboard item or clearing the history is permanent. Clipboard history is excluded from tab-session JSON backups; individual clipboard items can be downloaded at your request. Exported/downloaded files persist until you delete them yourself.

Automatic history cannot recover clipboard contents already replaced before capture and does not operate while the browser is closed. Very rapid clipboard changes may be missed. Image uploads are processed locally and normalized to PNG; no remote image URLs are fetched.

## Data control

You can delete sessions, undo the most recent session deletion, pause backups, change retention, or remove clipboard items. Uninstalling or clearing the extension's storage removes local extension data; device/browser profile backups or management policies may retain separate copies. Downloaded files remain on disk. Protect your browser profile and backups.

Session exports may contain private URLs or access tokens and are not encrypted. Restoring a saved page visits that site normally under its own privacy policy. The publisher cannot recover locally deleted data and does not sell or receive it.

This policy covers the GitHub-distributed 1.1.0 implementation. Before a future browser-store submission, the publisher should review the policy and complete the relevant store data-use disclosures, including optional clipboard access.
