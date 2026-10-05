# FamNest bill email reminders

## What is already configured

- Supabase Auth is used when the root `.env` contains the `VITE_SUPABASE_*` values.
- Bill records and reminder preferences are stored in Supabase with row-level security.
- The migration `migrations/20261002000000_bill_email_reminders.sql` has been run manually in the hosted SQL Editor.
- Every new Supabase Auth account gets reminder settings for its own account email. Each user can pause reminders in FamNest Settings.

Email delivery still requires the Resend provider, the deployed Edge Function, and the database schedule below.

## Optional: Google sign-in

Google sign-in needs a Google OAuth **Web application** client ID and a matching client ID/secret configured in Supabase **Authentication → Providers → Google**. Add the app's local and deployed origins in Google Cloud, plus your Supabase Auth callback URL (`https://YOUR_PROJECT_REF.supabase.co/auth/v1/callback`) as an authorized redirect URI. Put the Web client ID in the root `.env` as `VITE_GOOGLE_CLIENT_ID=...`, then restart the Vite dev server. Keep the Google client secret only in Supabase Auth provider settings; never put it in `.env` or client code. Until this is configured, the Google option is shown as unavailable and email/password sign-in remains available.

## 1. Configure Resend

Create a Resend account, verify a sender domain, and create an API key. In the Supabase Dashboard, open **Edge Functions → Secrets** and add:

- `RESEND_API_KEY`: your Resend API key
- `REMINDER_FROM_EMAIL`: a sender on your verified domain, for example `FamNest <bills@example.com>`

Keep these values out of the browser `.env`, source code, and Git. Supabase's built-in secret API key is read by the function runtime and must not be copied into an app variable.

## 2. Deploy the Edge Function

In the Supabase Dashboard, open **Edge Functions → Deploy a new function → Via Editor**. Name it `daily-bill-reminders`, replace the starter code with the contents of `functions/daily-bill-reminders/index.ts`, then deploy it. In the deployed function's settings/details, turn **Verify JWT** off; the handler checks the secret key itself. The Dashboard editor can deploy without a local CLI; use the CLI if you prefer versioned source deployment.

CLI alternative, from the project root, after installing the Supabase CLI and signing in:

```powershell
npx supabase login
npx supabase link --project-ref YOUR_PROJECT_REF
npx supabase functions deploy daily-bill-reminders
```

The function reads the Supabase project URL and secret API key from Supabase's injected Edge Function environment variables. It reads the Resend values from the project secrets above. It sends at most one digest per user per local calendar day, after 9:00 AM in that user's timezone (currently defaulted to `Africa/Cairo`), and only when an unpaid bill is due today through three days ahead.

## 3. Create the daily schedule

In the SQL Editor, create these two Vault secrets once, replacing the placeholders with your project URL and the project's **default secret API key** from **Settings → API Keys**:

```sql
select vault.create_secret('https://YOUR_PROJECT_REF.supabase.co', 'project_url');
select vault.create_secret('YOUR_DEFAULT_SUPABASE_SECRET_API_KEY', 'edge_function_key');
```

Never use the publishable key in Vault for this job, and do not put the secret key in `.env` or share it in chat. Then open `schedule-daily-bill-reminders.sql`, paste its contents in a new SQL Editor query, and run it. It enables `pg_cron` and `pg_net`, replaces any existing job with the same name, and schedules an hourly check. The function itself sends no more than one email per day per user.

If Supabase reports that the `vault` schema is missing, enable Vault from the project's Integrations/Database Extensions area first, then retry the two `vault.create_secret` statements.

## 4. Verify delivery

Sign in to the deployed FamNest app with Supabase Auth, enable reminders under **Settings**, and confirm the recipient email shown there is correct. Add an unpaid bill due within the next three days. After the function and schedule are active, check **Edge Functions → Logs** and Resend's email logs if the digest does not arrive. No email is sent on days when that user has no matching bills.

For another person to receive reminders, the app must be deployed and accessible to them; they create their own Supabase Auth account and bills. Their reminder settings and delivery history are isolated by their user ID.

## Browser app configuration

The root `.env` uses `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` (which may contain the Supabase publishable key). These are public client values. Never place a Supabase secret API key or a service-role key in a `VITE_` variable.
