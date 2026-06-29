-- Migration: Add checkin/checkout to lodges and create settings table
alter table public.lodges add column if not exists checkin_time text default '04 Jul, 12:00 PM';
alter table public.lodges add column if not exists checkout_time text default '05 Jul, 11:00 AM';

update public.lodges set checkin_time = '04 Jul, 12:00 PM' where checkin_time is null;
update public.lodges set checkout_time = '05 Jul, 11:00 AM' where checkout_time is null;

create table if not exists public.settings (
  key text primary key,
  value text,
  created_at timestamp with time zone default now(),
  updated_at timestamp with time zone default now()
);
alter table public.settings enable row level security;

create policy "settings_read_all" on public.settings
  for select using (true);

create policy "settings_write_auth" on public.settings
  for all to authenticated using (true) with check (true);

insert into public.settings (key, value) values
  ('couple', 'Dharshan & Amulya'),
  ('date', '05 Jul 2026'),
  ('e_invite_url', 'https://dharshan-amulya-inviation.netlify.app/'),
  ('mandapam_url', 'https://maps.app.goo.gl/gvPnU5aRGoMvWJkH6'),
  ('auto_driver_number', '')
on conflict (key) do nothing;
