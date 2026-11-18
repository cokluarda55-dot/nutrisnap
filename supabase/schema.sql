-- Supabase Schema for NutriSnap AI Calorie & Macro Tracker PWA

-- 1. Create Profiles table
create table if not exists public.profiles (
  id uuid references auth.users on delete cascade primary key,
  email text,
  daily_calorie_target integer default 2000 not null,
  daily_protein_target integer default 140 not null,
  daily_carbs_target integer default 220 not null,
  daily_fat_target integer default 65 not null,
  analyses_count integer default 0 not null,
  is_pro boolean default false not null,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- 2. Create Meals table
create table if not exists public.meals (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references public.profiles(id) on delete cascade not null,
  meal_name text not null,
  calories integer not null,
  protein numeric(6,1) default 0 not null,
  carbs numeric(6,1) default 0 not null,
  fat numeric(6,1) default 0 not null,
  meal_type text default 'lunch' check (meal_type in ('breakfast', 'lunch', 'dinner', 'snack')),
  notes text,
  image_url text,
  consumed_at timestamp with time zone default timezone('utc'::text, now()) not null,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- 3. Enable Row Level Security (RLS)
alter table public.profiles enable row level security;
alter table public.meals enable row level security;

-- Profiles Policies
create policy "Users can view their own profile"
  on public.profiles for select
  using (auth.uid() = id);

create policy "Users can update their own profile"
  on public.profiles for update
  using (auth.uid() = id);

-- Meals Policies
create policy "Users can view their own meals"
  on public.meals for select
  using (auth.uid() = user_id);

create policy "Users can insert their own meals"
  on public.meals for insert
  with check (auth.uid() = user_id);

create policy "Users can update their own meals"
  on public.meals for update
  using (auth.uid() = user_id);

create policy "Users can delete their own meals"
  on public.meals for delete
  using (auth.uid() = user_id);

-- 4. Trigger to automatically create a profile entry when a new user signs up via Supabase Auth
create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public.profiles (id, email, daily_calorie_target, daily_protein_target, daily_carbs_target, daily_fat_target, analyses_count, is_pro)
  values (new.id, new.email, 2000, 140, 220, 65, 0, false);
  return new;
end;
$$ language plpgsql security definer;

-- Trigger execution
drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- 5. Indexes for fast mobile dashboard queries
create index if not exists idx_meals_user_consumed on public.meals(user_id, consumed_at desc);
