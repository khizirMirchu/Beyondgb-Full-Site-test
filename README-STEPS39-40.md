# BeyondGB Steps 39–40

## Step 39 — Subscription-free location maps
- Added OpenStreetMap destination links.
- No Google Maps API key or paid API subscription is required.
- Destination detail pages can open the selected destination directly in OpenStreetMap.

## Step 40 — Smart Travel Assistant + design alignment
- Added a lightweight, subscription-free BeyondGB Guide.
- It searches the site's published FAQs, destinations and journeys and answers from that content.
- This is intentionally NOT a paid generative-AI API integration. A true AI chatbot would require an external AI model/API, secure server-side API key handling, usage limits, prompt/instruction design, hallucination controls, and keeping its knowledge synchronized with the CMS.
- Added global typography/wrapping/alignment improvements to reduce text misalignment and overflow.

## Database
Keep `backend/beyondgb.db` as the master database. Do not replace it with an empty database.
