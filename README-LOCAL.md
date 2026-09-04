# BeyondGB — Local Development

## Start the backend

```bash
cd backend
npm install
npm start
```

Then open `http://localhost:3000`.

## Create/update the admin account

```bash
cd backend
npm run create-admin
```

Use a strong password (12+ characters). Never share the password or commit `backend/.env`.

## Admin

Open `http://localhost:3000/admin` after creating the admin account.


## Step 6 — Public tours
The public Journeys page loads active tours from `/api/tours`. Keep your existing `backend/beyondgb.db` when updating the project so your admin account and data remain available.
