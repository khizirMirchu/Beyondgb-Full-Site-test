BEYONDGB — STEPS 23–25 FIXED

This package fixes the public dynamic-content problems found in the previous Steps 23–25 build.

FIXES
1. Destinations:
   - Fixed the public destinations page selector. The page used #publicDestinationsGrid while the JS only looked for #destinationGrid.
   - Public destination API now uses the real database field `active`.
   - Homepage destinations now load from the existing destinations table.
   - Region is returned as `location` for frontend compatibility.

2. Tours / Journeys:
   - Public tour detail now uses the real database field `active`, not the nonexistent `published` field.
   - Tour detail now maps `destination` to the frontend's `location` field.
   - Removed the old duplicate tours.js from pages/tours.html so two scripts no longer fight over the same tour grid.
   - Fixed the public tours JS selector to support #publicToursGrid.

3. New Journey announcement:
   - The homepage announcement now loads the newest active tour.
   - Clicking it goes directly to pages/tour.html?slug=<real-tour-slug>.
   - It no longer sends users to an invalid/empty journey.

4. Homepage:
   - Fixed the homepage dynamic endpoint to match the actual database schema:
     tours/destinations/gallery use `active`;
     testimonials use `published`.
   - Fixed frontend selectors so the existing homepage destination and latest-journey sections can actually be populated.

5. Journal:
   - Added safe `journal` table creation if it does not already exist.
   - Seeds the existing three journal topics only when the table is empty.
   - Fixed the Journal page so its grid is found by journal-public.js.

6. FAQ:
   - Added safe `faq` table creation if it does not already exist.
   - Seeds the existing six FAQ items only when the table is empty.
   - Existing FAQ data is never deleted or replaced.

DATABASE SAFETY
IMPORTANT: This ZIP intentionally does NOT contain backend/beyondgb.db.
Keep your existing backend/beyondgb.db exactly as it is. The database.js changes only create missing tables/columns and seed Journal/FAQ if those tables are empty.

INSTALL / RUN
cd backend
npm install
npm start

Then test:
1. Admin → add/activate a destination → public Destinations page and homepage
2. Admin → add/activate a tour → homepage announcement → click announcement → tour detail
3. Journal page
4. FAQ page

VALIDATION
JavaScript syntax checks passed for the changed backend/frontend files.
A full live server test was not possible in this build environment because npm dependencies such as Express are not installed here; run `npm install` in the project before testing.

NEXT WORK
Do not replace your existing database. This build preserves the project through Steps 23–25. Continue from this fixed package for the next development step.


Step 23–25 follow-up fixes (v3)
- Homepage dynamic destination cards use the correct grid width and fixed image height.
- Homepage destination descriptions are clamped to three lines; full descriptions remain on detail pages.
- Journey detail hero now shows only the journey name.
- Full journey description appears below the journey image.
- Existing backend/beyondgb.db must be preserved.


## Latest follow-up — description layout
- Homepage destination/journey cards now show only a 2-line description preview.
- Public Destinations and Journeys listing cards now show only a 2-line description preview.
- Dynamic Destination detail pages show only the destination name in the hero; the full description appears below the destination image.
- Journey detail pages keep only the journey name in the hero; the full description appears below the journey image.
- Static destination detail pages no longer show their description in the hero; description remains in the content section below the image.
- Existing `backend/beyondgb.db` must be preserved.
