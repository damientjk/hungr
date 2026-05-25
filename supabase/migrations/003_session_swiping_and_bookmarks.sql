-- Add 'swiping' state to session lifecycle
ALTER TYPE session_status ADD VALUE IF NOT EXISTS 'swiping';

-- Personal bookmarks (separate from session swipes)
CREATE TABLE IF NOT EXISTS bookmarks (
  id            uuid primary key default gen_random_uuid(),
  user_id       uuid not null references auth.users (id) on delete cascade,
  restaurant_id uuid not null references restaurants (id) on delete cascade,
  created_at    timestamptz not null default now(),
  unique (user_id, restaurant_id)
);

CREATE INDEX IF NOT EXISTS bookmarks_user_id_idx ON bookmarks (user_id);

ALTER TABLE bookmarks ENABLE ROW LEVEL SECURITY;
CREATE POLICY "bookmarks_select" ON bookmarks FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "bookmarks_insert" ON bookmarks FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "bookmarks_delete" ON bookmarks FOR DELETE USING (auth.uid() = user_id);

-- Enable realtime so clients get pushed when session status changes
ALTER TABLE sessions REPLICA IDENTITY FULL;
ALTER PUBLICATION supabase_realtime ADD TABLE sessions;
