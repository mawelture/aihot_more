CREATE TABLE theme_sources (
  theme_id      text NOT NULL REFERENCES themes (id) ON DELETE CASCADE,
  source_id     text NOT NULL REFERENCES sources (id) ON DELETE CASCADE,
  enabled       boolean NOT NULL DEFAULT true,
  subscribed_at timestamptz NOT NULL DEFAULT now(),
  updated_at    timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (theme_id, source_id)
)
