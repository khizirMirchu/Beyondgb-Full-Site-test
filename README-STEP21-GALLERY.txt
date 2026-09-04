BeyondGB Step 21 — Gallery Upgrade

Checked Step 20 before this upgrade. Core JS files passed Node syntax checks and the existing Gallery API/admin system is intact.

Step 20 fix included:
- Homepage image paths no longer incorrectly prepend ../ to root homepage assets.

Step 21 Gallery:
- Dynamic gallery remains connected to the database/admin portal.
- Robust image URL/path handling for remote URLs, /root paths, and assets paths.
- Category filters.
- Full-screen lightbox.
- Previous/next navigation and keyboard controls.
- Featured/active gallery items continue to work.
- Admin gallery preview uses the same URL/path normalization.

IMPORTANT: Keep your existing backend/beyondgb.db. Do NOT replace it.

Run:
cd backend
npm install
npm start

Then open Admin → Gallery and add a test photo. Set Active / visible on website, save, and check pages/gallery.html.
