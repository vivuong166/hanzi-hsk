CREATE TABLE IF NOT EXISTS curricula (
  id TEXT PRIMARY KEY,
  version TEXT NOT NULL,
  label TEXT NOT NULL,
  availability TEXT NOT NULL CHECK (availability IN ('available', 'not_supported')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

INSERT INTO curricula (id, version, label, availability)
VALUES ('hsk-2.0-2015', '2015', 'HSK 2.0 / 2015', 'available')
ON CONFLICT (id) DO UPDATE SET version = EXCLUDED.version, label = EXCLUDED.label, availability = EXCLUDED.availability;

CREATE TABLE IF NOT EXISTS curriculum_levels (
  curriculum_id TEXT NOT NULL REFERENCES curricula(id) ON DELETE CASCADE,
  level SMALLINT NOT NULL CHECK (level BETWEEN 1 AND 4),
  introduced_word_count INTEGER NOT NULL CHECK (introduced_word_count > 0),
  cumulative_word_count INTEGER NOT NULL CHECK (cumulative_word_count > 0),
  PRIMARY KEY (curriculum_id, level)
);

INSERT INTO curriculum_levels (curriculum_id, level, introduced_word_count, cumulative_word_count)
VALUES
  ('hsk-2.0-2015', 1, 150, 150),
  ('hsk-2.0-2015', 2, 150, 300),
  ('hsk-2.0-2015', 3, 300, 600),
  ('hsk-2.0-2015', 4, 600, 1200)
ON CONFLICT (curriculum_id, level) DO UPDATE SET
  introduced_word_count = EXCLUDED.introduced_word_count,
  cumulative_word_count = EXCLUDED.cumulative_word_count;

CREATE TABLE IF NOT EXISTS vocabulary_entries (
  curriculum_id TEXT NOT NULL REFERENCES curricula(id) ON DELETE CASCADE,
  source_index INTEGER NOT NULL CHECK (source_index > 0),
  legacy_id TEXT NOT NULL UNIQUE,
  hanzi TEXT NOT NULL,
  official_label TEXT NOT NULL,
  introduced_level SMALLINT NOT NULL CHECK (introduced_level BETWEEN 1 AND 4),
  content_release TEXT NOT NULL,
  PRIMARY KEY (curriculum_id, source_index)
);

CREATE TABLE IF NOT EXISTS vocabulary_legacy_aliases (
  legacy_id TEXT PRIMARY KEY,
  curriculum_id TEXT NOT NULL,
  source_index INTEGER NOT NULL,
  FOREIGN KEY (curriculum_id, source_index) REFERENCES vocabulary_entries(curriculum_id, source_index)
);

CREATE TABLE IF NOT EXISTS user_settings (
  user_id BIGINT PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
  curriculum_id TEXT NOT NULL DEFAULT 'hsk-2.0-2015' REFERENCES curricula(id),
  daily_goal INTEGER NOT NULL DEFAULT 10 CHECK (daily_goal BETWEEN 1 AND 200),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS review_cards (
  user_id BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  curriculum_id TEXT NOT NULL,
  source_index INTEGER NOT NULL,
  due_at TIMESTAMPTZ NOT NULL,
  interval_hours NUMERIC(10, 2) NOT NULL CHECK (interval_hours >= 0),
  repetitions INTEGER NOT NULL DEFAULT 0 CHECK (repetitions >= 0),
  lapses INTEGER NOT NULL DEFAULT 0 CHECK (lapses >= 0),
  last_rating TEXT NOT NULL CHECK (last_rating IN ('again', 'hard', 'good', 'easy')),
  last_reviewed_at TIMESTAMPTZ NOT NULL,
  version INTEGER NOT NULL DEFAULT 1 CHECK (version > 0),
  PRIMARY KEY (user_id, curriculum_id, source_index),
  FOREIGN KEY (curriculum_id, source_index) REFERENCES vocabulary_entries(curriculum_id, source_index)
);

CREATE INDEX IF NOT EXISTS review_cards_due_idx ON review_cards (user_id, due_at);

CREATE TABLE IF NOT EXISTS review_events (
  id TEXT PRIMARY KEY,
  user_id BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  curriculum_id TEXT NOT NULL,
  source_index INTEGER NOT NULL,
  rating TEXT NOT NULL CHECK (rating IN ('again', 'hard', 'good', 'easy')),
  occurred_at TIMESTAMPTZ NOT NULL,
  idempotency_key TEXT NOT NULL,
  result JSONB NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (user_id, idempotency_key),
  FOREIGN KEY (curriculum_id, source_index) REFERENCES vocabulary_entries(curriculum_id, source_index)
);

CREATE INDEX IF NOT EXISTS review_events_user_created_idx ON review_events (user_id, created_at DESC);

CREATE TABLE IF NOT EXISTS user_word_flags (
  user_id BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  curriculum_id TEXT NOT NULL,
  source_index INTEGER NOT NULL,
  flag TEXT NOT NULL CHECK (flag IN ('favorite', 'difficult')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (user_id, curriculum_id, source_index, flag),
  FOREIGN KEY (curriculum_id, source_index) REFERENCES vocabulary_entries(curriculum_id, source_index)
);

CREATE TABLE IF NOT EXISTS content_completions (
  user_id BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  content_release TEXT NOT NULL,
  domain TEXT NOT NULL CHECK (domain IN ('grammar', 'exercise')),
  content_id TEXT NOT NULL,
  completed_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (user_id, content_release, domain, content_id)
);

CREATE TABLE IF NOT EXISTS practice_attempts (
  id TEXT PRIMARY KEY,
  user_id BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  content_release TEXT NOT NULL,
  exercise_id TEXT NOT NULL,
  answer JSONB NOT NULL,
  is_correct BOOLEAN NOT NULL,
  occurred_at TIMESTAMPTZ NOT NULL,
  idempotency_key TEXT NOT NULL,
  result JSONB NOT NULL,
  UNIQUE (user_id, idempotency_key)
);

CREATE TABLE IF NOT EXISTS mistake_records (
  user_id BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  content_release TEXT NOT NULL,
  exercise_id TEXT NOT NULL,
  last_answer JSONB NOT NULL,
  incorrect_count INTEGER NOT NULL DEFAULT 1 CHECK (incorrect_count > 0),
  last_occurred_at TIMESTAMPTZ NOT NULL,
  PRIMARY KEY (user_id, content_release, exercise_id)
);

CREATE TABLE IF NOT EXISTS learning_activity_summaries (
  user_id BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  activity_day DATE NOT NULL,
  cards INTEGER NOT NULL DEFAULT 0 CHECK (cards >= 0),
  exercises INTEGER NOT NULL DEFAULT 0 CHECK (exercises >= 0),
  minutes INTEGER NOT NULL DEFAULT 0 CHECK (minutes >= 0),
  source TEXT NOT NULL CHECK (source IN ('v1_aggregate', 'v2_event')),
  PRIMARY KEY (user_id, activity_day, source)
);

CREATE TABLE IF NOT EXISTS v1_import_runs (
  id TEXT PRIMARY KEY,
  user_id BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  source_checksum CHAR(64) NOT NULL,
  source_snapshot JSONB NOT NULL,
  report JSONB NOT NULL,
  completed_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (user_id, source_checksum)
);
