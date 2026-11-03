CREATE TABLE IF NOT EXISTS episodes (
  id TEXT PRIMARY KEY, title TEXT NOT NULL, channel TEXT NOT NULL,
  description TEXT NOT NULL, source TEXT NOT NULL DEFAULT '',
  duration REAL NOT NULL, size INTEGER NOT NULL, date TEXT NOT NULL,
  object_key TEXT NOT NULL UNIQUE
);
CREATE INDEX IF NOT EXISTS episodes_date ON episodes(date DESC);
