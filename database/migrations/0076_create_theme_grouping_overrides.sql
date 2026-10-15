CREATE TABLE theme_grouping_overrides (
  theme_id    text NOT NULL REFERENCES themes (id) ON DELETE CASCADE,
  article_id  text NOT NULL REFERENCES articles (id) ON DELETE CASCADE,
  mode        text NOT NULL DEFAULT 'standalone' CHECK (mode IN ('standalone')),
  reason      text,
  actor       text,
  created_at  timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (theme_id, article_id)
);
