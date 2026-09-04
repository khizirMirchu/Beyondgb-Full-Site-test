# BeyondGB Steps 61–62 v2

## Step 61 — Location-aware Smart Trip Cost Calculator
- Destination / place and Tour / Journey dropdown using live Admin-managed CMS data.
- Destination starting price can be configured from Admin → Destinations.
- Tour starting price continues to use the existing tour pricing.
- Accommodation, transport, activities, travelers and days are calculated without online payment.
- Existing database is migrated safely only when the new destination price columns are missing.

## Step 62 — More interactive free map experience
- Leaflet + OpenStreetMap remains the map renderer.
- Nominatim (listed in public-apis) powers place search/geocoding through a server proxy.
- OSRM powers free road routing through a server proxy.
- Search places, zoom/scale, browser location, fullscreen, route line, distance and ETA.
- No paid Google Maps API key is required.

### Important API note
The public-apis repository is a directory of public APIs; it does not issue API keys. Some listed providers such as Mapbox/openrouteservice require the site owner to create a key. This version deliberately uses no-key public services for the requested free setup. Public OSM/Nominatim services have fair-use limits, so the backend proxies and rate-limits requests.

### Database
Do NOT include `backend/beyondgb.db`, `backend/beyondgb.db-wal`, or `backend/beyondgb.db-shm` in deployment ZIPs. Keep the master DB separate.
