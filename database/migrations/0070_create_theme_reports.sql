CREATE TABLE theme_reports (
  id            bigserial PRIMARY KEY,
  theme_id      text NOT NULL REFERENCES themes (id) ON DELETE CASCADE,
  kind          text NOT NULL CHECK (kind IN ('daily', 'weekly', 'monthly')),
  key           text NOT NULL,
  window_start  timestamptz NOT NULL,
  window_end    timestamptz NOT NULL,
  content       jsonb NOT NULL,
  generated_at  timestamptz NOT NULL,
  model         text,
  revision      integer NOT NULL DEFAULT 1,
  origin        text NOT NULL DEFAULT 'model' CHECK (origin IN ('model', 'imported', 'manual')),
  created_at    timestamptz NOT NULL DEFAULT now(),
  updated_at    timestamptz NOT NULL DEFAULT now(),
  UNIQUE (theme_id, kind, key)
);
