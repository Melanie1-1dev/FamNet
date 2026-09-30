# FamNest

Family management app: React 19 + Vite + Tailwind CSS 3. It runs entirely in the browser with no backend and no account or API keys.

## Run

```
npm install
npm run dev
```

## How data works

- All data (users, families, tasks, finances, ...) is stored in the browser's `localStorage`, via `src/api/db.js`.
- Data is per browser and per device. Clearing site data erases it. It is not synced between devices.
- The first account created on a browser is the admin. A new family is created with demo data on first sign-in (Settings has a reset option).
- Passwords are hashed (SHA-256) but this is a local demo-grade store, not a secure server. Do not use real sensitive passwords.
- Password reset is done on the same device (no email is sent).
- Document uploads are stored in the browser as data URLs (maximum 2 MB each).

## Structure

- `src/api/db.js` - local data layer (entities, auth, file storage)
- `src/lib/pages/` - all pages (finance pages in `finance/`)
- `src/Components/` - layout, shared components, `ui/` (shadcn-style primitives)
- `src/lib/FamilyContext.jsx` - loads/creates the family and seeds demo data
- `src/lib/useFamilyData.jsx` - loads all family entities
