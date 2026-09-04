# BeyondGB Backend

Requires Node.js 22 or newer.

This version uses Node's built-in `node:sqlite`, so it does **not** require `better-sqlite3`, native compilation, Xcode, or Apple Command Line Tools.

## Local setup

```bash
cd backend
npm install
npm start
```

Create/update the admin account:

```bash
npm run create-admin
```

The SQLite database is stored in `backend/beyondgb.db`.

Keep `backend/.env` private and never commit it to a public repository.


## Updating the project without losing admin data

The SQLite database is intentionally not included in update ZIPs. Before replacing the project, keep a backup of your current `backend/beyondgb.db`. After extracting a new version, copy your saved `beyondgb.db` into the new `backend/` folder. Then run `npm install` if dependencies changed and `npm start`. Do not run `npm run create-admin` unless the database is genuinely new and you need to create the first admin account.
