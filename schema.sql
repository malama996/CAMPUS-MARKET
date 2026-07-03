-- Campus Market — Supabase/Postgres schema
-- Copperbelt Province, Zambia — multi-institution marketplace
-- Run in Supabase SQL editor or via `supabase db push`

create extension if not exists pgcrypto;
create extension if not exists pg_trgm;

-- ============ INSTITUTIONS (Copperbelt Province ONLY) ============
create table public.institutions (
  id serial primary key,
  name text unique not null,
  short_name text not null,
  type text not null check (type in ('university','college','region')),
  city text not null,
  province text not null default 'Copperbelt',
  logo_url text,
  is_active boolean not null default true,
  created_at timestamptz not null default now()
);

insert into public.institutions (name, short_name, type, city) values
  ('Copperbelt University', 'CBU', 'university', 'Kitwe'),
  ('Zambia University of Technology', 'ZUT', 'university', 'Kitwe'),
  ('Northrise University', 'NSU', 'university', 'Ndola'),
  ('Kitwe College of Education', 'KCE', 'college', 'Kitwe'),
  ('Ndola College of Education', 'NCE', 'college', 'Ndola'),
  ('Luanshya College of Education', 'LCE', 'college', 'Luanshya'),
  ('Mufulira College of Education', 'MCE', 'college', 'Mufulira'),
  ('Copperbelt Health Education Institute', 'CHEI', 'college', 'Ndola'),
  ('Nkana College', 'NKC', 'college', 'Kitwe'),
  ('Mindolo Ecumenical Foundation', 'MEF', 'college', 'Kitwe'),
  ('Copperbelt Province (General)', 'CBelt', 'region', 'Copperbelt Province');

create index institutions_city_idx on public.institutions (city);
create index institutions_type_idx on public.institutions (type);

-- ============ USERS (extends Supabase auth.users) ============
create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  username text unique not null,
  display_name text not null,
  avatar_url text,
  bio text,
  school text not null,
  institution_id int references public.institutions(id),
  hostel text,
  phone text,
  role text not null default 'user' check (role in ('user','seller','admin')),
  tier text not null default 'free' check (tier in ('free','premium')),
  active_listing_count int not null default 0 check (active_listing_count >= 0),
  theme text not null default 'dark' check (theme in ('light','dark','neon','afro-tech')),
  is_seller_verified boolean not null default false,
  follower_count int not null default 0,
  following_count int not null default 0,
  created_at timestamptz not null default now()
);

create index profiles_school_idx on public.profiles (school);
create index profiles_institution_idx on public.profiles (institution_id);
create index profiles_role_idx on public.profiles (role);
create index profiles_username_trgm on public.profiles using gin (username gin_trgm_ops);

-- ============ CATEGORIES ============
create table public.categories (
  id serial primary key,
  slug text unique not null,
  label text not null,
  icon text
);

insert into public.categories (slug, label, icon) values
  ('textbooks','Textbooks & Notes','book'),
  ('fashion','Fashion & Thrift','shirt'),
  ('food','Food & Snacks','utensils'),
  ('electronics','Electronics','laptop'),
  ('services','Services (tutoring, salon, printing)','sparkles'),
  ('room-essentials','Room Essentials','home'),
  ('other','Other','box');

-- ============ LISTINGS ============
create table public.listings (
  id uuid primary key default gen_random_uuid(),
  seller_id uuid not null references public.profiles(id) on delete cascade,
  category_id int not null references public.categories(id),
  title text not null,
  description text not null default '',
  price_zmw numeric(10,2) not null check (price_zmw >= 0),
  is_negotiable boolean not null default true,
  school text not null,
  institution_id int references public.institutions(id),
  hostel text,
  images text[] not null default '{}',
  status text not null default 'active' check (status in ('active','sold','removed')),
  like_count int not null default 0,
  comment_count int not null default 0,
  view_count int not null default 0,
  search_vector tsvector generated always as (
    setweight(to_tsvector('english', coalesce(title,'')), 'A') ||
    setweight(to_tsvector('english', coalesce(description,'')), 'B')
  ) stored,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index listings_feed_idx on public.listings (status, created_at desc);
create index listings_school_idx on public.listings (school, status);
create index listings_institution_idx on public.listings (institution_id, status);
create index listings_seller_idx on public.listings (seller_id);
create index listings_category_idx on public.listings (category_id, status);
create index listings_price_idx on public.listings (price_zmw) where status = 'active';
create index listings_search_idx on public.listings using gin (search_vector);
create index listings_title_trgm on public.listings using gin (title gin_trgm_ops);

-- ============ LIKES ============
create table public.likes (
  user_id uuid not null references public.profiles(id) on delete cascade,
  listing_id uuid not null references public.listings(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (user_id, listing_id)
);

create index likes_listing_idx on public.likes (listing_id);

-- ============ SAVED LISTINGS (bookmarks) ============
create table public.saved_listings (
  user_id uuid not null references public.profiles(id) on delete cascade,
  listing_id uuid not null references public.listings(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (user_id, listing_id)
);

create index saved_listings_user_idx on public.saved_listings (user_id, created_at desc);

-- ============ COMMENTS ============
create table public.comments (
  id uuid primary key default gen_random_uuid(),
  listing_id uuid not null references public.listings(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  body text not null,
  created_at timestamptz not null default now()
);

create index comments_listing_idx on public.comments (listing_id, created_at);

-- ============ FOLLOWS ============
create table public.follows (
  follower_id uuid not null references public.profiles(id) on delete cascade,
  seller_id uuid not null references public.profiles(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (follower_id, seller_id),
  check (follower_id <> seller_id)
);

create index follows_seller_idx on public.follows (seller_id);

-- ============ CHAT ============
create table public.chat_threads (
  id uuid primary key default gen_random_uuid(),
  listing_id uuid references public.listings(id) on delete set null,
  buyer_id uuid not null references public.profiles(id) on delete cascade,
  seller_id uuid not null references public.profiles(id) on delete cascade,
  last_message_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  unique (listing_id, buyer_id, seller_id)
);

create index chat_threads_buyer_idx on public.chat_threads (buyer_id, last_message_at desc);
create index chat_threads_seller_idx on public.chat_threads (seller_id, last_message_at desc);

create table public.chat_messages (
  id uuid primary key default gen_random_uuid(),
  thread_id uuid not null references public.chat_threads(id) on delete cascade,
  sender_id uuid not null references public.profiles(id) on delete cascade,
  body text not null,
  is_flagged boolean not null default false,
  is_read boolean not null default false,
  created_at timestamptz not null default now()
);

create index chat_messages_thread_idx on public.chat_messages (thread_id, created_at);

-- ============ REPORTS ============
create table public.reports (
  id uuid primary key default gen_random_uuid(),
  listing_id uuid references public.listings(id) on delete cascade,
  reporter_id uuid not null references public.profiles(id) on delete cascade,
  reason text not null check (reason in ('spam','scam','inappropriate','wrong_category','already_sold','other')),
  detail text,
  status text not null default 'pending' check (status in ('pending','reviewed','dismissed')),
  created_at timestamptz not null default now(),
  unique (listing_id, reporter_id)
);

create index reports_listing_idx on public.reports (listing_id);
create index reports_status_idx on public.reports (status) where status = 'pending';

-- ============ MODERATION FLAGS (system-generated) ============
create table public.moderation_flags (
  id uuid primary key default gen_random_uuid(),
  listing_id uuid references public.listings(id) on delete cascade,
  reason text not null,
  severity text not null default 'low' check (severity in ('low','medium','high')),
  resolved boolean not null default false,
  created_at timestamptz not null default now()
);

create index moderation_flags_listing_idx on public.moderation_flags (listing_id);
create index moderation_flags_unresolved_idx on public.moderation_flags (severity) where resolved = false;

-- ============ TRIGGERS: denormalized counters ============
create or replace function public.tg_listings_like_count() returns trigger as $$
begin
  if (tg_op = 'INSERT') then
    update public.listings set like_count = like_count + 1 where id = new.listing_id;
  elsif (tg_op = 'DELETE') then
    update public.listings set like_count = greatest(0, like_count - 1) where id = old.listing_id;
  end if;
  return null;
end;
$$ language plpgsql;

create trigger trg_likes_count
after insert or delete on public.likes
for each row execute function public.tg_listings_like_count();

create or replace function public.tg_listings_comment_count() returns trigger as $$
begin
  if (tg_op = 'INSERT') then
    update public.listings set comment_count = comment_count + 1 where id = new.listing_id;
  elsif (tg_op = 'DELETE') then
    update public.listings set comment_count = greatest(0, comment_count - 1) where id = old.listing_id;
  end if;
  return null;
end;
$$ language plpgsql;

create trigger trg_comments_count
after insert or delete on public.comments
for each row execute function public.tg_listings_comment_count();

create or replace function public.tg_follow_counts() returns trigger as $$
begin
  if (tg_op = 'INSERT') then
    update public.profiles set following_count = following_count + 1 where id = new.follower_id;
    update public.profiles set follower_count = follower_count + 1 where id = new.seller_id;
  elsif (tg_op = 'DELETE') then
    update public.profiles set following_count = greatest(0, following_count - 1) where id = old.follower_id;
    update public.profiles set follower_count = greatest(0, follower_count - 1) where id = old.seller_id;
  end if;
  return null;
end;
$$ language plpgsql;

create trigger trg_follow_counts
after insert or delete on public.follows
for each row execute function public.tg_follow_counts();

-- ============ FREE-TIER COUNTER FUNCTIONS ============
create or replace function public.increment_active_listing_count(p_user_id uuid) returns void as $$
begin
  update public.profiles set active_listing_count = active_listing_count + 1 where id = p_user_id;
end;
$$ language plpgsql security definer;

create or replace function public.decrement_active_listing_count(p_user_id uuid) returns void as $$
begin
  update public.profiles set active_listing_count = greatest(0, active_listing_count - 1) where id = p_user_id;
end;
$$ language plpgsql security definer;

-- ============ ROW LEVEL SECURITY ============
alter table public.profiles enable row level security;
alter table public.listings enable row level security;
alter table public.likes enable row level security;
alter table public.saved_listings enable row level security;
alter table public.comments enable row level security;
alter table public.follows enable row level security;
alter table public.chat_threads enable row level security;
alter table public.chat_messages enable row level security;
alter table public.reports enable row level security;
alter table public.moderation_flags enable row level security;
alter table public.institutions enable row level security;

-- Institutions: public read
create policy "institutions publicly readable" on public.institutions for select using (is_active = true);

-- Profiles
create policy "profiles are publicly readable" on public.profiles for select using (true);
create policy "users update own profile" on public.profiles for update using (auth.uid() = id);

-- Listings
create policy "active listings publicly readable" on public.listings for select using (status <> 'removed');
create policy "sellers create own listings" on public.listings for insert with check (auth.uid() = seller_id);
create policy "sellers update own listings" on public.listings for update using (auth.uid() = seller_id);
create policy "sellers delete own listings" on public.listings for delete using (auth.uid() = seller_id);

-- Likes
create policy "likes publicly readable" on public.likes for select using (true);
create policy "users like as themselves" on public.likes for insert with check (auth.uid() = user_id);
create policy "users unlike own like" on public.likes for delete using (auth.uid() = user_id);

-- Saved listings
create policy "users read own saves" on public.saved_listings for select using (auth.uid() = user_id);
create policy "users save listings" on public.saved_listings for insert with check (auth.uid() = user_id);
create policy "users unsave listings" on public.saved_listings for delete using (auth.uid() = user_id);

-- Comments
create policy "comments publicly readable" on public.comments for select using (true);
create policy "users comment as themselves" on public.comments for insert with check (auth.uid() = user_id);

-- Follows
create policy "follows publicly readable" on public.follows for select using (true);
create policy "users follow as themselves" on public.follows for insert with check (auth.uid() = follower_id);
create policy "users unfollow as themselves" on public.follows for delete using (auth.uid() = follower_id);

-- Chat threads
create policy "thread participants can read" on public.chat_threads for select
  using (auth.uid() = buyer_id or auth.uid() = seller_id);
create policy "thread participants can create" on public.chat_threads for insert
  with check (auth.uid() = buyer_id or auth.uid() = seller_id);

-- Chat messages
create policy "message participants can read" on public.chat_messages for select
  using (exists (
    select 1 from public.chat_threads t
    where t.id = thread_id and (auth.uid() = t.buyer_id or auth.uid() = t.seller_id)
  ));
create policy "message participants can send" on public.chat_messages for insert
  with check (auth.uid() = sender_id and exists (
    select 1 from public.chat_threads t
    where t.id = thread_id and (auth.uid() = t.buyer_id or auth.uid() = t.seller_id)
  ));

-- Reports: users can create, only see own
create policy "users create reports" on public.reports for insert with check (auth.uid() = reporter_id);
create policy "users read own reports" on public.reports for select using (auth.uid() = reporter_id);

-- Moderation: backend service-role only
