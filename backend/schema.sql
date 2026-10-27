-- Cloudflare D1. Safe to apply repeatedly. No public/admin secret endpoint exists.
CREATE TABLE IF NOT EXISTS mole_config (
  key TEXT PRIMARY KEY,
  value TEXT NOT NULL
);
INSERT OR IGNORE INTO mole_config(key,value)
VALUES('ip_hmac_secret',lower(hex(randomblob(32))));

CREATE TABLE IF NOT EXISTS mole_limits (
  bucket_key TEXT PRIMARY KEY,
  count INTEGER NOT NULL DEFAULT 0 CHECK(count >= 0),
  expires_at INTEGER NOT NULL
);
CREATE INDEX IF NOT EXISTS mole_limits_expiry ON mole_limits(expires_at);

CREATE TABLE IF NOT EXISTS mole_sessions (
  id TEXT PRIMARY KEY,
  nickname TEXT NOT NULL,
  schedule TEXT NOT NULL,
  start_at INTEGER NOT NULL,
  end_at INTEGER NOT NULL,
  expires_at INTEGER NOT NULL,
  hit_mask INTEGER NOT NULL DEFAULT 0,
  score INTEGER NOT NULL DEFAULT 0 CHECK(score >= 0),
  hits INTEGER NOT NULL DEFAULT 0 CHECK(hits >= 0 AND hits <= 40),
  streak INTEGER NOT NULL DEFAULT 0,
  combo INTEGER NOT NULL DEFAULT 1,
  last_slot INTEGER NOT NULL DEFAULT -1,
  version INTEGER NOT NULL DEFAULT 0,
  finished_at INTEGER
);
CREATE INDEX IF NOT EXISTS mole_sessions_expiry ON mole_sessions(expires_at);

CREATE TABLE IF NOT EXISTS mole_leaderboard (
  session_id TEXT PRIMARY KEY,
  nickname TEXT NOT NULL,
  score INTEGER NOT NULL CHECK(score >= 0),
  hits INTEGER NOT NULL CHECK(hits >= 0 AND hits <= 40),
  finished_at INTEGER NOT NULL,
  week TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS mole_leaderboard_week_score
ON mole_leaderboard(week,score DESC,finished_at ASC,session_id ASC);
CREATE INDEX IF NOT EXISTS mole_leaderboard_expiry ON mole_leaderboard(finished_at);
