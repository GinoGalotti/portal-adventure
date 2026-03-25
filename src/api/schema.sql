-- PORTAL Field Operations — D1 Schema
-- Phase E: wire Worker endpoints to these tables

CREATE TABLE IF NOT EXISTS users (
  id TEXT PRIMARY KEY,
  username TEXT UNIQUE NOT NULL,
  password_hash TEXT NOT NULL,
  created_at TEXT NOT NULL,
  last_login TEXT
);

CREATE TABLE IF NOT EXISTS save_slots (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id),
  slot_number INTEGER NOT NULL,       -- 1, 2, or 3
  name TEXT NOT NULL DEFAULT 'New Game',
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  seed TEXT NOT NULL,
  game_state JSON NOT NULL,           -- cached derived state
  UNIQUE(user_id, slot_number)
);

CREATE TABLE IF NOT EXISTS action_logs (
  id TEXT PRIMARY KEY,
  slot_id TEXT NOT NULL REFERENCES save_slots(id),
  mystery_seed TEXT NOT NULL,
  action_index INTEGER NOT NULL,
  action_data JSON NOT NULL,
  state_snapshot JSON,                -- periodic snapshot (~every 20 actions)
  created_at TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_actions_slot
  ON action_logs(slot_id, mystery_seed, action_index);

CREATE TABLE IF NOT EXISTS telemetry_events (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  slot_id TEXT,
  mystery_seed TEXT,
  event_type TEXT NOT NULL,
  event_data JSON NOT NULL,
  available_options JSON,
  chosen_option TEXT,
  game_state_context JSON,
  game_timestamp INTEGER,
  wall_clock TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_telemetry_user   ON telemetry_events(user_id);
CREATE INDEX IF NOT EXISTS idx_telemetry_seed   ON telemetry_events(mystery_seed);
CREATE INDEX IF NOT EXISTS idx_telemetry_type   ON telemetry_events(event_type);
