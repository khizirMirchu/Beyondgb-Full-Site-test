# BeyondGB — Steps 35–36

## Step 35 — Production Preparation

- Environment variables are separated from source code.
- Production can use a separate persistent SQLite database via `BEYONDGB_DB_PATH`.
- The local `backend/beyondgb.db` remains the default when no environment variable is supplied.
- Production-aware proxy configuration is available through `TRUST_PROXY`.
- Added `/api/health` for deployment health checks.
- Added a production-safe centralized error response.
- Added graceful shutdown handling for SIGTERM/SIGINT.
- Existing security headers, authentication and rate limiting remain enabled.

## Step 36 — Domain + Hosting Preparation

The application is now hosting-ready, but actual domain/DNS/SSL deployment requires the hosting provider and domain account to be chosen. Do not point the domain yet until the production environment is configured.

Recommended deployment order:
1. Choose hosting with persistent storage for SQLite.
2. Create production environment variables from `backend/.env.example`.
3. Use a dedicated production database path.
4. Start the backend with `npm start`.
5. Confirm `/api/health` returns `{ "success": true, "status": "ok" }`.
6. Only then connect `beyondgb.com`, DNS and HTTPS/SSL.
