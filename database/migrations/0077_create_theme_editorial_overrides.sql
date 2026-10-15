CREATE TABLE theme_editorial_overrides (
  theme_id    text NOT NULL REFERENCES themes (id) ON DELETE CASCADE,
  article_id  text NOT NULL REFERENCES articles (id) ON DELETE CASCADE,
  fields      jsonb NOT NULL DEFAULT '{}',
  visibility  text CHECK (visibility IN ('public', 'summary-only', 'withdrawn')),
  reason      text,
  version     integer NOT NULL DEFAULT 1,
  updated_by  text,
  updated_at  timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (theme_id, article_id)
);
