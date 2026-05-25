-- Pre-seed a fixed set of restaurants per session so all members swipe the same list
CREATE TABLE IF NOT EXISTS session_restaurants (
  session_id      uuid NOT NULL REFERENCES sessions(id) ON DELETE CASCADE,
  restaurant_id   uuid NOT NULL REFERENCES restaurants(id) ON DELETE CASCADE,
  position        int NOT NULL,
  distance_meters float8,
  PRIMARY KEY (session_id, restaurant_id)
);

CREATE INDEX IF NOT EXISTS session_restaurants_session_pos_idx
  ON session_restaurants (session_id, position);

ALTER TABLE session_restaurants ENABLE ROW LEVEL SECURITY;

CREATE POLICY "session_restaurants_select" ON session_restaurants
  FOR SELECT USING (
    session_id IN (
      SELECT session_id FROM session_participants WHERE user_id = auth.uid()
    )
  );

