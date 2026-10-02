# Supabase bill reminders

This adds the secure bill tables and scheduled email function. FamNest still stores its app data and accounts in browser localStorage, so the backend cannot yet see existing bills. Supabase Auth, bill CRUD sync, and a one-time import from the current browser are still required before scheduled emails can work.

## Provisioning

1. Create a Supabase project. Copy its Project URL and publishable/anon key into root `.env` using `.env.example`. Never place the service role key in a `VITE_` variable.
2. Apply the migration using `supabase db push` or the Supabase SQL editor.
3. Enable `pg_cron`, `pg_net`, and Vault in Supabase Integrations. Save the following secrets in Vault:

```sql
select vault.create_secret('https://YOUR_PROJECT_REF.supabase.co', 'project_url');
select vault.create_secret('YOUR_SERVICE_ROLE_KEY', 'service_role_key');
```

4. Deploy the function and set server secrets:

```sh
supabase functions deploy daily-bill-reminders
supabase secrets set RESEND_API_KEY=re_... REMINDER_FROM_EMAIL="FamNest <bills@your-verified-domain.example>"
```

Use an address on a verified sender domain in production. The Resend key and sender remain server-side in Supabase secrets.

5. Schedule an hourly check. It sends at most one digest per user per local calendar day, at the first hourly run after 9:00 AM in their timezone. Hourly checks handle Cairo daylight saving changes; the delivery table prevents duplicates.

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

## Data requirements

The app must authenticate people through Supabase Auth, keep their bills in `public.bills` with `user_id = auth.uid()`, and create/update `public.bill_reminder_settings` with their recipient email and timezone (`Africa/Cairo` default). RLS limits client access to each user's rows. The scheduled function uses the service role on the server and includes unpaid bills due today through three days ahead. Existing local accounts and bills are not migrated by this scaffold.
