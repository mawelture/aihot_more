CREATE TABLE theme_pool_search (
  theme_id    text NOT NULL REFERENCES themes (id) ON DELETE CASCADE,
  article_id  text NOT NULL REFERENCES articles (id) ON DELETE CASCADE,
  direct      text NOT NULL,
  body        text NOT NULL DEFAULT '',
  PRIMARY KEY (theme_id, article_id)
);
