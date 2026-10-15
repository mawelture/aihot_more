CREATE TABLE theme_articles (
  theme_id   text NOT NULL REFERENCES themes (id) ON DELETE CASCADE,
  article_id text NOT NULL REFERENCES articles (id) ON DELETE CASCADE,
  source_id  text NOT NULL REFERENCES sources (id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (theme_id, article_id)
)
