BeyondGB Steps 33-34

Step 33: Admin Dashboard Finalization
- Added Journal and FAQ management tabs to the admin dashboard.
- Added create/edit/delete and publish/hide controls for Journal and FAQ.
- Kept existing Tours, Destinations, Gallery, Testimonials, Enquiries and Settings areas.

Step 34: Full Website Testing / QA pass
- Checked backend and admin JavaScript syntax with node --check.
- Checked that public/admin API route definitions exist for core CMS areas.
- Checked that backend source/database/env paths remain blocked from static serving.
- Checked that the project contains the main public pages and admin dashboard.

Critical checks before Step 35:
1. Log into /admin and confirm existing data is still present, then open Journal and FAQ tabs.
2. Create one temporary Journal article and FAQ, publish them, and confirm they appear publicly; edit and hide/delete them to confirm persistence and admin controls.
3. Submit one harmless test enquiry and confirm it appears in Admin > Enquiries. This confirms forms, database writes, and the admin session still work together.

IMPORTANT: Keep your existing backend/beyondgb.db. Do not replace it with a database from another copy.
