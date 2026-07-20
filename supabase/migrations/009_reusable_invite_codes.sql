-- Allow the same invite code to be reused across sessions.
-- Only enforce uniqueness while a session is active or swiping.
ALTER TABLE sessions DROP CONSTRAINT IF EXISTS sessions_invite_code_key;

CREATE UNIQUE INDEX IF NOT EXISTS sessions_invite_code_active_unique
  ON sessions (invite_code)
  WHERE status IN ('active', 'swiping');
