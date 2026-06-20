-- Enable UUID extension
create extension if not exists "uuid-ossp";

-- 1. Lodges table
create table if not exists public.lodges (
  id uuid primary key default uuid_generate_v4(),
  name text not null,
  address text,
  maps_link text,
  created_at timestamp with time zone default now(),
  updated_at timestamp with time zone default now()
);
alter table public.lodges enable row level security;

-- 2. Rooms table
create table if not exists public.rooms (
  id uuid primary key default uuid_generate_v4(),
  lodge_id uuid not null references public.lodges(id) on delete cascade,
  room_no text not null,
  room_type text,
  bed_config text not null,
  floor text,
  category text check (category in ('TRT', 'MPT')),
  extra_bed boolean default false,
  notes text,
  created_at timestamp with time zone default now(),
  updated_at timestamp with time zone default now(),
  unique(lodge_id, room_no)
);
alter table public.rooms enable row level security;

-- 3. Guests table
create table if not exists public.guests (
  id uuid primary key default uuid_generate_v4(),
  name text not null,
  phone text,
  party_size integer,
  hometown text,
  side text check (side in ('bride', 'groom', 'both')),
  notes text,
  created_at timestamp with time zone default now(),
  updated_at timestamp with time zone default now()
);
alter table public.guests enable row level security;

-- 4. Room-Guests junction table
create table if not exists public.room_guests (
  id uuid primary key default uuid_generate_v4(),
  room_id uuid not null references public.rooms(id) on delete cascade,
  guest_id uuid not null references public.guests(id) on delete cascade,
  keys_given text default 'not_given' check (keys_given in ('not_given', 'given', 'collected')),
  created_at timestamp with time zone default now(),
  updated_at timestamp with time zone default now(),
  unique(room_id, guest_id)
);
alter table public.room_guests enable row level security;

-- 5. Users table (extends auth.users)
create table if not exists public.users (
  id uuid primary key references auth.users(id) on delete cascade,
  email text not null unique,
  role text default 'coordinator' check (role in ('admin', 'coordinator')),
  created_at timestamp with time zone default now(),
  updated_at timestamp with time zone default now()
);
alter table public.users enable row level security;

-- 6. Room Access table (per-room access control)
create table if not exists public.room_access (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid not null references public.users(id) on delete cascade,
  room_id uuid not null references public.rooms(id) on delete cascade,
  created_at timestamp with time zone default now(),
  unique(user_id, room_id)
);
alter table public.room_access enable row level security;

-- RLS POLICIES

-- Lodges: admins can do anything, coordinators can view lodges they have room access in
create policy "lodges_admin_all" on public.lodges
  for all to authenticated
  using (
    exists(select 1 from public.users where id = auth.uid() and role = 'admin')
  )
  with check (
    exists(select 1 from public.users where id = auth.uid() and role = 'admin')
  );

create policy "lodges_coordinators_view" on public.lodges
  for select to authenticated
  using (
    exists(
      select 1 from public.room_access ra
      join public.rooms r on ra.room_id = r.id
      where ra.user_id = auth.uid() and r.lodge_id = lodges.id
    )
  );

-- Rooms: admins can do anything, coordinators can only access assigned rooms
create policy "rooms_admin_all" on public.rooms
  for all to authenticated
  using (
    exists(select 1 from public.users where id = auth.uid() and role = 'admin')
  )
  with check (
    exists(select 1 from public.users where id = auth.uid() and role = 'admin')
  );

create policy "rooms_coordinators_select" on public.rooms
  for select to authenticated
  using (
    exists(select 1 from public.room_access where user_id = auth.uid() and room_id = rooms.id)
  );

create policy "rooms_coordinators_update" on public.rooms
  for update to authenticated
  using (
    exists(select 1 from public.room_access where user_id = auth.uid() and room_id = rooms.id)
  )
  with check (
    exists(select 1 from public.room_access where user_id = auth.uid() and room_id = rooms.id)
  );

create policy "rooms_coordinators_insert" on public.rooms
  for insert to authenticated
  with check (
    exists(select 1 from public.users where id = auth.uid() and role = 'admin')
  );

-- Guests: admins can do anything, coordinators can view/edit guests in their rooms
create policy "guests_admin_all" on public.guests
  for all to authenticated
  using (
    exists(select 1 from public.users where id = auth.uid() and role = 'admin')
  )
  with check (
    exists(select 1 from public.users where id = auth.uid() and role = 'admin')
  );

create policy "guests_coordinators_select" on public.guests
  for select to authenticated
  using (
    exists(
      select 1 from public.room_guests rg
      join public.room_access ra on rg.room_id = ra.room_id
      where rg.guest_id = guests.id and ra.user_id = auth.uid()
    )
  );

create policy "guests_coordinators_update" on public.guests
  for update to authenticated
  using (
    exists(
      select 1 from public.room_guests rg
      join public.room_access ra on rg.room_id = ra.room_id
      where rg.guest_id = guests.id and ra.user_id = auth.uid()
    )
  )
  with check (
    exists(
      select 1 from public.room_guests rg
      join public.room_access ra on rg.room_id = ra.room_id
      where rg.guest_id = guests.id and ra.user_id = auth.uid()
    )
  );

-- Room-Guests: admins can do anything, coordinators can manage in their rooms
create policy "room_guests_admin_all" on public.room_guests
  for all to authenticated
  using (
    exists(select 1 from public.users where id = auth.uid() and role = 'admin')
  )
  with check (
    exists(select 1 from public.users where id = auth.uid() and role = 'admin')
  );

create policy "room_guests_coordinators_select" on public.room_guests
  for select to authenticated
  using (
    exists(
      select 1 from public.room_access ra
      where ra.user_id = auth.uid() and ra.room_id = room_guests.room_id
    )
  );

create policy "room_guests_coordinators_update" on public.room_guests
  for update to authenticated
  using (
    exists(
      select 1 from public.room_access ra
      where ra.user_id = auth.uid() and ra.room_id = room_guests.room_id
    )
  )
  with check (
    exists(
      select 1 from public.room_access ra
      where ra.user_id = auth.uid() and ra.room_id = room_guests.room_id
    )
  );

-- Users: view own profile, admins can manage all
create policy "users_view_own" on public.users
  for select to authenticated
  using (id = auth.uid() or exists(select 1 from public.users where id = auth.uid() and role = 'admin'));

create policy "users_admin_all" on public.users
  for all to authenticated
  using (
    exists(select 1 from public.users where id = auth.uid() and role = 'admin')
  )
  with check (
    exists(select 1 from public.users where id = auth.uid() and role = 'admin')
  );

-- Room Access: admins can manage, coordinators can view their own
create policy "room_access_admin_all" on public.room_access
  for all to authenticated
  using (
    exists(select 1 from public.users where id = auth.uid() and role = 'admin')
  )
  with check (
    exists(select 1 from public.users where id = auth.uid() and role = 'admin')
  );

create policy "room_access_coordinators_view" on public.room_access
  for select to authenticated
  using (user_id = auth.uid());
