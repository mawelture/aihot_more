CREATE TABLE theme_selected_state (
  theme_id     text NOT NULL REFERENCES themes (id) ON DELETE CASCADE,
  article_id   text NOT NULL REFERENCES articles (id) ON DELETE CASCADE,
  in_set       boolean NOT NULL,
  payload_hash text,
  last_seq     bigint NOT NULL,
  PRIMARY KEY (theme_id, article_id)
);
