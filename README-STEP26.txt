BeyondGB — Step 26: Site Settings

Added a central admin Settings tab backed by the existing database.

Settings include:
- Company information
- WhatsApp
- Email
- Phone
- Social media
- Address
- Opening/contact information
- Logo
- Basic SEO defaults

Public /api/settings exposes only website-facing settings. Admin settings require the existing admin session.

IMPORTANT: Keep the existing backend/beyondgb.db. This project ZIP does not include or replace it.

The public app now applies contact/logo/company/address settings across the existing shared website elements. Detailed per-page SEO remains Step 29.


Long-content rule: dynamic/public descriptions use controlled previews with a See more/See less control; detail-page descriptions and highlights also use controlled expansion when they become long. This is the project standard going forward for long text sections.
