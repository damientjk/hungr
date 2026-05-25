-- Scope swipes to sessions so matches only count within a single session

ALTER TABLE swipes ADD COLUMN IF NOT EXISTS session_id uuid REFERENCES sessions(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS swipes_session_id_idx ON swipes (session_id);

-- Replace the old (user_id, restaurant_id) unique constraint with a
-- session-scoped one so the same user can swipe the same restaurant
-- in different sessions.
ALTER TABLE swipes DROP CONSTRAINT IF EXISTS swipes_user_id_restaurant_id_key;
ALTER TABLE swipes ADD CONSTRAINT swipes_session_scope_key UNIQUE (user_id, restaurant_id, session_id);

-- Update the match function to only count swipes from within this session
CREATE OR REPLACE FUNCTION get_session_matches(session_id uuid)
RETURNS TABLE (
  id               uuid,
  name             text,
  cuisines         text[],
  rating           numeric,
  price_level      int,
  photo_url        text,
  address          text
)
LANGUAGE sql STABLE AS $$
  WITH participants AS (
    SELECT user_id FROM session_participants
    WHERE session_participants.session_id = $1
  ),
  participant_count AS (
    SELECT count(*) AS total FROM participants
  ),
  liked_counts AS (
    SELECT s.restaurant_id, count(*) AS like_count
    FROM swipes s
    JOIN participants p ON p.user_id = s.user_id
    WHERE s.direction = 'like'
      AND s.session_id = $1
    GROUP BY s.restaurant_id
  )
  SELECT r.id, r.name, r.cuisines, r.rating, r.price_level, r.photo_url, r.address
  FROM restaurants r
  JOIN liked_counts lc ON lc.restaurant_id = r.id
  CROSS JOIN participant_count pc
  WHERE lc.like_count = pc.total
  ORDER BY r.rating DESC;
$$;
