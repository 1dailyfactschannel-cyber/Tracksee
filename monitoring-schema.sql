-- Enable UUID extension if not enabled
create extension if not exists "pgcrypto";

-- Folders Table
create table if not exists monitoring_folders (
  id uuid default gen_random_uuid() primary key,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  name text not null,
  user_id uuid references auth.users not null
);

-- Dashboards Table
create table if not exists monitoring_dashboards (
  id uuid default gen_random_uuid() primary key,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null,
  name text not null,
  folder_id uuid references monitoring_folders on delete set null,
  user_id uuid references auth.users not null,
  layout jsonb default '[]'::jsonb, -- Stores grid layout and widget config
  description text
);

-- RLS Policies (Simple version: Users can see/edit their own stuff)
alter table monitoring_folders enable row level security;
alter table monitoring_dashboards enable row level security;

create policy "Users can view their own folders"
  on monitoring_folders for select
  using (auth.uid() = user_id);

create policy "Users can insert their own folders"
  on monitoring_folders for insert
  with check (auth.uid() = user_id);

create policy "Users can update their own folders"
  on monitoring_folders for update
  using (auth.uid() = user_id);

create policy "Users can delete their own folders"
  on monitoring_folders for delete
  using (auth.uid() = user_id);

create policy "Users can view their own dashboards"
  on monitoring_dashboards for select
  using (auth.uid() = user_id);

create policy "Users can insert their own dashboards"
  on monitoring_dashboards for insert
  with check (auth.uid() = user_id);

create policy "Users can update their own dashboards"
  on monitoring_dashboards for update
  using (auth.uid() = user_id);

create policy "Users can delete their own dashboards"
  on monitoring_dashboards for delete
  using (auth.uid() = user_id);
