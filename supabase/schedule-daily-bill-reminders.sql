-- Before running this file, create these two Supabase Vault secrets once in SQL Editor:
-- select vault.create_secret('https://YOUR_PROJECT_REF.supabase.co', 'project_url');
-- select vault.create_secret('YOUR_DEFAULT_SUPABASE_SECRET_API_KEY', 'edge_function_key');
-- Replace the placeholders above. Never put the secret key in app code or VITE_ variables.

create extension if not exists pg_cron;
create extension if not exists pg_net;

-- Make this safe to rerun without creating duplicate hourly jobs.
select cron.unschedule(jobid)
from cron.job
where jobname = 'daily-bill-reminders';

select cron.schedule('daily-bill-reminders', '0 * * * *', $$
  select net.http_post(
    url := (select decrypted_secret from vault.decrypted_secrets where name = 'project_url') || '/functions/v1/daily-bill-reminders',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'apikey', (select decrypted_secret from vault.decrypted_secrets where name = 'edge_function_key')
    ),
    body := '{}'::jsonb
  );
$$);
