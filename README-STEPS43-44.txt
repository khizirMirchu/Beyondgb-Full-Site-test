BeyondGB — Steps 43–44

STEP 43 — Advanced Public Discovery
- Search journeys by title, destination, description, duration or difficulty.
- Filter journeys by difficulty.
- Search destinations by name, region, description, highlights or season.
- Clear filters and live result counts.
- Mobile-friendly controls.
- Existing cards, See more/See less and links preserved.

STEP 44 — Contextual Destination Journeys
- Destination detail pages now show matching published journeys.
- Up to three related journeys are shown.
- Uses existing tour/destination data; no new database table is required.
- Existing map, description and highlights behavior preserved.

IMPORTANT
- backend/beyondgb.db is intentionally NOT included.
- Keep your master database separate.
- No database migration is required for Steps 43–44.

Critical tests:
1. Journeys page: search a known destination/title and use difficulty filter; results should update and clear correctly.
2. Destinations page: search a known destination; only matching cards should remain.
3. Open a destination that has a tour using the same destination name; "Journeys for this destination" should show the matching tour and its Explore journey link should work.
4. Check mobile: search/filter controls should fit without horizontal overflow.
