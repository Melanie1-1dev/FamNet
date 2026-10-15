-- PostgreSQL schema for the standalone FamNest2 API.
CREATE TABLE IF NOT EXISTS appointments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  family_id text NOT NULL,
  title text NOT NULL CHECK (length(trim(title)) > 0),
  description text,
  scheduled_at timestamptz NOT NULL,
  recipient_email text NOT NULL,
  created_by text,
  email_status text NOT NULL DEFAULT 'pending' CHECK (email_status IN ('pending', 'mocked', 'accepted', 'failed')),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS appointments_family_scheduled_idx ON appointments (family_id, scheduled_at);
