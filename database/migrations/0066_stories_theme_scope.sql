CREATE TABLE theme_stories (
  theme_id    text NOT NULL REFERENCES themes (id) ON DELETE CASCADE,
  story_id    bigint NOT NULL REFERENCES stories (id) ON DELETE CASCADE,
  created_at  timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (theme_id, story_id)
);
