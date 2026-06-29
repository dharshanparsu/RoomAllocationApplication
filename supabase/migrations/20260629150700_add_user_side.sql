-- Migration: Add side column to users table
alter table public.users add column if not exists side text default 'both' check (side in ('bride', 'groom', 'both'));
