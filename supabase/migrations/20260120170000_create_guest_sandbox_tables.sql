-- Guest sandbox tables (full parity dataset)
--
-- Notes
-- - Uses guest_session (cookie-backed) instead of user_id
-- - Designed to be cleaned up by cron (see /api/cron/guest-cleanup)
-- - Uses uuid-ossp for UUID generation

create extension if not exists "uuid-ossp";

create table if not exists public.guest_search_criteria (
  id uuid primary key default uuid_generate_v4(),
  guest_session text not null,

  origin_city text,
  origin_state text,
  origin_states text[],
  pickup_distance int default 50,
  pickup_date date,

  dest_city text,
  destination_state text,
  destination_states text[],

  min_rate numeric,
  min_weight int,
  max_weight int default 45000,
  equipment_type text,
  booking_type text,

  active boolean default true,
  is_backhaul boolean default false,

  deleted_at timestamptz,
  created_at timestamptz default now(),

  last_scanned_at timestamptz,
  scan_status text,
  scan_error text,
  last_scan_loads_found int
);

create index if not exists idx_guest_search_criteria_session on public.guest_search_criteria(guest_session);
create index if not exists idx_guest_search_criteria_active on public.guest_search_criteria(active);
create index if not exists idx_guest_search_criteria_deleted_at on public.guest_search_criteria(deleted_at);
create index if not exists idx_guest_search_criteria_origin_states on public.guest_search_criteria using gin(origin_states);
create index if not exists idx_guest_search_criteria_destination_states on public.guest_search_criteria using gin(destination_states);

create table if not exists public.guest_found_loads (
  id uuid primary key default uuid_generate_v4(),
  criteria_id uuid references public.guest_search_criteria(id) on delete cascade not null,
  cloudtrucks_load_id text not null,
  details jsonb,
  status text default 'found',
  created_at timestamptz default now(),
  unique(cloudtrucks_load_id, criteria_id)
);

create index if not exists idx_guest_found_loads_criteria on public.guest_found_loads(criteria_id);
create index if not exists idx_guest_found_loads_status on public.guest_found_loads(status);
create index if not exists idx_guest_found_loads_created_at on public.guest_found_loads(created_at);

create table if not exists public.guest_interested_loads (
  id uuid primary key default uuid_generate_v4(),
  guest_session text not null,
  cloudtrucks_load_id text not null,
  details jsonb not null,
  status text default 'interested',
  last_checked_at timestamptz,
  created_at timestamptz default now(),
  unique(guest_session, cloudtrucks_load_id)
);

create index if not exists idx_guest_interested_loads_session on public.guest_interested_loads(guest_session);
create index if not exists idx_guest_interested_loads_status on public.guest_interested_loads(status);
