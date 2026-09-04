# BeyondGB Steps 57–58

## Step 57 — Advanced Enquiry CRM
- Enquiries now support internal notes and follow-up dates.
- Enquiries can retain a linked journey when submitted from a journey page.
- Admin enquiry cards expose the status, follow-up date, and private notes without changing the existing dashboard structure.
- Existing enquiry records are preserved through safe SQLite migrations.

## Step 58 — Customer Trip Request Improvements
- Plan Your Trip now collects accommodation and transport preferences.
- Budget, travel date, traveler count, destination/journey, and trip message remain structured.
- Journey enquiries retain the selected journey ID where available.
- Existing validation and spam protection remain enabled.

The database file is intentionally excluded. Keep the project's separate `backend/beyondgb.db` as the master database.
