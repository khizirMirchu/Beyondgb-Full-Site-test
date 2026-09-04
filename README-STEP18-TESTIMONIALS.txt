# BeyondGB — Step 18

Dynamic Testimonials / Reviews system.

## What was added
- Admin > Testimonials tab
- Add, edit, publish/hide and delete reviews
- Customer name, location, rating, optional photo and review text
- Public `/api/testimonials` endpoint
- Dynamic testimonials section on the homepage
- Existing `backend/beyondgb.db` is preserved; database.js automatically adds the `location` column if needed.

## Install / run
Keep your existing backend/beyondgb.db.

    cd backend
    npm install
    npm start

Then open Admin > Testimonials.

Do not delete or replace your existing beyondgb.db.
