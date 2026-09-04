# BeyondGB Steps 47–48

## Step 47 — Availability-aware journey discovery
Public journey cards now show the next upcoming availability date and seat status when an availability record exists. The public tour API supplies the next date without changing the database schema.

## Step 48 — Saved journeys / shortlist
Visitors can save journeys without an account. Saved journeys are stored locally in the browser, can be filtered from the Journeys page, and can also be saved from an individual Journey page.

## Database
`backend/beyondgb.db` is intentionally excluded. Keep the user's master database separate. No database migration is required for these steps.
