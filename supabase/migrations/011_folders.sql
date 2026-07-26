-- Folders for organising bookmarked restaurants
CREATE TABLE IF NOT EXISTS folders (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null references auth.users (id) on delete cascade,
  name       text not null check (char_length(name) between 1 and 100),
  created_at timestamptz not null default now()
);

CREATE INDEX IF NOT EXISTS folders_user_id_idx ON folders (user_id);

ALTER TABLE folders ENABLE ROW LEVEL SECURITY;
CREATE POLICY "folders_select" ON folders FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "folders_insert" ON folders FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "folders_delete" ON folders FOR DELETE USING (auth.uid() = user_id);

-- Each bookmark can belong to at most one folder
ALTER TABLE bookmarks ADD COLUMN IF NOT EXISTS folder_id uuid references folders (id) on delete set null;
CREATE INDEX IF NOT EXISTS bookmarks_folder_id_idx ON bookmarks (folder_id);

-- Allow users to update their own bookmarks (to set/clear folder)
CREATE POLICY "bookmarks_update" ON bookmarks FOR UPDATE USING (auth.uid() = user_id);
