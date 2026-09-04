# BeyondGB UI Fix — Explore, Gallery & Assistant

## Changes
- Ask BeyondGB close button now explicitly minimizes the panel and restores the launcher.
- Homepage Explore the Region cards are interactive with destination info, best-time/highlight chips, View destination and Plan this trip actions.
- Gallery redesigned with a Pexels-inspired masonry browsing layout.
- Gallery photos open in the same-page lightbox, never a new tab.
- Lightbox includes previous/next navigation, keyboard arrows, Escape close, and photo counter.
- Removed the old global gallery handler in `js/app.js` that opened images in a new tab.

No database is included. Keep the master `backend/beyondgb.db` separate and do not copy SQLite `-wal`/`-shm` sidecars.
