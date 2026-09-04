# BeyondGB — Local Development

## Easiest way (VS Code + Live Server)

1. Install Visual Studio Code.
2. Open the **BeyondGB** folder itself (the folder containing `index.html`).
3. Install the VS Code extension **Live Server** by Ritwick Dey.
4. Open `index.html`.
5. Right-click inside `index.html`.
6. Choose **Open with Live Server**.
7. Your browser should open the site.

The project uses root-relative paths such as `/styles.css` and `/assets/...`, so Live Server should be started with the **BeyondGB folder as the workspace root**.

## Backend

The backend is kept separately in `backend/`. It is not required just to preview the interface with Live Server.

When we reach Step 3, we will run the backend locally and connect the enquiry form to it.

## Important

Do not upload private credentials or the `data` folder to a public repository.

## DATABASE PERSISTENCE — IMPORTANT

The `backend/beyondgb.db` included in this package is the authoritative project database.
Do not replace it with an empty database when installing future website updates. Always back it up first.
Future development updates should preserve this database and use non-destructive migrations only.
