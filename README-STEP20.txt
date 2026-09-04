BEYONDGB — STEP 20
DYNAMIC HOMEPAGE

Base:
BeyondGB-step19-remade-from-step18.zip

Added:
- Dynamic latest journeys section on the homepage.
- Homepage fetches tours from /api/tours.
- Only active/public tours are shown.
- Up to 3 newest journeys are rendered automatically.
- Every homepage journey card links to pages/tour.html?slug=...
- The NEW JOURNEY announcement now links directly to the newest dynamic tour.
- Announcement remains directly after the main hero ("Go beyond the ordinary"), not at the top.
- Responsive styling for desktop, tablet and mobile.
- Existing admin/authentication code is preserved.
- Existing database is not included in this ZIP and must be preserved.

Changed:
- index.html
- js/homepage-dynamic.js (new)
- js/announcement.js (compatibility shim)
- css/styles.css
- README-STEP20.txt (this file)

Database:
DO NOT replace backend/beyondgb.db.
The ZIP intentionally does not contain beyondgb.db.

Run:
cd backend
npm install
npm start

Then open:
http://localhost:3000/

Test:
1. Log in to Admin Portal with the existing admin account.
2. Add a tour or edit a tour and make it Active.
3. Open/refresh the homepage.
4. Confirm the latest journey appears in "Latest Journeys".
5. Confirm the NEW JOURNEY stripe appears directly below the hero.
6. Click the stripe and confirm it opens pages/tour.html?slug=...
7. Click Explore Journey on a homepage card and confirm the correct tour detail page opens.
8. On Mac, use Cmd + Shift + R for a hard refresh.

No admin login/authentication files were intentionally changed.
