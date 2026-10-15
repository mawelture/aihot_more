CREATE TABLE theme_facts (
  theme_id    text NOT NULL REFERENCES themes (id) ON DELETE CASCADE,
  fact_id     bigint NOT NULL REFERENCES facts (id) ON DELETE CASCADE,
  created_at  timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (theme_id, fact_id)
);
