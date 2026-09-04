# BeyondGB — Steps 37 + 38

## Step 37 — Final SEO & Google
- `/robots.txt` is served by the backend and points to `/sitemap.xml`.
- `/sitemap.xml` is generated from the current active destinations and tours plus core public pages.
- Canonical/Open Graph/structured-data support remains in `js/seo-performance.js`.
- Google Analytics 4 is optional: configure a real `G-XXXXXXXXXX` ID using a `ga-measurement-id` meta tag or `data-ga-measurement-id` on `<html>`. No fake ID is included.
- Google Search Console/Bing verification and sitemap submission must be performed after the real domain is connected.

## Step 38 — Final QA
Run `node scripts/qa-check.js` from the project root. Then start the backend and verify the health endpoint, public pages, admin login, forms, and database persistence.

## Production safety
Do not copy/replace the user's existing `backend/beyondgb.db` during local updates. Production should use its own configured `BEYONDGB_DB_PATH`.
