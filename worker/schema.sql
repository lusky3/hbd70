-- worker/schema.sql
-- Cloudflare D1 SQLite Schema for Allan's 70th Birthday Retro Arcade Leaderboards

CREATE TABLE IF NOT EXISTS leaderboards (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  game_id TEXT NOT NULL,                  -- 'tanks', 'pong', 'invaders', 'asteroids'
  initials TEXT NOT NULL,                 -- 3-character uppercase arcade initials e.g. 'ALL', 'COD'
  score INTEGER NOT NULL,                 -- Score or highest metric
  detail TEXT,                            -- Additional milestone context e.g. 'Wave 7', 'Level 42', '9 Rally'
  full_name TEXT,                         -- Optional larger full name / nickname e.g. 'Allan Lusk'
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Index for high-performance ranking queries per game
CREATE INDEX IF NOT EXISTS idx_leaderboards_game_score 
  ON leaderboards (game_id, score DESC, created_at ASC);
