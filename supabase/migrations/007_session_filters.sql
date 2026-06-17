-- Owner-configurable filters for a session, applied before swiping starts.
-- Adds price range + dietary flags to sessions and upgrades the nearby-search
-- RPC to support multi-cuisine matching and a price-level range.

-- ── Session filter columns ───────────────────────────────────────────────
-- (cuisine_filters text[] and max_distance int already exist from 001)
ALTER TABLE sessions ADD COLUMN IF NOT EXISTS price_min  int     NOT NULL DEFAULT 1 CHECK (price_min  BETWEEN 1 AND 4);
ALTER TABLE sessions ADD COLUMN IF NOT EXISTS price_max  int     NOT NULL DEFAULT 4 CHECK (price_max  BETWEEN 1 AND 4);
ALTER TABLE sessions ADD COLUMN IF NOT EXISTS halal      boolean NOT NULL DEFAULT false;
ALTER TABLE sessions ADD COLUMN IF NOT EXISTS vegetarian boolean NOT NULL DEFAULT false;

-- ── Upgrade restaurants_near_point ───────────────────────────────────────
-- Old signature took a single `cuisine_filter text`. Replace it with an array
-- (OR-matched against r.cuisines) plus an optional price-level range.
DROP FUNCTION IF EXISTS restaurants_near_point(float8, float8, int, uuid, text);

CREATE OR REPLACE FUNCTION restaurants_near_point(
  lat             float8,
  lng             float8,
  radius_meters   int,
  exclude_user_id uuid,
  cuisine_filters text[] DEFAULT NULL,
  price_min       int    DEFAULT NULL,
  price_max       int    DEFAULT NULL
)
RETURNS TABLE (
  id              uuid,
  name            text,
  cuisines        text[],
  rating          numeric,
  price_level     int,
  photo_url       text,
  address         text,
  distance_meters float8
)
LANGUAGE sql STABLE AS $$
  SELECT
    r.id,
    r.name,
    r.cuisines,
    r.rating,
    r.price_level,
    r.photo_url,
    r.address,
    st_distance(r.location, st_point(lng, lat)::geography) AS distance_meters
  FROM restaurants r
  WHERE
    st_dwithin(r.location, st_point(lng, lat)::geography, radius_meters)
    AND r.id NOT IN (
      SELECT restaurant_id FROM swipes WHERE user_id = exclude_user_id
    )
    -- cuisine filter: match if the restaurant shares any of the requested tags
    AND (
      cuisine_filters IS NULL
      OR cardinality(cuisine_filters) = 0
      OR r.cuisines && cuisine_filters
    )
    -- price range (price_level is 1..4)
    AND (price_min IS NULL OR r.price_level >= price_min)
    AND (price_max IS NULL OR r.price_level <= price_max)
  ORDER BY distance_meters;
$$;
