-- Enable PostGIS for location queries
create extension if not exists postgis;

-- ─────────────────────────────────────────
-- Restaurants
-- ─────────────────────────────────────────
create table restaurants (
  id           uuid primary key default gen_random_uuid(),
  name         text not null,
  cuisines     text[] not null default '{}',
  rating       numeric(2,1) not null default 0,
  price_level  int not null default 1 check (price_level between 1 and 4),
  photo_url    text,
  address      text not null,
  phone        text,
  website      text,
  location     geography(point, 4326) not null,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);

create index restaurants_location_idx on restaurants using gist (location);
create index restaurants_cuisines_idx on restaurants using gin (cuisines);

-- ─────────────────────────────────────────
-- Swipes
-- ─────────────────────────────────────────
create type swipe_direction as enum ('like', 'dislike');

create table swipes (
  id             uuid primary key default gen_random_uuid(),
  user_id        uuid not null references auth.users (id) on delete cascade,
  restaurant_id  uuid not null references restaurants (id) on delete cascade,
  direction      swipe_direction not null,
  swiped_at      timestamptz not null default now(),
  unique (user_id, restaurant_id)
);

create index swipes_user_id_idx on swipes (user_id);
create index swipes_restaurant_id_idx on swipes (restaurant_id);

-- ─────────────────────────────────────────
-- Sessions (group swiping)
-- ─────────────────────────────────────────
create type session_status as enum ('active', 'closed');

create table sessions (
  id               uuid primary key default gen_random_uuid(),
  owner_id         uuid not null references auth.users (id) on delete cascade,
  name             text not null,
  invite_code      text not null unique default upper(substr(md5(random()::text), 1, 6)),
  status           session_status not null default 'active',
  cuisine_filters  text[] not null default '{}',
  max_distance     int not null default 5000,
  created_at       timestamptz not null default now()
);

create index sessions_invite_code_idx on sessions (invite_code);
create index sessions_owner_id_idx on sessions (owner_id);

create table session_participants (
  session_id  uuid not null references sessions (id) on delete cascade,
  user_id     uuid not null references auth.users (id) on delete cascade,
  joined_at   timestamptz not null default now(),
  primary key (session_id, user_id)
);

-- ─────────────────────────────────────────
-- RPC: restaurants near a point
-- ─────────────────────────────────────────
create or replace function restaurants_near_point(
  lat             float8,
  lng             float8,
  radius_meters   int,
  exclude_user_id uuid,
  cuisine_filter  text default null
)
returns table (
  id               uuid,
  name             text,
  cuisines         text[],
  rating           numeric,
  price_level      int,
  photo_url        text,
  address          text,
  distance_meters  float8
)
language sql stable
as $$
  select
    r.id,
    r.name,
    r.cuisines,
    r.rating,
    r.price_level,
    r.photo_url,
    r.address,
    st_distance(r.location, st_point(lng, lat)::geography) as distance_meters
  from restaurants r
  where
    st_dwithin(r.location, st_point(lng, lat)::geography, radius_meters)
    and r.id not in (
      select restaurant_id from swipes where user_id = exclude_user_id
    )
    and (cuisine_filter is null or cuisine_filter = any(r.cuisines))
  order by distance_meters;
$$;

-- ─────────────────────────────────────────
-- RPC: session matches (liked by all participants)
-- ─────────────────────────────────────────
create or replace function get_session_matches(session_id uuid)
returns table (
  id          uuid,
  name        text,
  cuisines    text[],
  rating      numeric,
  price_level int,
  photo_url   text,
  address     text
)
language sql stable
as $$
  with participants as (
    select user_id from session_participants where session_participants.session_id = $1
  ),
  participant_count as (
    select count(*) as total from participants
  ),
  liked_counts as (
    select
      s.restaurant_id,
      count(*) as like_count
    from swipes s
    join participants p on p.user_id = s.user_id
    where s.direction = 'like'
    group by s.restaurant_id
  )
  select r.id, r.name, r.cuisines, r.rating, r.price_level, r.photo_url, r.address
  from restaurants r
  join liked_counts lc on lc.restaurant_id = r.id
  cross join participant_count pc
  where lc.like_count = pc.total
  order by r.rating desc;
$$;

-- ─────────────────────────────────────────
-- Row Level Security
-- ─────────────────────────────────────────
alter table restaurants enable row level security;
alter table swipes enable row level security;
alter table sessions enable row level security;
alter table session_participants enable row level security;

-- Restaurants: publicly readable
create policy "restaurants_select" on restaurants for select using (true);

-- Swipes: users manage their own
create policy "swipes_select" on swipes for select using (auth.uid() = user_id);
create policy "swipes_insert" on swipes for insert with check (auth.uid() = user_id);
create policy "swipes_update" on swipes for update using (auth.uid() = user_id);

-- Sessions: participants can read
create policy "sessions_select" on sessions for select using (
  id in (select session_id from session_participants where user_id = auth.uid())
  or owner_id = auth.uid()
);
create policy "sessions_insert" on sessions for insert with check (auth.uid() = owner_id);

-- Session participants
create policy "session_participants_select" on session_participants for select using (
  session_id in (select session_id from session_participants sp2 where sp2.user_id = auth.uid())
);
create policy "session_participants_insert" on session_participants for insert with check (auth.uid() = user_id);
