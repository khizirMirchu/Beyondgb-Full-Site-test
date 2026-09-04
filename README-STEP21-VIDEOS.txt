STEP 21 — GALLERY + SEPARATE VIDEOS

Keep your existing backend/beyondgb.db.

Images remain in Gallery.
Videos have their own dedicated public Videos page and separate media type.

Run:
cd backend
npm install
npm start

Admin:
Gallery -> choose Image or Video.
For Video, enter a direct video URL.

Public:
Gallery = images
Videos = videos

The database migration adds media_type and video_url automatically.
