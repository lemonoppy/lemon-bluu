CREATE TABLE IF NOT EXISTS set_cube_snapshots (
  id          TEXT PRIMARY KEY,
  write_token TEXT NOT NULL,
  data        JSONB NOT NULL,
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);
