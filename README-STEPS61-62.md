# BeyondGB — Steps 61–62

## Step 61 — Smart Trip Cost Calculator
- Added a subscription-free estimate calculator to journey detail pages.
- Uses each journey's numeric starting price (`price_amount`) when available.
- Customer can choose travelers, days, accommodation, transport and optional activities.
- Calculator shows a clear line-by-line estimate and final total.
- Admin can configure optional calculator rates from **Admin → Settings → Trip cost calculator**.
- No online payment is added; the result is explicitly an estimate and links back to Plan Your Trip.

## Step 62 — Interactive Journey & Destination Maps
- Added free OpenStreetMap + Leaflet interactive maps.
- Journey maps use known Gilgit-Baltistan locations found in the journey itinerary and draw a route when multiple locations are available.
- Destination pages show an interactive map for supported destinations.
- Existing OpenStreetMap external link remains available as a fallback.
- No Google Maps API key or paid mapping subscription is required.

## Database safety
- `backend/beyondgb.db` is intentionally **NOT included** in this ZIP.
- Do not replace your master database with a blank/new database.
- Copy your own master `backend/beyondgb.db` into the `backend/` folder before running the project.
- Database migrations only add calculator settings and preserve existing records.

## Essential testing
1. Copy your master `backend/beyondgb.db` into `backend/`.
2. Start the backend and confirm Admin login and existing tours/destinations are still present.
3. Open a journey detail page and test the calculator with different traveler/day/options values.
4. In Admin → Settings, set one or more calculator rates, save, then refresh a journey page and confirm the estimate updates.
5. Open a journey detail page with itinerary data and confirm the interactive map loads and markers/route appear.
6. Open a destination detail page and confirm its interactive map loads.
7. Check mobile layout and confirm the calculator/map stay inside the page without horizontal overflow.


## Calculator pricing UI clarification
The Settings → Trip cost calculator section now uses one Tour / Journey selector above the existing rate fields. Select a tour, enter its starting price and add-on rates, then Save settings. The separate Tour pricing categories list was removed. The public calculator design remains unchanged.
