STEP 7 — GALLERY MANAGEMENT

This version adds:
- Admin Dashboard > Gallery
- Add/edit/delete gallery photos
- Active/hidden control
- Featured flag
- Category and caption
- Public /pages/gallery.html loads active items from /api/gallery

DATABASE:
The ZIP intentionally does NOT contain beyondgb.db.
Copy your current backend/beyondgb.db into backend/ before running.
database.js will create the gallery table automatically if it does not exist.

IMAGE PATHS:
For local project images, use /assets/images/your-photo.jpg or assets/images/your-photo.jpg.
External direct image URLs are also accepted, but a normal Pexels page URL is not an image file.

START:
cd backend
npm install
npm start

Do not run create-admin when using your existing database.
