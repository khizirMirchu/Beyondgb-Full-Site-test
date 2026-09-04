STEP 8 - EXTERNAL IMAGE URL SUPPORT

Tour and Gallery image fields now accept external HTTP/HTTPS image URLs,
including CDN URLs that do not end in .jpg/.png/.webp.

Important: a Pexels PHOTO PAGE URL (https://www.pexels.com/photo/...) is not
an image file and cannot be used as an <img> source. Use the direct image/CDN
URL provided by the image host.

The ZIP intentionally contains no backend/beyondgb.db. Copy your current
database into backend/ before starting the server.
