# BeyondGB Steps 55–56

## Step 55 — Free Live Destination Weather
Destination detail pages show current weather using Open-Meteo. No API key or paid subscription is required. Known BeyondGB destinations use fixed coordinates; other slugs use free geocoding as a fallback.

## Step 56 — Installable PWA
Added a web app manifest and service worker. The app shell can be installed on supported browsers. The service worker caches same-origin shell/assets and falls back to cached pages when appropriate. API requests are not intentionally cached.

Database is intentionally excluded from this package. Keep the master backend/beyondgb.db separate.
