-- Enable UUID extension
create extension if not exists "uuid-ossp";

-- Users table (extends Supabase auth.users or standalone)
create table public.users (
  id uuid primary key default uuid_generate_v4(),
  email text unique not null,
  phone_number text,
  subscription_tier text default 'free',
  created_at timestamp with time zone default now()
);

-- CloudTrucks Credentials (Encrypted)
create table public.cloudtrucks_credentials (
  user_id uuid references public.users(id) on delete cascade not null,
  encrypted_email text not null,
  encrypted_password text not null,
  last_validated_at timestamp with time zone,
  is_valid boolean default true,
  primary key (user_id)
);

-- Search Criteria
create table public.search_criteria (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid references public.users(id) on delete cascade not null,
  origin_city text,
  origin_state text,
  pickup_distance int default 50,
  pickup_date date,
  dest_city text,
  destination_state text,
  min_rate numeric,
  min_weight int,
  max_weight int default 45000,
  equipment_type text, -- 'Dry Van', 'Power Only'
  booking_type text, -- 'instant', 'standard', null for any
  active boolean default true,
  created_at timestamp with time zone default now()
);

-- Migration: Add new columns if table exists (run this separately if table already exists)
-- ALTER TABLE public.search_criteria ADD COLUMN IF NOT EXISTS origin_state text;
-- ALTER TABLE public.search_criteria ADD COLUMN IF NOT EXISTS pickup_distance int default 50;
-- ALTER TABLE public.search_criteria ADD COLUMN IF NOT EXISTS pickup_date date;
-- ALTER TABLE public.search_criteria ADD COLUMN IF NOT EXISTS destination_state text;
-- ALTER TABLE public.search_criteria ADD COLUMN IF NOT EXISTS booking_type text;

-- Found Loads
create table public.found_loads (
  id uuid primary key default uuid_generate_v4(),
  criteria_id uuid references public.search_criteria(id) on delete cascade not null,
  cloudtrucks_load_id text not null,
  details jsonb, -- Store full load details
  status text default 'found', -- 'found', 'notified', 'booked', 'expired'
  created_at timestamp with time zone default now(),
  unique(cloudtrucks_load_id, criteria_id) -- Prevent duplicates
);

-- Indexes for performance
create index idx_criteria_active on public.search_criteria(active);
create index idx_loads_status on public.found_loads(status);
