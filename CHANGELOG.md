# Changelog

## 1.1.0

Added optional local clipboard history for text and PNG/JPEG/WebP images, with paste/type/upload, clipboard capture, previews, copy again, pinning, search, downloads, confirmation for deletion and clearing, configurable retention, and a bounded IndexedDB store separate from sessions. Automatic monitoring is off by default, requests optional permissions, uses an offscreen clipboard document, pauses on request, and resumes after browser startup. Added bilingual privacy disclosures and tests. Existing sessions and settings remain compatible.

## 1.0.2

Added expandable session previews with individual-page restoration, quick save, popup search, collection filter chips, grid/list switching, clickable metrics, keyboard shortcuts, Enter-to-save, action progress indicators, save highlights and deletion undo in feedback. Canonical target selection now prevents duplicate restoration while allowing different tabs to open consecutively. Motion respects reduced-motion preferences. Existing sessions and settings remain compatible.

## 1.0.1

Refreshed the popup, dashboard, and settings. Added consistent Lucide icons, a compact independently scrolling recent-session list, persistent popup actions, an updated navigation sidebar, clearer session cards, visible backup status, and refined Arabic/English light/dark styling. Storage schema and session data remain compatible with 1.0.0.

## 1.0.0

Initial implementation: Chrome/Edge Manifest V3, local session capture and restoration, window grouping and pins, durable alarm-based backups, retention, favorites, search/sort, selected restore, deletion undo, validated additive JSON import/export, Arabic/English, themes, official logo assets, popup/dashboard/settings, tests and distribution packaging.
