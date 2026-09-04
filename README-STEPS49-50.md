# BeyondGB — Steps 49–50

## Step 49 — Journey Itinerary Management
- Admin can add, edit, and delete day-by-day itinerary items for each journey.
- Each item has day number, title, and details.
- Public journey pages show the itinerary in order.
- Long itinerary details use the site's existing See more / See less behavior where needed.

## Step 50 — Journey Media Gallery
- Admin can add, edit, and delete additional photos for a journey.
- Photos are stored as journey-specific records, separate from the main tour image.
- Public journey pages show the additional journey photos with captions.
- No paid API or subscription is required.

## Database rule
`backend/beyondgb.db` is intentionally NOT included in this ZIP. Keep your existing master database separate. The new tables are created automatically if they do not exist; existing data is preserved.
