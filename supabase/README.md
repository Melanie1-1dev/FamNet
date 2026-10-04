# Supabase bill email reminders

FamNest can use Supabase Auth when the two `VITE_SUPABASE_*` values are present in the project root `.env`. In this mode, bill operations use the `public.bills` table; the rest of the app remains in this browser's localStorage. On first sign-in, FamNest reconnects a local family with the same account email and imports that family's local bills once. Without Supabase settings, the existing browser-only mode remains active.

## Set up the project

1. Create a Supabase project. Put its Project URL and publishable (or legacy anon) key in root `.env` based on `.env.example`, then restart Vite. These are public client values. **Never put a service role key in a `VITE_` variable.**
2. Install the Supabase CLI, then link this project and apply the migration:

```sh
supabase login
supabase link --project-ref YOUR_PROJECT_REF
supabase db push
```

This creates row-level security policies for users' bills and reminder settings.
3. In Supabase Auth, set the site's URL and allow the app's `/forgot-password` redirect. If using Google sign-in, enable Google in Supabase Auth and configure the matching Google OAuth client there.
4. Create a Resend account, verify a sender domain, and create an API key. Add the sender and key as Edge Function secrets:

```sh
supabase functions deploy daily-bill-reminders
supabase secrets set RESEND_API_KEY=re_... REMINDER_FROM_EMAIL="FamNest <bills@your-verified-domain.example>"
```

Supabase provides `SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY` to the Edge Function runtime. The Resend key and service role key stay server-side.

## Schedule the email

Enable `pg_cron`, `pg_net`, and Vault under Supabase Integrations. Save the project URL and service role key in Vault:

```sql
select vault.create_secret('https://YOUR_PROJECT_REF.supabase.co', 'project_url');
select vault.create_secret('YOUR_SERVICE_ROLE_KEY', 'service_role_key');
```

Then create the hourly scheduler. The function sends at most one digest per local calendar day, on the first hourly run at or after 9:00 AM in each user's timezone. Cairo is the default; the hourly check adjusts for daylight saving time. It includes unpaid bills due today through three days ahead and sends no email if there are no matching bills.

```sql
create extension if not exists pg_cron;
create extension if not exists pg_net;

select cron.schedule('daily-bill-reminders', '0 * * * *', $$
  select net.http_post(
    url := (select decrypted_secret from vault.decrypted_secrets where name = 'project_url') || '/functions/v1/daily-bill-reminders',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer ' || (select decrypted_secret from vault.decrypted_secrets where name = 'service_role_key'),
      'apikey', (select decrypted_secret from vault.decrypted_secrets where name = 'service_role_key')
    ),
    body := '{}'::jsonb
  );
$$);
```

The schedule isn't active until this SQL is run. After setting `.env`, restart the app and sign in with Supabase Auth. If the existing FamNest account uses a different email from the Supabase account, its local bills won't be automatically associated; add them again while signed into the Supabase account.
