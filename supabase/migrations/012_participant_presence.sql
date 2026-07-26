-- Track participant presence so the backend can detect disconnects, exclude
-- inactive members from swipe unanimity, and auto-transfer host ownership.
ALTER TABLE session_participants
  ADD COLUMN IF NOT EXISTS last_active_at timestamptz NOT NULL DEFAULT now();
