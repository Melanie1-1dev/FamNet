# FamNest2

Family management app: React 19 + Vite + Tailwind CSS 3. The UI remains usable browser-only. The appointment notification API is a separate Node service with a development memory repository and a PostgreSQL repository for deployment.

## Run

```
npm install
npm run dev
```

Appointment API development (no PostgreSQL or Resend credentials required): in a second terminal run `npm run api:dev`. It defaults to an in-memory repository and logs appointment email intent through a mock provider. A mock result explicitly reports `delivered: false`; it never sends or claims a real email. The memory repository resets when the API process stops. Appointments still save to the browser calendar if the API is not running.

## Appointment API and deployment setup

1. When preparing the PostgreSQL backend, install its optional driver with `npm install pg`. Create a PostgreSQL database named `famnest2` with your hosting provider, then set `DATABASE_URL` in the server environment. Use a restricted application role and TLS where the host supports it (`PGSSLMODE=require`).
2. Apply the schema migration from the project root: `psql "$env:DATABASE_URL" -v ON_ERROR_STOP=1 -f supabase/migrations/20261015000000_appointments.sql` (PowerShell). The migration is plain PostgreSQL and does not require Supabase.
3. For local database-backed development set `APP_DATA_MODE=postgres` and `DATABASE_URL`; otherwise keep `APP_DATA_MODE=memory`.
4. To enable actual email, verify a sender domain in Resend, create an API key, and set server-only `EMAIL_PROVIDER=resend`, `RESEND_API_KEY`, and `RESEND_FROM_EMAIL`. Never add these as `VITE_` variables or commit them. Without all Resend values, production startup fails closed.
5. Before deployment set `NODE_ENV=production`, `APP_DATA_MODE=postgres`, `DATABASE_URL`, `EMAIL_PROVIDER=resend`, Resend credentials, and `APP_ORIGIN` to the deployed frontend origin. Deploy the API process and frontend; proxy `/api` to the API host or configure an equivalent same-origin gateway. Production refuses the memory repository and mock email provider.

`.env.example` documents the development defaults and later server settings. The existing browser app still uses localStorage for its other family data; this API currently owns appointment records and notification requests only. Add authentication and family-level authorization before exposing appointment API routes to untrusted clients.

## Google sign-in

Set `VITE_GOOGLE_CLIENT_ID` in `.env` to a Google OAuth 2.0 Web client ID, then restart Vite. Add each deployed site origin (and your local development origin) to the client's authorized JavaScript origins in Google Cloud Console. Google sign-in creates or signs into a local account in the current browser; this app has no backend, so accounts and data do not sync across devices.

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
