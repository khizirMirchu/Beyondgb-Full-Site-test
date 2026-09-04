BEYONDGB STEPS 23–25

This package continues from Step 22.

STEP 23 — Homepage dynamic content
- backend/server.js: GET /api/homepage
- Published destinations, tours, testimonials and image gallery can feed matching homepage sections.

STEP 24 — Journal
- backend/server.js: GET /api/journal
- Public journal loader added.
- Supports journal table and fallback blog table.

STEP 25 — FAQ
- backend/server.js: GET /api/faq
- Public FAQ loader added.
- Supports faq table and fallback faqs table.

IMPORTANT:
KEEP your existing backend/beyondgb.db.
Do NOT replace it.
Your existing admin login/database are preserved.

Run:
cd backend
npm install
npm start

Then test each section one at a time.
