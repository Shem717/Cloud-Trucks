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
  dest_city text,
  min_rate numeric,
  min_weight int,
  max_weight int,
  equipment_type text, -- 'Van', 'Reefer', 'Flatbed'
  active boolean default true,
  created_at timestamp with time zone default now()
);

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
