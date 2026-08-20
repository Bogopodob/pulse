CREATE TABLE IF NOT EXISTS tasks (
  id             TEXT PRIMARY KEY,
  title          TEXT NOT NULL,
  start_date     INTEGER NOT NULL,
  end_date       INTEGER NOT NULL,
  start_minute   INTEGER NOT NULL,
  end_minute     INTEGER NOT NULL,
  progress       REAL NOT NULL DEFAULT 0,
  responsible_id TEXT,
  assignees      TEXT NOT NULL DEFAULT '[]',
  created_at     INTEGER NOT NULL,
  updated_at     INTEGER NOT NULL
);

CREATE TABLE IF NOT EXISTS task_tags (
  task_id TEXT NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
  tag     TEXT NOT NULL,
  PRIMARY KEY (task_id, tag)
);

CREATE INDEX IF NOT EXISTS idx_tasks_start_end ON tasks(start_date, end_date);
CREATE INDEX IF NOT EXISTS idx_tasks_updated   ON tasks(updated_at);
CREATE INDEX IF NOT EXISTS idx_task_tags_tag   ON task_tags(tag);

CREATE TABLE IF NOT EXISTS team (
  id         TEXT PRIMARY KEY,
  name       TEXT NOT NULL,
  initials   TEXT NOT NULL,
  color      TEXT NOT NULL,
  created_at INTEGER NOT NULL
);

CREATE TABLE IF NOT EXISTS templates (
  id               TEXT PRIMARY KEY,
  name             TEXT NOT NULL,
  days             TEXT NOT NULL DEFAULT '[]',
  inherit_settings INTEGER NOT NULL DEFAULT 1,
  chain_start_min  INTEGER,
  rules            TEXT NOT NULL DEFAULT '[]',
  created_at       INTEGER NOT NULL,
  updated_at       INTEGER NOT NULL
);

CREATE TABLE IF NOT EXISTS settings (
  key   TEXT PRIMARY KEY,
  value TEXT NOT NULL
);