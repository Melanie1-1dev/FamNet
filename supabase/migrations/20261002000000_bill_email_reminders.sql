-- Bill reminder storage. Every client row is scoped to its Supabase Auth user.
create table if not exists public.bills (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null,
  amount numeric(12,2) not null default 0 check (amount >= 0),
  currency text not null default 'RWF',
  due_date date not null,
  status text not null default 'upcoming',
  category text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists bills_user_due_date_idx on public.bills(user_id,due_date) where status <> 'paid';
alter table public.bills enable row level security;
create policy "Users manage their own bills" on public.bills for all to authenticated
  using (auth.uid() = user_id) with check (auth.uid() = user_id);

create table if not exists public.bill_reminder_settings (
  user_id uuid primary key references auth.users(id) on delete cascade,
  recipient_email text not null,
  enabled boolean not null default true,
  timezone text not null default 'Africa/Cairo',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint recipient_email_format check (recipient_email ~* '^[^@[:space:]]+@[^@[:space:]]+\.[^@[:space:]]+$')
);
alter table public.bill_reminder_settings enable row level security;
create policy "Users manage their own reminder settings" on public.bill_reminder_settings for all to authenticated
  using (auth.uid() = user_id) with check (auth.uid() = user_id);

create table if not exists public.bill_reminder_deliveries (
  user_id uuid not null references auth.users(id) on delete cascade,
  reminder_date date not null,
  sent_at timestamptz not null default now(),
  primary key(user_id,reminder_date)
);
alter table public.bill_reminder_deliveries enable row level security;
-- No client policies: only the scheduled service role accesses this send ledger.

create or replace function public.set_updated_at() returns trigger language plpgsql as $$
begin new.updated_at = now(); return new; end;
$$;
create trigger bills_set_updated_at before update on public.bills
  for each row execute function public.set_updated_at();
create trigger bill_reminder_settings_set_updated_at before update on public.bill_reminder_settings
  for each row execute function public.set_updated_at();
