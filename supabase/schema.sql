-- Glucose Diary Schema

-- Profiles
create table if not exists profiles (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade not null unique,
  display_name text,
  created_at timestamptz default now()
);

alter table profiles enable row level security;
create policy "Users can view own profile" on profiles for select using (auth.uid() = user_id);
create policy "Users can insert own profile" on profiles for insert with check (auth.uid() = user_id);
create policy "Users can update own profile" on profiles for update using (auth.uid() = user_id);

-- Daily Records
create table if not exists daily_records (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade not null,
  date date not null,
  weight numeric(5,1),
  steps integer,
  event_memo text,
  bp_morning_sys integer,
  bp_morning_dia integer,
  bp_morning_pulse integer,
  bp_evening_sys integer,
  bp_evening_dia integer,
  bp_evening_pulse integer,
  created_at timestamptz default now(),
  updated_at timestamptz default now(),
  unique(user_id, date)
);

alter table daily_records enable row level security;
create policy "Users can manage own daily_records" on daily_records for all using (auth.uid() = user_id);

-- Glucose Readings
create table if not exists glucose_readings (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade not null,
  date date not null,
  timing text not null check (timing in ('before_breakfast','after_breakfast','before_lunch','after_lunch','before_dinner','after_dinner','bedtime')),
  value integer not null,
  created_at timestamptz default now(),
  unique(user_id, date, timing)
);

alter table glucose_readings enable row level security;
create policy "Users can manage own glucose_readings" on glucose_readings for all using (auth.uid() = user_id);

-- Meals
create table if not exists meals (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade not null,
  date date not null,
  meal_type text not null check (meal_type in ('breakfast','lunch','dinner','snack')),
  content text not null,
  created_at timestamptz default now()
);

alter table meals enable row level security;
create policy "Users can manage own meals" on meals for all using (auth.uid() = user_id);

-- Insulin Regimens
create table if not exists insulin_regimens (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade not null,
  insulin_name text not null,
  insulin_type text not null check (insulin_type in ('rapid','long','mixed')),
  timing text not null check (timing in ('before_breakfast','before_lunch','before_dinner','bedtime')),
  dose_units numeric(5,1) not null,
  is_active boolean default true,
  created_at timestamptz default now()
);

alter table insulin_regimens enable row level security;
create policy "Users can manage own insulin_regimens" on insulin_regimens for all using (auth.uid() = user_id);

-- Clinic Visits (受診日管理)
create table if not exists clinic_visits (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade not null,
  visit_date date not null,
  memo text,
  created_at timestamptz default now()
);

alter table clinic_visits enable row level security;
create policy "Users can manage own clinic_visits" on clinic_visits for all using (auth.uid() = user_id);

-- Auto-create profile on signup
create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public.profiles (user_id, display_name)
  values (new.id, new.raw_user_meta_data->>'full_name');
  return new;
end;
$$ language plpgsql security definer;

create or replace trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();
